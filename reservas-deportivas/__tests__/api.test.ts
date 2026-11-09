/// <reference types="jest" />
import { detectarLiberados, detectarSuspensiones } from '../src/logica/avisos';
import { interpretarRespuesta, normalizarUrl, query } from '../src/servicios/protocolo';
import type { Reserva, Turno } from '../src/tipos';

describe('protocolo de la API (sobre de respuestas)', () => {
  it('lista con meta', () => {
    const r = interpretarRespuesta<number[]>(200, { datos: [1, 2], meta: { total: 2, pagina: 1, porPagina: 20 } });
    expect(r).toEqual({ ok: true, datos: [1, 2], meta: { total: 2, pagina: 1, porPagina: 20 }, desdeCache: false });
  });
  it('un recurso con meta null', () => {
    expect(interpretarRespuesta(201, { datos: { id: 'res-1' }, meta: null })).toMatchObject({ ok: true, datos: { id: 'res-1' }, meta: null });
  });
  it('DELETE correcto: 204 sin cuerpo', () => {
    expect(interpretarRespuesta(204, null)).toMatchObject({ ok: true });
  });
  it('error con código y mensaje para mostrar tal cual', () => {
    const r = interpretarRespuesta(422, { error: { codigo: 'LIMITE_DE_RESERVAS', mensaje: 'Ya tenés tres reservas activas.' } });
    expect(r).toEqual({ ok: false, error: { codigo: 'LIMITE_DE_RESERVAS', mensaje: 'Ya tenés tres reservas activas.' } });
  });
  it('respuestas inesperadas (500 sin cuerpo, HTML de otro servidor)', () => {
    expect(interpretarRespuesta(500, null)).toMatchObject({ ok: false, error: { codigo: 'ERROR_INTERNO' } });
    expect(interpretarRespuesta(200, null)).toMatchObject({ ok: false, error: { codigo: 'RESPUESTA_INVALIDA' } });
  });
  it('normaliza la dirección del servidor', () => {
    expect(normalizarUrl(' https://mi-api.onrender.com/ ')).toBe('https://mi-api.onrender.com');
    expect(normalizarUrl('192.168.0.10:3000')).toBe('http://192.168.0.10:3000');
    expect(normalizarUrl('')).toBe('');
  });
  it('arma la query omitiendo vacíos', () => {
    expect(query({ fecha: '2026-09-19', porPagina: 100, espacioId: undefined, x: '' })).toBe('?fecha=2026-09-19&porPagina=100');
    expect(query({})).toBe('');
  });
});

describe('detección de avisos', () => {
  const reserva = (id: string, estado: Reserva['estado']): Reserva => ({
    id, turnoId: 'tur-esp-02-20260919-19', espacioId: 'esp-02', usuarioId: 'usr-207', cantidadPersonas: 10,
    codigoQr: 'X', estado, ingresoEn: null, creadaEn: '', cancelableHasta: '',
  });
  it('suspensión: confirmada que pasa a cancelada sin que la haya cancelado yo', () => {
    const antes = [reserva('a', 'confirmada'), reserva('b', 'confirmada'), reserva('c', 'cancelada')];
    const ahora = [reserva('a', 'cancelada'), reserva('b', 'cancelada'), reserva('c', 'cancelada')];
    expect(detectarSuspensiones(antes, ahora, new Set(['b'])).map((r) => r.id)).toEqual(['a']);
  });
  it('sin datos previos no se avisa nada', () => {
    expect(detectarSuspensiones([], [reserva('a', 'cancelada')], new Set())).toEqual([]);
  });

  const turno = (inicio: string, estado: Turno['estado']): Turno => ({
    id: `tur-esp-02-20260919-${inicio.slice(0, 2)}`, espacioId: 'esp-02', fecha: '2026-09-19', inicio, fin: '',
    estado, reservaId: null, motivoBloqueo: null, precio: 12000,
  });
  it('turno liberado: reservado que pasa a libre y todavía no empezó', () => {
    const antes = [turno('10:00', 'reservado'), turno('19:00', 'reservado'), turno('20:00', 'libre')];
    const ahora = [turno('10:00', 'libre'), turno('19:00', 'libre'), turno('20:00', 'libre')];
    const liberados = detectarLiberados(antes, ahora, new Date(2026, 8, 19, 12, 0));
    expect(liberados.map((t) => t.inicio)).toEqual(['19:00']);
  });
  it('un turno que pasa a mantenimiento no es "liberado"', () => {
    expect(detectarLiberados([turno('19:00', 'reservado')], [turno('19:00', 'mantenimiento')], new Date(2026, 8, 19, 12))).toEqual([]);
  });
});
