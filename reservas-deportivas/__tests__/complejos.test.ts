/// <reference types="jest" />
import { complejoDe, lugarDe, nombreComplejo, tieneComplejo, unir } from '../src/logica/complejos';
import { huellaContrasena, sha256 } from '../src/logica/sha256';

describe('espacios sin complejo («—» en la API)', () => {
  const suelto = { nombre: 'Cancha de Básquet 1', complejo: '—' };
  const enComplejo = { nombre: 'Cancha 1 — Fútbol 5', complejo: 'Polideportivo Municipal' };
  it('detecta el guion como "sin complejo"', () => {
    expect(tieneComplejo(suelto)).toBe(false);
    expect(tieneComplejo({ complejo: '' })).toBe(false);
    expect(tieneComplejo(enComplejo)).toBe(true);
  });
  it('no muestra el guion como texto', () => {
    expect(complejoDe(suelto)).toBeNull();
    expect(unir([complejoDe(suelto), '$ 6.000'])).toBe('$ 6.000');
    expect(unir([complejoDe(enComplejo), '$ 12.000'])).toBe('Polideportivo Municipal · $ 12.000');
    expect(nombreComplejo('—')).toBe('Otros espacios');
  });
  it('en el mapa cada espacio suelto es su propio lugar', () => {
    expect(lugarDe(suelto)).toBe('Cancha de Básquet 1');
    expect(lugarDe(enComplejo)).toBe('Polideportivo Municipal');
  });
});

describe('SHA-256 (reingreso sin red)', () => {
  it('coincide con los vectores de prueba oficiales', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))
      .toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  });
  it('maneja acentos (UTF-8)', () => {
    expect(sha256('ñ')).toBe('024bb90888ca89a15a19e9bdd8c712bfb070465fce1ef25e43c170ea44fc5e5f');
  });
  it('la huella depende de la sal y valida la contraseña correcta', () => {
    const h = huellaContrasena('villaguay2026', 'sal1', 50);
    expect(huellaContrasena('villaguay2026', 'sal1', 50)).toBe(h);
    expect(huellaContrasena('otra', 'sal1', 50)).not.toBe(h);
    expect(huellaContrasena('villaguay2026', 'sal2', 50)).not.toBe(h);
  });
});
