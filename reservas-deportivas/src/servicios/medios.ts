import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ArchivoSubido, Espacio, FotoCancha, Resultado } from '../tipos';
import * as db from '../almacenamiento/db';
import { CLAVES, guardarJson, leerJson, leerJsonSync } from '../almacenamiento/kv';
import { aIsoConZona } from '../logica/fechas';
import { solicitar } from './cliente';

/**
 * Fotos y videos de los espacios, con la API nueva de expo-file-system (File, Directory,
 * Paths):
 * - las fotos (y el video, si la API lo trae) se descargan a Paths.document para verlas
 *   sin datos en la cancha;
 * - las fotos del estado de una cancha que saca el personal se achican, se guardan en el
 *   teléfono y se suben a la API con POST /archivos.
 */

type MapaDescargas = Record<string, string>;

function mapaSync(): MapaDescargas {
  return leerJsonSync<MapaDescargas>(CLAVES.mediosDescargados) ?? {};
}

function copiaLocal(url: string): string | null {
  const local = mapaSync()[url];
  if (!local) return null;
  try {
    return new File(local).exists ? local : null;
  } catch {
    return null;
  }
}

/** Fuente para expo-image / expo-video: la copia local si existe; si no, la URL. */
export function fuenteMedio(url: string): { uri: string } {
  return { uri: copiaLocal(url) ?? url };
}

export function estaDescargado(url: string): boolean {
  return !url.startsWith('http') || copiaLocal(url) !== null;
}

function carpeta(...partes: string[]): Directory {
  const dir = new Directory(Paths.document, ...partes);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function nombreArchivo(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) | 0;
  const limpio = url.split('?')[0];
  const ext = limpio.includes('.') ? limpio.slice(limpio.lastIndexOf('.')) : '';
  return `m${(h >>> 0).toString(16)}${ext.length <= 6 ? ext : ''}`;
}

/** Descarga a almacenamiento permanente las fotos (y el video) de los espacios indicados. */
export async function guardarMediosSinConexion(espacios: Espacio[], incluirVideo = false): Promise<{ descargados: number; errores: number }> {
  const urls = espacios.flatMap((e) => [...e.imagenes, ...(incluirVideo && e.videoUrl ? [e.videoUrl] : [])]).filter((u) => u.startsWith('http'));
  const mapa = (await leerJson<MapaDescargas>(CLAVES.mediosDescargados)) ?? {};
  const destino = carpeta('medios');
  let descargados = 0;
  let errores = 0;
  for (const url of urls) {
    if (mapa[url] && new File(mapa[url]).exists) {
      descargados++;
      continue;
    }
    try {
      const archivo = await File.downloadFileAsync(url, new File(destino, nombreArchivo(url)), { idempotent: true });
      mapa[url] = archivo.uri;
      descargados++;
    } catch {
      errores++;
    }
  }
  await guardarJson(CLAVES.mediosDescargados, mapa);
  return { descargados, errores };
}

// ---- Fotos del estado de las canchas (personal) ----

export async function fotosDeCancha(espacioId: string): Promise<FotoCancha[]> {
  const todas = await db.listar<FotoCancha>('fotos');
  return todas
    .filter((f) => f.espacioId === espacioId && new File(f.uriLocal).exists)
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
}

function subirFoto(uri: string): Promise<Resultado<ArchivoSubido>> {
  const formulario = new FormData();
  // React Native arma el multipart a partir de { uri, name, type }.
  formulario.append('archivo', { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
  return solicitar<ArchivoSubido>('POST', '/archivos', { formulario });
}

/**
 * Guarda una foto elegida de la galería: la reduce (las fotos de 2 a 5 MB gastan datos y
 * tardan; la API acepta hasta 5 MB), la copia a Paths.document y la sube a la API.
 * Si no hay red queda guardada en el teléfono igual.
 */
export async function agregarFotoDeCancha(espacioId: string, uriTemporal: string): Promise<{ foto: FotoCancha; subida: boolean; error: string | null }> {
  const contexto = ImageManipulator.manipulate(uriTemporal).resize({ width: 1280 });
  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  const origen = new File(resultado.uri);
  const destino = new File(carpeta('fotos', espacioId), `foto-${Date.now()}.jpg`);
  origen.copySync(destino);
  try {
    origen.delete();
  } catch {
    // El temporal lo limpia el sistema si no se pudo borrar.
  }
  const subida = await subirFoto(destino.uri);
  const foto: FotoCancha = {
    id: `foto-${Date.now()}`,
    espacioId,
    uriLocal: destino.uri,
    urlServidor: subida.ok ? subida.datos.url : null,
    creadaEn: aIsoConZona(new Date()),
  };
  await db.guardar('fotos', foto);
  return { foto, subida: subida.ok, error: subida.ok ? null : subida.error.mensaje };
}

export async function borrarFotoDeCancha(foto: FotoCancha): Promise<void> {
  try {
    const f = new File(foto.uriLocal);
    if (f.exists) f.delete();
  } catch {
    // Se quita la referencia igual.
  }
  await db.borrar('fotos', foto.id);
}
