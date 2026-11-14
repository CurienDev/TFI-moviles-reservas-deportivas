export const HORA_APERTURA = 8;
export const HORA_CIERRE = 24;
export const DIAS_VISIBLES = 7;

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const dos = (n: number) => String(n).padStart(2, '0');

export function aFechaLocal(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function aIsoConZona(d: Date): string {
  const offsetMin = -d.getTimezoneOffset();
  const signo = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return (
    `${aFechaLocal(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}` +
    `${signo}${dos(Math.floor(abs / 60))}:${dos(abs % 60)}`
  );
}

export function parseFecha(fecha: string): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d, 0, 0, 0, 0);
}

// "24:00" es la medianoche del día siguiente.
export function combinar(fecha: string, hora: string): Date {
  const base = parseFecha(fecha);
  const [h, min] = hora.split(':').map(Number);
  base.setHours(h, min, 0, 0);
  return base;
}

export function sumarDias(fecha: string, dias: number): string {
  const d = parseFecha(fecha);
  d.setDate(d.getDate() + dias);
  return aFechaLocal(d);
}

export function diaSemana(fecha: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return parseFecha(fecha).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function proximosDias(ahora: Date, cantidad = DIAS_VISIBLES): string[] {
  const hoy = aFechaLocal(ahora);
  return Array.from({ length: cantidad }, (_, i) => sumarDias(hoy, i));
}

export function horaAString(h: number): string {
  return `${dos(h)}:00`;
}

export function horaANumero(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h + m / 60;
}

export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = parseFecha(fecha);
  return aFechaLocal(d) === fecha;
}

export function esHoraValida(hora: string): boolean {
  return /^([01]\d|2[0-4]):00$/.test(hora) && horaANumero(hora) <= 24;
}

export function fechaLarga(fecha: string): string {
  const d = parseFecha(fecha);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function fechaCorta(fecha: string): string {
  const d = parseFecha(fecha);
  return `${DIAS_CORTOS[d.getDay()]} ${dos(d.getDate())}/${dos(d.getMonth() + 1)}`;
}

export function nombreDia(dia: number): string {
  return DIAS[dia];
}

export function fechaRelativa(fecha: string, ahora: Date): string {
  const hoy = aFechaLocal(ahora);
  if (fecha === hoy) return 'Hoy';
  if (fecha === sumarDias(hoy, 1)) return 'Mañana';
  if (fecha === sumarDias(hoy, -1)) return 'Ayer';
  return fechaCorta(fecha);
}

export function rangoHorario(inicio: string, fin: string): string {
  const h = (s: string) => String(Number(s.split(':')[0]));
  return `de ${h(inicio)} a ${h(fin)} hs`;
}

export function horaDeIso(iso: string): string {
  const d = new Date(iso);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function precioATexto(precio: number): string {
  return '$ ' + Math.round(precio).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
