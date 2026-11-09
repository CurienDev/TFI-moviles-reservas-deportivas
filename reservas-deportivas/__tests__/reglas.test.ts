/// <reference types="jest" />
import { idTurno } from '../src/logica/grilla';
import {
  contarActivas, esTurnoPasado, estaEnVentana, estaMarcado, estadoIngreso, momentoRecordatorio,
  personalPuedeCancelar, puedeMarcarAusente, tipoCancelacion, validarCantidad, validarEmail, validarFija,
  validarPassword, validarPrecio, validarRangoHorario, validarTelefono,
} from '../src/logica/reglas';
import type { Reserva } from '../src/tipos';

const d = (s: string) => new Date(s); // hora local "AAAA-MM-DDTHH:MM"

/** Reserva con la forma de la API (cancelableHasta = inicio − 4 h). */
function reserva(fecha: string, inicio: string, extra: Partial<Reserva> = {}): Reserva {
  const limite = new Date(`${fecha}T${inicio}`);
  limite.setHours(limite.getHours() - 4);
  return {
    id: 'res-1180', turnoId: idTurno('esp-02', fecha, inicio), espacioId: 'esp-02', usuarioId: 'usr-207',
    cantidadPersonas: 10, codigoQr: 'VGY-0919-19-K3X9QM', estado: 'confirmada', ingresoEn: null,
    creadaEn: '2026-09-16T21:04:00-03:00', cancelableHasta: limite.toISOString(), ...extra,
  };
}

describe('turnos pasados y ventana de siete días', () => {
  it('un turno que ya empezó no se puede reservar aunque la API lo mande "libre"', () => {
    const ahora = d('2026-09-19T19:10');
    expect(esTurnoPasado({ fecha: '2026-09-19', inicio: '19:00' }, ahora)).toBe(true);
    expect(esTurnoPasado({ fecha: '2026-09-19', inicio: '20:00' }, ahora)).toBe(false);
  });
  it('hoy y los seis días siguientes', () => {
    const ahora = d('2026-09-19T10:00');
    expect(estaEnVentana('2026-09-19', ahora)).toBe(true);
    expect(estaEnVentana('2026-09-25', ahora)).toBe(true);
    expect(estaEnVentana('2026-09-26', ahora)).toBe(false);
  });
});

describe('cancelación (R12 de la API)', () => {
  const r = reserva('2026-09-19', '19:00');
  it('el jugador cancela hasta cuatro horas antes; después, fuera de plazo', () => {
    expect(tipoCancelacion(r, d('2026-09-19T14:59'))).toBe('permitida');
    expect(tipoCancelacion(r, d('2026-09-19T15:00'))).toBe('permitida');
    expect(tipoCancelacion(r, d('2026-09-19T15:01'))).toBe('fuera_de_plazo');
  });
  it('empezado el turno, o si ya no está confirmada, no se puede', () => {
    expect(tipoCancelacion(r, d('2026-09-19T19:00'))).toBe('no_permitida');
    expect(tipoCancelacion({ ...r, estado: 'cancelada' }, d('2026-09-19T10:00'))).toBe('no_permitida');
  });
  it('el personal puede cancelar fuera de plazo mientras el turno no empezó', () => {
    expect(personalPuedeCancelar(r, d('2026-09-19T18:00'))).toBe(true);
    expect(personalPuedeCancelar(r, d('2026-09-19T19:05'))).toBe(false);
  });
  it('se marca a partir de dos cancelaciones tardías', () => {
    expect(estaMarcado({ cancelacionesTardias: 1 })).toBe(false);
    expect(estaMarcado({ cancelacionesTardias: 2 })).toBe(true);
  });
});

describe('límite de tres reservas activas (R9)', () => {
  it('cuenta solo confirmadas cuyo turno no terminó', () => {
    const ahora = d('2026-09-19T19:30');
    const lista = [
      reserva('2026-09-19', '19:00', { id: 'a' }), // en curso: cuenta
      reserva('2026-09-19', '18:00', { id: 'b' }), // terminó
      reserva('2026-09-20', '10:00', { id: 'c' }),
      reserva('2026-09-20', '11:00', { id: 'd', estado: 'cancelada' }),
    ];
    expect(contarActivas(lista, ahora)).toBe(2);
  });
});

describe('ingreso y ausencias (D10 de la API)', () => {
  const r = reserva('2026-09-19', '19:00');
  it('el QR se puede escanear desde 30 minutos antes hasta el fin', () => {
    expect(estadoIngreso(r, d('2026-09-19T18:29'))).toBe('temprano');
    expect(estadoIngreso(r, d('2026-09-19T18:30'))).toBe('habilitado');
    expect(estadoIngreso(r, d('2026-09-19T19:59'))).toBe('habilitado');
    expect(estadoIngreso(r, d('2026-09-19T20:00'))).toBe('terminado');
  });
  it('"no se presentó" desde 15 minutos después del inicio', () => {
    expect(puedeMarcarAusente(r, d('2026-09-19T19:14'))).toBe(false);
    expect(puedeMarcarAusente(r, d('2026-09-19T19:15'))).toBe(true);
    expect(puedeMarcarAusente({ ...r, estado: 'cumplida' }, d('2026-09-19T19:30'))).toBe(false);
  });
  it('recordatorio dos horas antes', () => {
    const m = momentoRecordatorio({ fecha: '2026-09-19', inicio: '19:00' });
    expect([m.getHours(), m.getMinutes(), m.getDate()]).toEqual([17, 0, 19]);
  });
});

describe('validaciones de formularios (mismas reglas que la API)', () => {
  it('cantidad de personas', () => {
    expect(validarCantidad(10, 10)).toBeNull();
    expect(validarCantidad(0, 10)).not.toBeNull();
    expect(validarCantidad(11, 10)).toMatch(/10/);
    expect(validarCantidad(2.5, 10)).not.toBeNull();
  });
  it('email, teléfono (regex de la API), contraseña y precio', () => {
    expect(validarEmail('emiliano@mail.com')).toBeNull();
    expect(validarEmail('emiliano@mail')).not.toBeNull();
    expect(validarTelefono('3455-401122')).toBeNull();
    expect(validarTelefono('+54 9 (3455) 40-1122')).toBeNull();
    expect(validarTelefono('abc')).not.toBeNull();
    expect(validarPassword('villaguay2026')).toBeNull();
    expect(validarPassword('1234567')).not.toBeNull();
    expect(validarPrecio(12000)).toBeNull();
    expect(validarPrecio(0)).not.toBeNull();
    expect(validarPrecio(1.5)).not.toBeNull();
  });
  it('rango horario de bloqueos y fijas', () => {
    expect(validarRangoHorario(null, null)).toBeNull();
    expect(validarRangoHorario('20:00', '24:00')).toBeNull();
    expect(validarRangoHorario('07:00', '09:00')).not.toBeNull();
    expect(validarRangoHorario('22:00', '21:00')).not.toBeNull();
  });
  it('fija: espacio, titular, fechas y horario', () => {
    const base = { espacioId: 'esp-02', titular: 'Grupo de los martes', dia: 2 as const, inicio: '21:00', fin: '22:00', desde: '2026-03-01', hasta: null };
    expect(validarFija(base)).toBeNull();
    expect(validarFija({ ...base, espacioId: '' })).toMatch(/espacio/);
    expect(validarFija({ ...base, titular: ' ' })).toMatch(/titular/);
    expect(validarFija({ ...base, desde: '2026-02-30' })).toMatch(/no es válida/);
    expect(validarFija({ ...base, hasta: '2026-01-01' })).toMatch(/posterior/);
  });
});
