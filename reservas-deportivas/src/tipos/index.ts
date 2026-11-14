// Tipos del PRD (no modificar)

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

// Tipos que agrega la API

export interface Meta {
  total: number;
  pagina: number;
  porPagina: number;
}

export type RespuestaApi<T> = { datos: T; meta: Meta | null } | { error: ErrorApi };

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

export interface ErrorApi {
  codigo: string;
  mensaje: string;
}

// Tipos propios de la app

export interface ReservaDetallada {
  reserva: Reserva;
  espacio: Espacio | null;
  fecha: string;
  inicio: string;
  fin: string;
}

export interface FilaAgenda {
  turno: Turno;
  espacio: Espacio | null;
  reserva: Reserva | null;
  usuario: Usuario | null;
  titularFija: string | null;
}

export type TipoAviso = 'suspension' | 'turno_liberado';

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

export interface FotoCancha {
  id: string;
  espacioId: string;
  uriLocal: string;
  urlServidor: string | null;
  creadaEn: string;
}

export type Resultado<T> =
  | { ok: true; datos: T; meta: Meta | null; desdeCache: boolean }
  | { ok: false; error: ErrorApi };

export type EstadoCarga<T> =
  | { tipo: 'cargando' }
  | { tipo: 'exito'; datos: T; desdeCache: boolean }
  | { tipo: 'error'; error: ErrorApi };
