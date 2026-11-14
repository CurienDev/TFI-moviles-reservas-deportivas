import type { ErrorApi, Meta, Resultado } from '../tipos';

export const ERROR_RED: ErrorApi = {
  codigo: 'ERROR_RED',
  mensaje: 'No hay conexión con el servidor. Revisá tus datos o el Wi-Fi e intentá de nuevo.',
};

export const SIN_SERVIDOR: ErrorApi = {
  codigo: 'SIN_SERVIDOR',
  mensaje: 'Falta configurar la dirección del servidor (Perfil › Servidor).',
};

export function interpretarRespuesta<T>(status: number, cuerpo: unknown): Resultado<T> {
  if (status === 204) return { ok: true, datos: undefined as T, meta: null, desdeCache: false };
  if (cuerpo && typeof cuerpo === 'object') {
    const c = cuerpo as Record<string, unknown>;
    if (c.error && typeof c.error === 'object') {
      const e = c.error as Partial<ErrorApi>;
      return {
        ok: false,
        error: { codigo: String(e.codigo ?? 'ERROR_INTERNO'), mensaje: String(e.mensaje ?? 'Ocurrió un error inesperado.') },
      };
    }
    if (status >= 200 && status < 300 && 'datos' in c) {
      return { ok: true, datos: c.datos as T, meta: (c.meta as Meta | null | undefined) ?? null, desdeCache: false };
    }
  }
  if (status >= 500) return { ok: false, error: { codigo: 'ERROR_INTERNO', mensaje: 'Algo salió mal en el servidor. Probá de nuevo en un rato.' } };
  return { ok: false, error: { codigo: 'RESPUESTA_INVALIDA', mensaje: 'El servidor respondió algo inesperado. ¿La dirección es la de la API?' } };
}

export function normalizarUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

export function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}
