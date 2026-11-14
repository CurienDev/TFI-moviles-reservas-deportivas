import Storage from 'expo-sqlite/kv-store';

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

// kv-store solo guarda texto.
export async function guardarJson<T>(clave: string, valor: T): Promise<void> {
  try {
    await Storage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Si falla, la app sigue funcionando.
  }
}

export async function borrarClave(clave: string): Promise<void> {
  try {
    await Storage.removeItemAsync(clave);
  } catch {
    // Se ignora.
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
