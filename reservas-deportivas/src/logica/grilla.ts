import type { ReservaFija, Turno } from '../tipos';
import { HORA_APERTURA, HORA_CIERRE, diaSemana, horaAString } from './fechas';

// Formato: tur-<espacioId>-<AAAAMMDD>-<HH>
export function idTurno(espacioId: string, fecha: string, inicio: string): string {
  return `tur-${espacioId}-${fecha.replace(/-/g, '')}-${inicio.slice(0, 2)}`;
}

export function parseIdTurno(id: string): { espacioId: string; fecha: string; inicio: string; fin: string } | null {
  const m = /^tur-(.+)-(\d{4})(\d{2})(\d{2})-(\d{2})$/.exec(id);
  if (!m) return null;
  const hora = Number(m[5]);
  if (hora < HORA_APERTURA || hora >= HORA_CIERRE) return null;
  return {
    espacioId: m[1],
    fecha: `${m[2]}-${m[3]}-${m[4]}`,
    inicio: horaAString(hora),
    fin: horaAString(hora + 1),
  };
}

export function fijaQueCubre(turno: Pick<Turno, 'espacioId' | 'fecha' | 'inicio'>, fijas: ReservaFija[]): ReservaFija | null {
  return (
    fijas.find(
      (f) =>
        f.activa &&
        f.espacioId === turno.espacioId &&
        f.dia === diaSemana(turno.fecha) &&
        f.desde <= turno.fecha &&
        (f.hasta === null || turno.fecha <= f.hasta) &&
        turno.inicio >= f.inicio &&
        turno.inicio < f.fin,
    ) ?? null
  );
}
