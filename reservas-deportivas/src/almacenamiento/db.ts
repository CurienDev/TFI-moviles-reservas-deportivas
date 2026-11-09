import * as SQLite from 'expo-sqlite';

/**
 * Datos guardados en el teléfono con expo-sqlite, para que la app abra y muestre algo
 * sin conexión: catálogo de espacios, mis reservas (con su QR), avisos, fotos de canchas
 * y la última grilla vista de los espacios favoritos. Cada entidad se guarda como un
 * documento JSON dentro de una colección.
 */

export type Coleccion =
  | 'deportes'
  | 'espacios'
  | 'reservas'
  | 'avisos'
  | 'fotos'
  | 'grillas'
  | 'usuarios';

let dbPromesa: Promise<SQLite.SQLiteDatabase> | null = null;

export function abrirDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromesa) {
    dbPromesa = (async () => {
      const db = await SQLite.openDatabaseAsync('datos-locales.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS documentos (
          coleccion TEXT NOT NULL,
          id TEXT NOT NULL,
          dueno TEXT NOT NULL DEFAULT '',
          datos TEXT NOT NULL,
          PRIMARY KEY (coleccion, id)
        );
        CREATE INDEX IF NOT EXISTS idx_documentos_dueno ON documentos (coleccion, dueno);
      `);
      return db;
    })();
  }
  return dbPromesa;
}

/** Lista una colección. `dueno` separa los datos de cada usuario (p. ej. mis reservas). */
export async function listar<T>(coleccion: Coleccion, dueno = ''): Promise<T[]> {
  const db = await abrirDb();
  const filas = await db.getAllAsync<{ datos: string }>(
    'SELECT datos FROM documentos WHERE coleccion = ? AND dueno = ? ORDER BY id',
    coleccion,
    dueno,
  );
  return filas.map((f) => JSON.parse(f.datos) as T);
}

export async function obtener<T>(coleccion: Coleccion, id: string): Promise<T | null> {
  const db = await abrirDb();
  const fila = await db.getFirstAsync<{ datos: string }>(
    'SELECT datos FROM documentos WHERE coleccion = ? AND id = ?',
    coleccion,
    id,
  );
  return fila ? (JSON.parse(fila.datos) as T) : null;
}

export async function guardar<T extends { id: string }>(coleccion: Coleccion, doc: T, dueno = ''): Promise<void> {
  const db = await abrirDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO documentos (coleccion, id, dueno, datos) VALUES (?, ?, ?, ?)',
    coleccion,
    doc.id,
    dueno,
    JSON.stringify(doc),
  );
}

/** Reemplaza todo el contenido de una colección (de un dueño) en una transacción. */
export async function reemplazarColeccion<T extends { id: string }>(coleccion: Coleccion, docs: T[], dueno = ''): Promise<void> {
  const db = await abrirDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM documentos WHERE coleccion = ? AND dueno = ?', coleccion, dueno);
    for (const doc of docs) {
      await tx.runAsync(
        'INSERT OR REPLACE INTO documentos (coleccion, id, dueno, datos) VALUES (?, ?, ?, ?)',
        coleccion,
        doc.id,
        dueno,
        JSON.stringify(doc),
      );
    }
  });
}

export async function borrar(coleccion: Coleccion, id: string): Promise<void> {
  const db = await abrirDb();
  await db.runAsync('DELETE FROM documentos WHERE coleccion = ? AND id = ?', coleccion, id);
}
