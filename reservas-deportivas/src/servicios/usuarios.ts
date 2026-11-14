import type { Resultado, Salud, Sesion, Usuario } from '../tipos';
import * as db from '../almacenamiento/db';
import { CLAVES, borrarClave, guardarJson, leerJson } from '../almacenamiento/kv';
import {
  borrarCredencialLocal, borrarToken, guardarCredencialLocal, guardarToken, leerCredencialLocal, leerToken,
} from '../almacenamiento/seguro';
import { huellaContrasena } from '../logica/sha256';
import { solicitar } from './cliente';

export async function iniciarSesion(email: string, contrasena: string): Promise<Resultado<Sesion>> {
  const res = await solicitar<Sesion>('POST', '/auth/ingreso', { cuerpo: { email: email.trim(), contrasena }, sinSesion: true });
  if (res.ok) {
    await persistirSesion(res.datos);
    await recordarContrasena(res.datos.usuario.email, contrasena);
  }
  return res;
}

export async function registrarse(datos: { nombre: string; email: string; telefono: string; contrasena: string }): Promise<Resultado<Sesion>> {
  const res = await solicitar<Sesion>('POST', '/auth/registro', { cuerpo: datos, sinSesion: true });
  if (res.ok) {
    await persistirSesion(res.datos);
    await recordarContrasena(res.datos.usuario.email, datos.contrasena);
  }
  return res;
}

async function persistirSesion(s: Sesion) {
  await guardarToken(s.token);
  await guardarJson(CLAVES.usuarioSesion, s.usuario);
}

export async function cerrarSesion(): Promise<void> {
  await borrarToken();
  await borrarCredencialLocal();
  await borrarClave(CLAVES.usuarioSesion);
}

export async function sesionGuardada(): Promise<Usuario | null> {
  const token = await leerToken();
  if (!token) return null;
  return leerJson<Usuario>(CLAVES.usuarioSesion);
}

export async function restaurarSesion(): Promise<Usuario | null> {
  const token = await leerToken();
  if (!token) return null;
  const res = await solicitar<Usuario>('GET', '/yo');
  if (res.ok) {
    await guardarJson(CLAVES.usuarioSesion, res.datos);
    return res.datos;
  }
  if (res.error.codigo === 'NO_AUTENTICADO') {
    await cerrarSesion();
    return null;
  }
  return leerJson<Usuario>(CLAVES.usuarioSesion);
}

export async function refrescarUsuario(): Promise<Resultado<Usuario>> {
  const res = await solicitar<Usuario>('GET', '/yo');
  if (res.ok) await guardarJson(CLAVES.usuarioSesion, res.datos);
  return res;
}

export async function actualizarDatos(cambios: { nombre?: string; telefono?: string }): Promise<Resultado<Usuario>> {
  const res = await solicitar<Usuario>('PATCH', '/yo', { cuerpo: cambios });
  if (res.ok) await guardarJson(CLAVES.usuarioSesion, res.datos);
  return res;
}

async function recordarContrasena(email: string, contrasena: string): Promise<void> {
  const sal = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  await guardarCredencialLocal({ email: email.trim().toLowerCase(), sal, huella: huellaContrasena(contrasena, sal) });
}

// Sin red se compara con la huella guardada al ingresar.
export async function verificarContrasena(email: string, contrasena: string): Promise<Resultado<{ sinRed: boolean }>> {
  const res = await iniciarSesion(email, contrasena);
  if (res.ok) return { ok: true, datos: { sinRed: false }, meta: null, desdeCache: false };
  if (res.error.codigo !== 'ERROR_RED' && res.error.codigo !== 'SIN_SERVIDOR') return res;
  const local = await leerCredencialLocal();
  if (!local || local.email !== email.trim().toLowerCase()) {
    return { ok: false, error: { codigo: res.error.codigo, mensaje: 'Sin conexión, y este teléfono no tiene guardada tu contraseña para validarla. Conectate e intentá de nuevo.' } };
  }
  if (huellaContrasena(contrasena, local.sal) !== local.huella) {
    return { ok: false, error: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'La contraseña no coincide.' } };
  }
  return { ok: true, datos: { sinRed: true }, meta: null, desdeCache: true };
}

export async function obtenerUsuario(id: string): Promise<Resultado<Usuario>> {
  const res = await solicitar<Usuario>('GET', `/usuarios/${encodeURIComponent(id)}`);
  if (res.ok) {
    await db.guardar('usuarios', res.datos);
    return res;
  }
  const guardado = await db.obtener<Usuario>('usuarios', id);
  return guardado ? { ok: true, datos: guardado, meta: null, desdeCache: true } : res;
}

export function probarServidor(base: string): Promise<Resultado<Salud>> {
  return solicitar<Salud>('GET', '/salud', { base, sinSesion: true });
}
