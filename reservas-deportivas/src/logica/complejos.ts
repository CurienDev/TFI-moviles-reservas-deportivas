import type { Espacio } from '../tipos';

/**
 * La API marca con «—» los espacios que no pertenecen a ningún complejo (decisión M1-1 de la
 * cátedra: `complejo` es string y no admite null). La app no debe mostrar ese guion como si fuera
 * un nombre ni agrupar en el mapa canchas que están en lugares distintos.
 */
export const SIN_COMPLEJO = '—';

export function tieneComplejo(e: Pick<Espacio, 'complejo'>): boolean {
  const c = e.complejo?.trim();
  return !!c && c !== SIN_COMPLEJO && c !== '-';
}

/** Nombre para un chip o encabezado de grupo: los espacios sueltos van como «Otros espacios». */
export function nombreComplejo(complejo: string): string {
  const c = complejo?.trim();
  return !c || c === SIN_COMPLEJO || c === '-' ? 'Otros espacios' : c;
}

/** Texto de ubicación para mostrar debajo del nombre: el complejo, o nada si es un espacio suelto. */
export function complejoDe(e: Pick<Espacio, 'complejo'>): string | null {
  return tieneComplejo(e) ? e.complejo : null;
}

/** Lugar físico para el mapa: el complejo, o el propio espacio si está suelto. */
export function lugarDe(e: Pick<Espacio, 'complejo' | 'nombre'>): string {
  return tieneComplejo(e) ? e.complejo : e.nombre;
}

/** Une partes de texto omitiendo las vacías: unir(['a', null, 'b']) → 'a · b'. */
export function unir(partes: (string | null | undefined | false)[], sep = ' · '): string {
  return partes.filter(Boolean).join(sep);
}
