import type { Aviso, Espacio, Reserva, Turno, Usuario } from '../tipos';
import * as db from '../almacenamiento/db';
import { CLAVES, leerJson } from '../almacenamiento/kv';
import { detectarLiberados, detectarSuspensiones } from '../logica/avisos';
import { aIsoConZona, fechaCorta, proximosDias, rangoHorario } from '../logica/fechas';
import { parseIdTurno } from '../logica/grilla';
import { estaEnVentana } from '../logica/reglas';
import { obtenerTurnos } from './reservas';

// La API no manda push todavía: los avisos se detectan al sincronizar.
export async function listarAvisos(usuarioId: string): Promise<Aviso[]> {
  const lista = await db.listar<Aviso>('avisos', usuarioId);
  return lista.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function marcarLeido(aviso: Aviso): Promise<void> {
  await db.guardar('avisos', { ...aviso, leido: true }, aviso.usuarioId);
}

export async function marcarTodosLeidos(usuarioId: string): Promise<void> {
  const lista = await db.listar<Aviso>('avisos', usuarioId);
  await db.reemplazarColeccion('avisos', lista.map((a) => ({ ...a, leido: true })), usuarioId);
}

async function crear(aviso: Omit<Aviso, 'creadoEn' | 'leido'>): Promise<Aviso> {
  const completo: Aviso = { ...aviso, creadoEn: aIsoConZona(new Date()), leido: false };
  await db.guardar('avisos', completo, aviso.usuarioId);
  return completo;
}

const describir = (fecha: string, inicio: string, fin: string) => `${fechaCorta(fecha)} ${rangoHorario(inicio, fin)}`;

export async function avisarSuspensiones(usuario: Usuario, antes: Reserva[], ahora: Reserva[], espacios: Espacio[]): Promise<Aviso[]> {
  const canceladasPorMi = new Set((await leerJson<string[]>(CLAVES.canceladasPorMi(usuario.id))) ?? []);
  const nuevos: Aviso[] = [];
  for (const r of detectarSuspensiones(antes, ahora, canceladasPorMi)) {
    const t = parseIdTurno(r.turnoId);
    if (!t) continue;
    const espacio = espacios.find((e) => e.id === r.espacioId);
    let motivo: string | null = null;
    if (estaEnVentana(t.fecha, new Date())) {
      const grilla = await obtenerTurnos(r.espacioId, t.fecha);
      if (grilla.ok) motivo = grilla.datos.find((x) => x.id === r.turnoId)?.motivoBloqueo ?? null;
    }
    nuevos.push(
      await crear({
        id: `sus-${r.id}`,
        usuarioId: usuario.id,
        tipo: 'suspension',
        titulo: `Turno suspendido: ${espacio?.nombre ?? r.espacioId}`,
        mensaje: `Se canceló tu turno del ${describir(t.fecha, t.inicio, t.fin)}.${motivo ? ` Motivo: ${motivo}.` : ' Lo canceló la Dirección de Deportes.'}`,
        reservaId: r.id,
        espacioId: r.espacioId,
        turnoId: r.turnoId,
      }),
    );
  }
  return nuevos;
}

export async function avisarTurnosLiberados(usuario: Usuario, espacios: Espacio[]): Promise<Aviso[]> {
  const nuevos: Aviso[] = [];
  const ahora = new Date();
  for (const espacioId of usuario.espaciosFavoritos) {
    for (const fecha of proximosDias(ahora)) {
      const res = await obtenerTurnos(espacioId, fecha);
      if (!res.ok) return nuevos;
      const idFoto = `${usuario.id}|${espacioId}|${fecha}`;
      const previa = await db.obtener<{ id: string; turnos: Turno[] }>('grillas', idFoto);
      await db.guardar('grillas', { id: idFoto, turnos: res.datos }, usuario.id);
      if (!previa) continue;
      const espacio = espacios.find((e) => e.id === espacioId);
      for (const t of detectarLiberados(previa.turnos, res.datos, ahora)) {
        nuevos.push(
          await crear({
            id: `lib-${t.id}-${Date.now()}`,
            usuarioId: usuario.id,
            tipo: 'turno_liberado',
            titulo: `Se liberó un turno en ${espacio?.nombre ?? espacioId}`,
            mensaje: `Quedó libre el turno del ${describir(t.fecha, t.inicio, t.fin)}. ¡Reservalo antes que otro!`,
            reservaId: null,
            espacioId,
            turnoId: t.id,
          }),
        );
      }
    }
  }
  return nuevos;
}
