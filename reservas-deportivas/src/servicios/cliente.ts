import type { Resultado } from '../tipos';
import { CLAVES, guardarJson, leerJson, leerJsonSync } from '../almacenamiento/kv';
import { leerToken } from '../almacenamiento/seguro';
import { ERROR_RED, SIN_SERVIDOR, interpretarRespuesta, normalizarUrl } from './protocolo';

/**
 * Cliente de la API de la cátedra. Las pantallas nunca lo llaman directo: usan los
 * servicios de esta carpeta (espacios, reservas, usuarios...).
 *
 * La dirección del servidor sale de la variable EXPO_PUBLIC_API_URL (se fija al compilar,
 * ver eas.json) y se puede cambiar desde Perfil › Servidor.
 */

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type Simulacion = 'ninguna' | 'error' | 'demora';

/**
 * La API corre en la PC del grupo (local): responde en milisegundos. 30 s alcanzan aun con la
 * demora simulada y evitan esperar más de un minuto si la IP está mal escrita.
 */
const TIEMPO_MAXIMO_MS = 30_000;
// Si eas.json todavía tiene el texto de ejemplo, se trata como "sin configurar".
const URL_FABRICA = process.env.EXPO_PUBLIC_API_URL ?? '';
const URL_POR_DEFECTO = URL_FABRICA.includes('CAMBIAR-POR') ? '' : normalizarUrl(URL_FABRICA);

export function urlApi(): string {
  return normalizarUrl(leerJsonSync<string>(CLAVES.urlApi) ?? URL_POR_DEFECTO);
}

export async function cambiarUrlApi(url: string): Promise<void> {
  await guardarJson(CLAVES.urlApi, normalizarUrl(url));
}

export function urlApiPorDefecto(): string {
  return URL_POR_DEFECTO;
}

export async function leerSimulacion(): Promise<Simulacion> {
  return (await leerJson<Simulacion>(CLAVES.simulacion)) ?? 'ninguna';
}

export function cambiarSimulacion(s: Simulacion): Promise<void> {
  return guardarJson(CLAVES.simulacion, s);
}

/** Se llama cuando la API responde NO_AUTENTICADO (token vencido o borrado). */
let alPerderSesion: (() => void) | null = null;
export function registrarPerdidaDeSesion(fn: () => void): void {
  alPerderSesion = fn;
}

interface Opciones {
  cuerpo?: unknown;
  formulario?: FormData;
  /** Para probar la conexión con otra dirección sin guardarla. */
  base?: string;
  sinSesion?: boolean;
}

export async function solicitar<T>(metodo: Metodo, ruta: string, opciones: Opciones = {}): Promise<Resultado<T>> {
  const base = normalizarUrl(opciones.base ?? urlApi());
  if (!base) return { ok: false, error: SIN_SERVIDOR };

  const cabeceras: Record<string, string> = { Accept: 'application/json' };
  if (opciones.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  const token = opciones.sinSesion ? null : await leerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  // Herramienta de prueba: la API simula errores y demoras con esta cabecera.
  const simulacion = await leerSimulacion();
  if (simulacion === 'error') cabeceras['X-Simular'] = 'error-500';
  if (simulacion === 'demora') cabeceras['X-Simular'] = 'demora-3000';

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);
  try {
    const resp = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: opciones.formulario ?? (opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo)),
      signal: control.signal,
    });
    const texto = resp.status === 204 ? '' : await resp.text();
    let cuerpo: unknown = null;
    try {
      cuerpo = texto ? JSON.parse(texto) : null;
    } catch {
      cuerpo = null;
    }
    const resultado = interpretarRespuesta<T>(resp.status, cuerpo);
    if (!resultado.ok && resultado.error.codigo === 'NO_AUTENTICADO' && token) alPerderSesion?.();
    return resultado;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: { codigo: 'ERROR_RED', mensaje: 'El servidor tardó demasiado en responder. Revisá que la API esté corriendo en la PC y la dirección en Perfil › Servidor.' } };
    }
    return { ok: false, error: ERROR_RED };
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Lectura con respaldo local: si la red falla, devuelve lo último guardado en el teléfono
 * (marcado desdeCache). Así la app abre y muestra algo sin conexión.
 */
export async function conRespaldo<T>(
  pedir: () => Promise<Resultado<T>>,
  guardar: (datos: T) => Promise<void>,
  leerGuardado: () => Promise<T | null>,
): Promise<Resultado<T>> {
  const res = await pedir();
  if (res.ok) {
    await guardar(res.datos).catch(() => undefined);
    return res;
  }
  if (res.error.codigo === 'ERROR_RED' || res.error.codigo === 'ERROR_INTERNO' || res.error.codigo === 'SIN_SERVIDOR') {
    const guardado = await leerGuardado().catch(() => null);
    if (guardado !== null && (!Array.isArray(guardado) || guardado.length > 0)) {
      return { ok: true, datos: guardado, meta: null, desdeCache: true };
    }
  }
  return res;
}
