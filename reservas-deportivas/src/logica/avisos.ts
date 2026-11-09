import type { Reserva, Turno } from '../tipos';
import { esTurnoPasado } from './reglas';

/**
 * Detección de avisos a partir de dos fotos sucesivas de los datos de la API.
 * (La API los manda por push, pero esa parte del servidor no está implementada:
 * la app los detecta al sincronizar y dispara una notificación local.)
 */

/**
 * Reservas que estaban confirmadas y ahora figuran canceladas, sin que la persona las haya
 * cancelado desde este teléfono: las suspendió la Dirección (bloqueo por lluvia o
 * mantenimiento) o las canceló el encargado.
 */
export function detectarSuspensiones(antes: Reserva[], ahora: Reserva[], canceladasPorMi: Set<string>): Reserva[] {
  const previas = new Map(antes.map((r) => [r.id, r]));
  return ahora.filter((r) => {
    const previa = previas.get(r.id);
    return previa?.estado === 'confirmada' && r.estado === 'cancelada' && !canceladasPorMi.has(r.id);
  });
}

/** Turnos futuros que antes estaban reservados y ahora están libres (alguien canceló). */
export function detectarLiberados(antes: Turno[], ahora: Turno[], momento: Date): Turno[] {
  const previos = new Map(antes.map((t) => [t.id, t]));
  return ahora.filter((t) => previos.get(t.id)?.estado === 'reservado' && t.estado === 'libre' && !esTurnoPasado(t, momento));
}
