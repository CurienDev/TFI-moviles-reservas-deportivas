/// <reference types="jest" />
import { fijaQueCubre, idTurno, parseIdTurno } from '../src/logica/grilla';
import type { ReservaFija } from '../src/tipos';

describe('idTurno / parseIdTurno (formato D1 de la API)', () => {
  it('ida y vuelta con el ejemplo de la API', () => {
    const id = idTurno('esp-02', '2026-09-19', '19:00');
    expect(id).toBe('tur-esp-02-20260919-19');
    expect(parseIdTurno(id)).toEqual({ espacioId: 'esp-02', fecha: '2026-09-19', inicio: '19:00', fin: '20:00' });
  });
  it('el último turno termina en "24:00"', () => {
    expect(parseIdTurno('tur-esp-02-20260919-23')).toMatchObject({ inicio: '23:00', fin: '24:00' });
  });
  it('rechaza ids inválidos o fuera de horario', () => {
    expect(parseIdTurno('basura')).toBeNull();
    expect(parseIdTurno('tur-0219-19')).toBeNull();
    expect(parseIdTurno('tur-esp-02-20260919-07')).toBeNull();
    expect(parseIdTurno('tur-esp-02-20260919-24')).toBeNull();
  });
});

describe('fijaQueCubre (regla R3 de la API)', () => {
  // 2026-09-15 es martes.
  const martes = '2026-09-15';
  const fija: ReservaFija = {
    id: 'fij-07', espacioId: 'esp-02', titular: 'Grupo de los martes', dia: 2,
    inicio: '21:00', fin: '22:00', desde: '2026-03-01', hasta: null, activa: true,
  };
  const turno = (fecha: string, inicio: string, espacioId = 'esp-02') => ({ espacioId, fecha, inicio });

  it('encuentra la fija de los martes a las 21', () => {
    expect(fijaQueCubre(turno(martes, '21:00'), [fija])?.titular).toBe('Grupo de los martes');
  });
  it('no aplica otro día, otra hora, otro espacio, fuera de vigencia ni inactiva', () => {
    expect(fijaQueCubre(turno('2026-09-16', '21:00'), [fija])).toBeNull();
    expect(fijaQueCubre(turno(martes, '22:00'), [fija])).toBeNull();
    expect(fijaQueCubre(turno(martes, '21:00', 'esp-01'), [fija])).toBeNull();
    expect(fijaQueCubre(turno('2026-02-24', '21:00'), [fija])).toBeNull();
    expect(fijaQueCubre(turno('2026-09-22', '21:00'), [{ ...fija, hasta: '2026-09-15' }])).toBeNull();
    expect(fijaQueCubre(turno(martes, '21:00'), [{ ...fija, activa: false }])).toBeNull();
  });
  it('una fija de dos horas cubre las dos', () => {
    const club = { ...fija, inicio: '19:00', fin: '21:00', titular: 'Club' };
    expect(fijaQueCubre(turno(martes, '19:00'), [club])?.titular).toBe('Club');
    expect(fijaQueCubre(turno(martes, '20:00'), [club])?.titular).toBe('Club');
    expect(fijaQueCubre(turno(martes, '21:00'), [club])).toBeNull();
  });
  it('elige la fija del día correcto cuando hay varias del mismo club', () => {
    const lunes = { ...fija, id: 'a', dia: 1 as const, titular: 'Lunes' };
    const martesFija = { ...fija, id: 'b', titular: 'Martes' };
    expect(fijaQueCubre(turno(martes, '21:00'), [lunes, martesFija])?.titular).toBe('Martes');
  });
});
