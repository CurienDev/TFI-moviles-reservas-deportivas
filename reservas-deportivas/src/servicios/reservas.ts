import type {
  Bloqueo, Espacio, FilaAgenda, Reserva, ReservaDetallada, ReservaFija, Resultado, Turno, Usuario,
} from '../tipos';
import * as db from '../almacenamiento/db';
import { CLAVES, guardarJson, leerJson } from '../almacenamiento/kv';
import { fijaQueCubre, parseIdTurno } from '../logica/grilla';
import { conRespaldo, solicitar } from './cliente';
import { query } from './protocolo';
import { obtenerUsuario } from './usuarios';

/**
 * Servicio de reservas (PDR: src/servicios/reservas.ts). Toda lectura y escritura de
 * turnos, reservas, fijas y bloqueos pasa por acá, contra la API de la cátedra.
 */

const POR_PAGINA = 100;

/** Combina una reserva con su espacio y su horario (sale del id del turno). */
export function detallar(reserva: Reserva, espacios: Espacio[]): ReservaDetallada {
  const t = parseIdTurno(reserva.turnoId);
  return {
    reserva,
    espacio: espacios.find((e) => e.id === reserva.espacioId) ?? null,
    fecha: t?.fecha ?? '',
    inicio: t?.inicio ?? '',
    fin: t?.fin ?? '',
  };
}

async function espaciosGuardados(): Promise<Espacio[]> {
  return db.listar<Espacio>('espacios');
}

// ---- Disponibilidad (pública) ----

export function obtenerTurnos(espacioId: string, fecha: string): Promise<Resultado<Turno[]>> {
  return solicitar<Turno[]>('GET', `/espacios/${encodeURIComponent(espacioId)}/turnos${query({ fecha })}`);
}

// ---- Jugador ----

export function reservar(turnoId: string, cantidadPersonas: number): Promise<Resultado<Reserva>> {
  return solicitar<Reserva>('POST', '/reservas', { cuerpo: { turnoId, cantidadPersonas } });
}

async function pedirMisReservas(): Promise<Resultado<Reserva[]>> {
  const [proximas, pasadas] = await Promise.all([
    solicitar<Reserva[]>('GET', `/yo/reservas${query({ cuando: 'proximas', porPagina: POR_PAGINA })}`),
    solicitar<Reserva[]>('GET', `/yo/reservas${query({ cuando: 'pasadas', porPagina: POR_PAGINA })}`),
  ]);
  if (!proximas.ok) return proximas;
  if (!pasadas.ok) return pasadas;
  return { ok: true, datos: [...proximas.datos, ...pasadas.datos], meta: null, desdeCache: false };
}

/**
 * Mis reservas (próximas y pasadas). Quedan guardadas en SQLite para mostrarlas, con su
 * QR, aunque en la puerta de la cancha no haya señal.
 */
export async function misReservas(usuarioId: string): Promise<Resultado<ReservaDetallada[]>> {
  const res = await conRespaldo(
    pedirMisReservas,
    (lista) => db.reemplazarColeccion('reservas', lista, usuarioId),
    () => db.listar<Reserva>('reservas', usuarioId),
  );
  if (!res.ok) return res;
  const espacios = await espaciosGuardados();
  return { ...res, datos: res.datos.map((r) => detallar(r, espacios)) };
}

/** Reservas guardadas en el teléfono (sin pedir nada a la red). */
export function misReservasGuardadas(usuarioId: string): Promise<Reserva[]> {
  return db.listar<Reserva>('reservas', usuarioId);
}

export async function obtenerReserva(id: string, usuarioId: string | null): Promise<Resultado<ReservaDetallada>> {
  const res = await conRespaldo(
    () => solicitar<Reserva>('GET', `/reservas/${encodeURIComponent(id)}`),
    async (r) => {
      if (usuarioId && r.usuarioId === usuarioId) await db.guardar('reservas', r, usuarioId);
    },
    () => db.obtener<Reserva>('reservas', id),
  );
  if (!res.ok) return res;
  return { ...res, datos: detallar(res.datos, await espaciosGuardados()) };
}

/**
 * Cancela una reserva. Si la cancela su dueño desde este teléfono se anota, para no
 * confundirla después con una suspensión de la Dirección.
 */
export async function cancelarReserva(id: string, usuarioId: string | null): Promise<Resultado<Reserva>> {
  const res = await solicitar<Reserva>('POST', `/reservas/${encodeURIComponent(id)}/cancelacion`, { cuerpo: {} });
  if (res.ok && usuarioId && res.datos.usuarioId === usuarioId) {
    const clave = CLAVES.canceladasPorMi(usuarioId);
    const previas = (await leerJson<string[]>(clave)) ?? [];
    await guardarJson(clave, [...new Set([...previas, id])].slice(-200));
    await db.guardar('reservas', res.datos, usuarioId);
  }
  return res;
}

// ---- Encargado y administrador ----

export function registrarIngreso(codigoQr: string, espacioId: string): Promise<Resultado<Reserva>> {
  return solicitar<Reserva>('POST', '/ingresos', { cuerpo: { codigoQr: codigoQr.trim().toUpperCase(), espacioId } });
}

export function marcarAusente(reservaId: string): Promise<Resultado<Reserva>> {
  return solicitar<Reserva>('POST', `/reservas/${encodeURIComponent(reservaId)}/ausente`, { cuerpo: {} });
}

/**
 * Agenda del día: la API da los turnos de todos los espacios; para saber quién tiene cada
 * uno se cruzan con las reservas del día, las fijas (titular) y los datos de cada persona.
 */
export async function agendaDelDia(fecha: string): Promise<Resultado<FilaAgenda[]>> {
  const [turnos, reservas, fijas] = await Promise.all([
    solicitar<Turno[]>('GET', `/agenda${query({ fecha, porPagina: 500 })}`),
    solicitar<Reserva[]>('GET', `/reservas${query({ fecha, porPagina: POR_PAGINA })}`),
    solicitar<ReservaFija[]>('GET', `/fijas${query({ activa: true, porPagina: POR_PAGINA })}`),
  ]);
  if (!turnos.ok) return turnos;
  if (!reservas.ok) return reservas;
  const espacios = await espaciosGuardados();
  const listaFijas = fijas.ok ? fijas.datos : [];
  const usuarios = new Map<string, Usuario | null>();
  for (const r of reservas.datos) {
    if (!usuarios.has(r.usuarioId)) {
      const u = await obtenerUsuario(r.usuarioId);
      usuarios.set(r.usuarioId, u.ok ? u.datos : null);
    }
  }
  const filas: FilaAgenda[] = turnos.datos
    .filter((t) => t.estado !== 'libre')
    .map((turno) => {
      // Una reserva ocupa el turno salvo que esté cancelada (las ausentes y cumplidas, también).
      const reserva = reservas.datos.find((r) => r.turnoId === turno.id && r.estado !== 'cancelada') ?? null;
      const fija = turno.estado === 'fijo' ? fijaQueCubre(turno, listaFijas) : null;
      return {
        turno,
        espacio: espacios.find((e) => e.id === turno.espacioId) ?? null,
        reserva,
        usuario: reserva ? usuarios.get(reserva.usuarioId) ?? null : null,
        titularFija: fija?.titular ?? null,
      };
    })
    .sort((a, b) => a.turno.inicio.localeCompare(b.turno.inicio) || a.turno.espacioId.localeCompare(b.turno.espacioId));
  return { ok: true, datos: filas, meta: null, desdeCache: false };
}

/** Reservas de los próximos días (para la lista de usuarios con cancelaciones y ausencias). */
export function reservasDelDia(fecha: string): Promise<Resultado<Reserva[]>> {
  return solicitar<Reserva[]>('GET', `/reservas${query({ fecha, porPagina: POR_PAGINA })}`);
}

export function listarBloqueos(desde: string): Promise<Resultado<Bloqueo[]>> {
  return solicitar<Bloqueo[]>('GET', `/bloqueos${query({ desde, porPagina: POR_PAGINA })}`);
}

export function crearBloqueo(datos: {
  espacioIds: string[]; fecha: string; inicio: string | null; fin: string | null; motivo: string;
}): Promise<Resultado<Bloqueo[]>> {
  const cuerpo = datos.inicio && datos.fin ? datos : { espacioIds: datos.espacioIds, fecha: datos.fecha, motivo: datos.motivo };
  return solicitar<Bloqueo[]>('POST', '/bloqueos', { cuerpo });
}

export function eliminarBloqueo(id: string): Promise<Resultado<void>> {
  return solicitar<void>('DELETE', `/bloqueos/${encodeURIComponent(id)}`);
}

export function listarFijas(): Promise<Resultado<ReservaFija[]>> {
  return solicitar<ReservaFija[]>('GET', `/fijas${query({ porPagina: POR_PAGINA })}`);
}

/** Sólo administrador. La API rechaza superposiciones y conflictos con reservas (409). */
export function crearFija(fija: Omit<ReservaFija, 'id' | 'activa'>): Promise<Resultado<ReservaFija>> {
  return solicitar<ReservaFija>('POST', '/fijas', { cuerpo: fija });
}

export function editarFija(id: string, cambios: Partial<Omit<ReservaFija, 'id'>>): Promise<Resultado<ReservaFija>> {
  return solicitar<ReservaFija>('PATCH', `/fijas/${encodeURIComponent(id)}`, { cuerpo: cambios });
}

/** Da de baja la fija (la API la deja con activa: false). */
export function darDeBajaFija(id: string): Promise<Resultado<void>> {
  return solicitar<void>('DELETE', `/fijas/${encodeURIComponent(id)}`);
}
