import type { Espacio } from '../tipos';

// La API usa «—» para los espacios que no están en un complejo.
export const SIN_COMPLEJO = '—';

export function tieneComplejo(e: Pick<Espacio, 'complejo'>): boolean {
  const c = e.complejo?.trim();
  return !!c && c !== SIN_COMPLEJO && c !== '-';
}

export function nombreComplejo(complejo: string): string {
  const c = complejo?.trim();
  return !c || c === SIN_COMPLEJO || c === '-' ? 'Otros espacios' : c;
}

export function complejoDe(e: Pick<Espacio, 'complejo'>): string | null {
  return tieneComplejo(e) ? e.complejo : null;
}

export function lugarDe(e: Pick<Espacio, 'complejo' | 'nombre'>): string {
  return tieneComplejo(e) ? e.complejo : e.nombre;
}

export function unir(partes: (string | null | undefined | false)[], sep = ' · '): string {
  return partes.filter(Boolean).join(sep);
}
