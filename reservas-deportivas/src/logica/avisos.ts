import type { Reserva, Turno } from '../tipos';
import { esTurnoPasado } from './reglas';

export function detectarSuspensiones(antes: Reserva[], ahora: Reserva[], canceladasPorMi: Set<string>): Reserva[] {
  const previas = new Map(antes.map((r) => [r.id, r]));
  return ahora.filter((r) => {
    const previa = previas.get(r.id);
    return previa?.estado === 'confirmada' && r.estado === 'cancelada' && !canceladasPorMi.has(r.id);
  });
}

export function detectarLiberados(antes: Turno[], ahora: Turno[], momento: Date): Turno[] {
  const previos = new Map(antes.map((t) => [t.id, t]));
  return ahora.filter((t) => previos.get(t.id)?.estado === 'reservado' && t.estado === 'libre' && !esTurnoPasado(t, momento));
}
