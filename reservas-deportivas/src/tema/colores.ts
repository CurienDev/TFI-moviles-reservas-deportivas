/**
 * Paletas clara y oscura. El modo oscuro usa fondos casi negros y texto de alto
 * contraste para leer de noche y a la intemperie (PDR). Los estados del turno
 * nunca se comunican solo con color: siempre van con texto e ícono.
 */

export interface Paleta {
  oscuro: boolean;
  fondo: string;
  superficie: string;
  superficieAlta: string;
  borde: string;
  texto: string;
  textoSuave: string;
  primario: string;
  primarioTexto: string;
  acento: string;
  peligro: string;
  peligroFondo: string;
  exito: string;
  exitoFondo: string;
  advertencia: string;
  advertenciaFondo: string;
  libre: string;
  libreFondo: string;
  ocupado: string;
  ocupadoFondo: string;
  fijo: string;
  fijoFondo: string;
  mantenimiento: string;
  mantenimientoFondo: string;
  pasado: string;
  seleccion: string;
}

export const claro: Paleta = {
  oscuro: false,
  fondo: '#F4F5F9',
  superficie: '#FFFFFF',
  superficieAlta: '#ECEEF6',
  borde: '#D5D8E4',
  texto: '#14151F',
  textoSuave: '#545871',
  primario: '#4B3F9E',
  primarioTexto: '#FFFFFF',
  acento: '#2E7D32',
  peligro: '#B3261E',
  peligroFondo: '#FCE8E6',
  exito: '#1B6E2A',
  exitoFondo: '#E3F4E5',
  advertencia: '#8A5300',
  advertenciaFondo: '#FFF1D6',
  libre: '#1B6E2A',
  libreFondo: '#E6F5E8',
  ocupado: '#5E6075',
  ocupadoFondo: '#E7E8EE',
  fijo: '#3949AB',
  fijoFondo: '#E6E9FA',
  mantenimiento: '#B45309',
  mantenimientoFondo: '#FDEBD3',
  pasado: '#9A9CAE',
  seleccion: '#4B3F9E',
};

export const oscuro: Paleta = {
  oscuro: true,
  fondo: '#0B0C12',
  superficie: '#161823',
  superficieAlta: '#202333',
  borde: '#30344A',
  texto: '#F3F4FA',
  textoSuave: '#B4B8CF',
  primario: '#A99BFF',
  primarioTexto: '#120E2E',
  acento: '#7BD88F',
  peligro: '#FF8A80',
  peligroFondo: '#3A1513',
  exito: '#7BD88F',
  exitoFondo: '#11301A',
  advertencia: '#FFC56B',
  advertenciaFondo: '#3A2A0C',
  libre: '#7BD88F',
  libreFondo: '#10291A',
  ocupado: '#B4B8CF',
  ocupadoFondo: '#22253A',
  fijo: '#9FB0FF',
  fijoFondo: '#1C2350',
  mantenimiento: '#FFB060',
  mantenimientoFondo: '#3A240C',
  pasado: '#5C6080',
  seleccion: '#A99BFF',
};

export const espaciado = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radio = { s: 8, m: 12, l: 18, pill: 999 } as const;
