import type { Deporte, Espacio, Resultado, Usuario } from '../tipos';
import * as db from '../almacenamiento/db';
import { conRespaldo, solicitar } from './cliente';

/** Catálogo de espacios y deportes (público: no hace falta cuenta para mirar). */

export function listarDeportes(): Promise<Resultado<Deporte[]>> {
  return conRespaldo(
    () => solicitar<Deporte[]>('GET', '/deportes?porPagina=100'),
    (d) => db.reemplazarColeccion('deportes', d),
    () => db.listar<Deporte>('deportes'),
  );
}

export function listarEspacios(): Promise<Resultado<Espacio[]>> {
  return conRespaldo(
    () => solicitar<Espacio[]>('GET', '/espacios?porPagina=100'),
    (d) => db.reemplazarColeccion('espacios', d),
    () => db.listar<Espacio>('espacios'),
  );
}

export function obtenerEspacio(id: string): Promise<Resultado<Espacio>> {
  return conRespaldo(
    () => solicitar<Espacio>('GET', `/espacios/${encodeURIComponent(id)}`),
    (e) => db.guardar('espacios', e),
    () => db.obtener<Espacio>('espacios', id),
  );
}

/** Sólo administrador. */
export function cambiarPrecio(espacioId: string, precioPorHora: number): Promise<Resultado<Espacio>> {
  return solicitar<Espacio>('PATCH', `/espacios/${encodeURIComponent(espacioId)}`, { cuerpo: { precioPorHora } });
}

/** Agrega o quita un favorito y devuelve el usuario actualizado. */
export async function marcarFavorito(espacioId: string, favorito: boolean): Promise<Resultado<Usuario>> {
  const ruta = `/yo/espacios-favoritos/${encodeURIComponent(espacioId)}`;
  if (favorito) return solicitar<Usuario>('PUT', ruta);
  const r = await solicitar<void>('DELETE', ruta);
  if (!r.ok) return r;
  return solicitar<Usuario>('GET', '/yo');
}

/** Distancia en km entre dos coordenadas (fórmula del haversine). */
export function distanciaKm(a: { latitud: number; longitud: number }, b: { latitud: number; longitud: number }): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

