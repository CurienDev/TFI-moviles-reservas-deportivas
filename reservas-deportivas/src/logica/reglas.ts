import type { Reserva, ReservaFija, Usuario } from '../tipos';
import { DIAS_VISIBLES, HORA_APERTURA, HORA_CIERRE, aFechaLocal, combinar, esFechaValida, esHoraValida, horaANumero, sumarDias } from './fechas';
import { parseIdTurno } from './grilla';

/**
 * Reglas de negocio que la app aplica ANTES de llamar a la API, para mostrar la pantalla
 * correcta (botón habilitado o no, mensajes). La API vuelve a validar todo: si no coincide,
 * manda el error y la app lo muestra tal cual.
 */

export const MAX_RESERVAS_ACTIVAS = 3;
export const HORAS_RECORDATORIO = 2;
/** Ingreso: desde 30 minutos antes del inicio hasta el fin del turno (API, D10). */
export const MINUTOS_INGRESO_ANTES = 30;
/** "No se presentó": desde 15 minutos después del inicio (API, D10). */
export const MINUTOS_AUSENTE_DESPUES = 15;
/** "Quien cancela tarde repetidas veces": se marca a partir de 2 (supuesto de la app). */
export const UMBRAL_MARCA = 2;

export function esTurnoPasado(turno: { fecha: string; inicio: string }, ahora: Date): boolean {
  return combinar(turno.fecha, turno.inicio).getTime() <= ahora.getTime();
}

export function turnoTermino(turno: { fecha: string; fin: string }, ahora: Date): boolean {
  return combinar(turno.fecha, turno.fin).getTime() <= ahora.getTime();
}

export function estaEnVentana(fecha: string, ahora: Date, dias = DIAS_VISIBLES): boolean {
  const hoy = aFechaLocal(ahora);
  return fecha >= hoy && fecha <= sumarDias(hoy, dias - 1);
}

export function momentoRecordatorio(turno: { fecha: string; inicio: string }): Date {
  const d = combinar(turno.fecha, turno.inicio);
  d.setHours(d.getHours() - HORAS_RECORDATORIO);
  return d;
}

export type TipoCancelacion = 'permitida' | 'fuera_de_plazo' | 'no_permitida';

/**
 * El jugador cancela solo hasta `cancelableHasta` (4 h antes). Después la API responde
 * CANCELACION_FUERA_DE_PLAZO: hay que avisarle al encargado, que sí puede cancelar
 * (y eso le suma una cancelación tardía al jugador).
 */
export function tipoCancelacion(reserva: Reserva, ahora: Date): TipoCancelacion {
  if (reserva.estado !== 'confirmada') return 'no_permitida';
  const t = parseIdTurno(reserva.turnoId);
  if (!t || esTurnoPasado(t, ahora)) return 'no_permitida';
  return ahora.getTime() <= new Date(reserva.cancelableHasta).getTime() ? 'permitida' : 'fuera_de_plazo';
}

/** El personal puede cancelar cualquier reserva confirmada mientras el turno no empezó. */
export function personalPuedeCancelar(reserva: Reserva, ahora: Date): boolean {
  const t = parseIdTurno(reserva.turnoId);
  return reserva.estado === 'confirmada' && !!t && !esTurnoPasado(t, ahora);
}

export function esReservaActiva(reserva: Reserva, ahora: Date): boolean {
  if (reserva.estado !== 'confirmada') return false;
  const t = parseIdTurno(reserva.turnoId);
  return !!t && !turnoTermino(t, ahora);
}

export function contarActivas(reservas: Reserva[], ahora: Date): number {
  return reservas.filter((r) => esReservaActiva(r, ahora)).length;
}

export function estaMarcado(u: Pick<Usuario, 'cancelacionesTardias'>): boolean {
  return u.cancelacionesTardias >= UMBRAL_MARCA;
}

function minutosDesdeInicio(reserva: Reserva, ahora: Date): number | null {
  const t = parseIdTurno(reserva.turnoId);
  if (!t) return null;
  return (ahora.getTime() - combinar(t.fecha, t.inicio).getTime()) / 60_000;
}

export function puedeMarcarAusente(reserva: Reserva, ahora: Date): boolean {
  const min = minutosDesdeInicio(reserva, ahora);
  return reserva.estado === 'confirmada' && min !== null && min >= MINUTOS_AUSENTE_DESPUES;
}

/** Explicación para el código QR según la ventana de ingreso. */
export function estadoIngreso(reserva: Reserva, ahora: Date): 'temprano' | 'habilitado' | 'terminado' {
  const t = parseIdTurno(reserva.turnoId);
  if (!t) return 'terminado';
  if (turnoTermino(t, ahora)) return 'terminado';
  const min = minutosDesdeInicio(reserva, ahora) ?? 0;
  return min >= -MINUTOS_INGRESO_ANTES ? 'habilitado' : 'temprano';
}

// ---- Validaciones de formularios (mismas reglas que la API) ----

export function validarCantidad(cantidad: number, capacidad: number): string | null {
  if (!Number.isInteger(cantidad) || cantidad < 1) return 'Tiene que ir al menos una persona.';
  if (cantidad > capacidad) return `La capacidad máxima del espacio es de ${capacidad} personas.`;
  return null;
}

export function validarEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? null : 'Ingresá un email válido.';
}

/** Igual que la API: números, espacios, guiones o paréntesis, opcional "+" al inicio. */
export function validarTelefono(tel: string): string | null {
  return /^\+?[0-9][0-9 ()-]{5,28}$/.test(tel.trim()) ? null : 'El teléfono no es válido: usá sólo números, espacios o guiones.';
}

export function validarPassword(pass: string): string | null {
  return pass.length >= 8 ? null : 'La contraseña debe tener al menos 8 caracteres.';
}

export function validarNombre(nombre: string): string | null {
  return nombre.trim().length >= 3 ? null : 'Ingresá tu nombre y apellido.';
}

export function validarPrecio(precio: number): string | null {
  if (!Number.isFinite(precio) || !Number.isInteger(precio)) return 'El precio tiene que ser un número entero de pesos.';
  if (precio <= 0) return 'El precio tiene que ser mayor que cero.';
  if (precio > 100_000_000) return 'El precio es demasiado alto.';
  return null;
}

export function validarRangoHorario(inicio: string | null, fin: string | null): string | null {
  if (inicio === null && fin === null) return null;
  if (!inicio || !fin || !esHoraValida(inicio) || !esHoraValida(fin)) return 'Elegí un horario válido.';
  const i = horaANumero(inicio);
  const f = horaANumero(fin);
  if (i < HORA_APERTURA || f > HORA_CIERRE) return 'El horario debe estar entre las 8 y las 24.';
  if (i >= f) return 'La hora de fin debe ser posterior a la de inicio.';
  return null;
}

/** Validación previa de una fija; la superposición y los conflictos los decide la API. */
export function validarFija(fija: Omit<ReservaFija, 'id' | 'activa'>): string | null {
  if (!fija.espacioId) return 'Elegí el espacio.';
  if (fija.titular.trim().length < 1) return 'Falta el titular.';
  if (!esFechaValida(fija.desde)) return 'La fecha "desde" no es válida (AAAA-MM-DD).';
  if (fija.hasta !== null) {
    if (!esFechaValida(fija.hasta)) return 'La fecha "hasta" no es válida (AAAA-MM-DD).';
    if (fija.hasta < fija.desde) return 'La fecha "hasta" debe ser posterior a "desde".';
  }
  return validarRangoHorario(fija.inicio, fija.fin);
}
