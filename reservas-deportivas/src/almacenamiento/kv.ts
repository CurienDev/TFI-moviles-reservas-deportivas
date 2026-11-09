import Storage from 'expo-sqlite/kv-store';

/**
 * Preferencias y sesión en expo-sqlite/kv-store. kv-store solo guarda cadenas: siempre
 * JSON.stringify al guardar y JSON.parse al leer (si no, queda "[object Object]").
 * El token NO va acá: va cifrado en SecureStore (ver seguro.ts).
 */

export const CLAVES = {
  tema: 'preferencias.tema',
  urlApi: 'preferencias.urlApi',
  simulacion: 'pruebas.simulacion',
  usuarioSesion: 'sesion.usuario',
  avisosEntregados: (usuarioId: string) => `avisos.entregados.${usuarioId}`,
  canceladasPorMi: (usuarioId: string) => `reservas.canceladasPorMi.${usuarioId}`,
  mediosDescargados: 'medios.descargados',
} as const;

export async function leerJson<T>(clave: string): Promise<T | null> {
  try {
    const texto = await Storage.getItem(clave);
    return texto === null ? null : (JSON.parse(texto) as T);
  } catch {
    return null;
  }
}

export async function guardarJson<T>(clave: string, valor: T): Promise<void> {
  try {
    await Storage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Las preferencias son una ayuda: si falla el guardado, la app sigue funcionando.
  }
}

export async function borrarClave(clave: string): Promise<void> {
  try {
    await Storage.removeItemAsync(clave);
  } catch {
    // Ignorado a propósito.
  }
}

export function leerJsonSync<T>(clave: string): T | null {
  try {
    const texto = Storage.getItemSync(clave);
    return texto === null ? null : (JSON.parse(texto) as T);
  } catch {
    return null;
  }
}
