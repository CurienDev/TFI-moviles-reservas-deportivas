/**
 * Tipos del dominio.
 *
 * 1. Tipos del PRD: copia literal de la sección "Resumen — qué entidades maneja la app"
 *    (idénticos a contract/types.ts de la API de la cátedra). No se modifican.
 * 2. Tipos que agrega la API (contract/api.ts): sobre de respuestas, Bloqueo, Sesion...
 * 3. Tipos propios de la app (no viajan por la API): avisos locales, estados de carga, etc.
 */

// ===================== 1. Tipos del PRD =====================

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Espacio {
  id: string;
  nombre: string;
  deporteId: string;
  complejo: string;
  superficie: string;
  techado: boolean;
  iluminacion: boolean;
  capacidad: number;
  precioPorHora: number;
  coordenadas: Coordenadas;
  imagenes: string[];
  videoUrl: string | null;
  reglas: string;
  activo: boolean;
}

export interface Deporte {
  id: string;
  nombre: string;
  icono: string;
  color: string;
}

export type EstadoTurno = 'libre' | 'reservado' | 'fijo' | 'mantenimiento';

export interface Turno {
  id: string;
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string; // "HH:MM"
  fin: string;
  estado: EstadoTurno;
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
}

export type EstadoReserva = 'confirmada' | 'cancelada' | 'cumplida' | 'ausente';

export interface Reserva {
  id: string;
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
  codigoQr: string;
  estado: EstadoReserva;
  ingresoEn: string | null;
  creadaEn: string;
  cancelableHasta: string;
}

export interface ReservaFija {
  id: string;
  espacioId: string;
  titular: string;
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
}

export type Rol = 'jugador' | 'encargado' | 'administrador';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
  espaciosFavoritos: string[];
  cancelacionesTardias: number;
  ausencias: number;
}

// ===================== 2. Tipos que agrega la API =====================

export interface Meta {
  total: number;
  pagina: number;
  porPagina: number;
}

/** Sobre de toda respuesta: { datos, meta } o { error: { codigo, mensaje } }. */
export type RespuestaApi<T> = { datos: T; meta: Meta | null } | { error: ErrorApi };

/** Bloqueo de un espacio. Sin inicio ni fin cubre el día entero. Sólo para el personal. */
export interface Bloqueo {
  id: string;
  espacioId: string;
  fecha: string;
  inicio: string | null;
  fin: string | null;
  motivo: string;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export interface ArchivoSubido {
  url: string;
  tipo: 'imagen' | 'audio' | 'video';
  bytes: number;
}

export interface Salud {
  estado: 'ok';
  motor: string;
  almacen: string;
  version: string;
}

/**
 * Error de la API. `codigo` es estable (se usa para decidir qué hacer) y `mensaje` se
 * muestra tal cual. La app agrega sus propios códigos para fallas que no vienen del
 * servidor: ERROR_RED (sin conexión o sin respuesta) y SIN_SERVIDOR (falta la dirección).
 */
export interface ErrorApi {
  codigo: string;
  mensaje: string;
}

// ===================== 3. Tipos propios de la app =====================

/** Reserva con los datos del espacio y del horario, lista para mostrar. */
export interface ReservaDetallada {
  reserva: Reserva;
  espacio: Espacio | null;
  fecha: string;
  inicio: string;
  fin: string;
}

/** Fila de la agenda del encargado: un turno ocupado o bloqueado y quién lo tiene. */
export interface FilaAgenda {
  turno: Turno;
  espacio: Espacio | null;
  reserva: Reserva | null;
  usuario: Usuario | null;
  titularFija: string | null;
}

export type TipoAviso = 'suspension' | 'turno_liberado';

/**
 * Aviso guardado en el teléfono. La API avisa por push, pero esa parte del servidor no
 * está implementada; la app detecta los mismos hechos al sincronizar y los guarda acá.
 */
export interface Aviso {
  id: string;
  usuarioId: string;
  tipo: TipoAviso;
  titulo: string;
  mensaje: string;
  reservaId: string | null;
  espacioId: string | null;
  turnoId: string | null;
  creadoEn: string;
  leido: boolean;
}

/** Foto del estado de una cancha tomada por el personal (guardada en el teléfono). */
export interface FotoCancha {
  id: string;
  espacioId: string;
  uriLocal: string;
  urlServidor: string | null;
  creadaEn: string;
}

/** Resultado que devuelven los servicios a las pantallas (unión discriminada). */
export type Resultado<T> =
  | { ok: true; datos: T; meta: Meta | null; desdeCache: boolean }
  | { ok: false; error: ErrorApi };

/** Estado de carga de una pantalla (unión discriminada). */
export type EstadoCarga<T> =
  | { tipo: 'cargando' }
  | { tipo: 'exito'; datos: T; desdeCache: boolean }
  | { tipo: 'error'; error: ErrorApi };
