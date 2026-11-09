import * as SecureStore from 'expo-secure-store';

/** Token de sesión en el almacenamiento cifrado del sistema (Keystore en Android). */

const CLAVE_TOKEN = 'sesion_token';

export async function leerToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function borrarToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  } catch {
    // Si no había token no hay nada que borrar.
  }
}

/**
 * Huella de la contraseña (SHA-256 iterado con sal, nunca la contraseña en claro) para poder
 * confirmar la identidad en el reingreso cuando no hay red ni biometría.
 */
const CLAVE_CREDENCIAL = 'credencial_local';

export interface CredencialLocal {
  email: string;
  sal: string;
  huella: string;
}

export async function leerCredencialLocal(): Promise<CredencialLocal | null> {
  try {
    const t = await SecureStore.getItemAsync(CLAVE_CREDENCIAL);
    return t ? (JSON.parse(t) as CredencialLocal) : null;
  } catch {
    return null;
  }
}

export async function guardarCredencialLocal(c: CredencialLocal): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLAVE_CREDENCIAL, JSON.stringify(c));
  } catch {
    // Sin huella guardada el reingreso sin red no estará disponible; no es grave.
  }
}

export async function borrarCredencialLocal(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLAVE_CREDENCIAL);
  } catch {
    // Nada que borrar.
  }
}
