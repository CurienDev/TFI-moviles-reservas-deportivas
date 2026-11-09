import { LightSensor } from 'expo-sensors';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { CLAVES, guardarJson, leerJsonSync } from '../almacenamiento/kv';
import { claro, oscuro, type Paleta } from '../tema/colores';

/**
 * Tema de la app. Además de claro/oscuro/sistema, en Android se puede elegir
 * "sensor de luz": con poca luz ambiente (de noche, a la intemperie) pasa solo
 * a modo oscuro. Usa expo-sensors (LightSensor).
 */

export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro' | 'sensor';

interface ValorTema {
  colores: Paleta;
  preferencia: PreferenciaTema;
  cambiarPreferencia: (p: PreferenciaTema) => void;
  sensorDisponible: boolean;
  luxActual: number | null;
}

const Contexto = createContext<ValorTema | null>(null);

// Histéresis para no parpadear en el límite.
const LUX_OSCURECER = 15;
const LUX_ACLARAR = 40;

export function ProveedorTema({ children }: { children: ReactNode }) {
  const esquema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(
    () => leerJsonSync<PreferenciaTema>(CLAVES.tema) ?? 'sistema',
  );
  const [sensorDisponible, setSensorDisponible] = useState(false);
  const [lux, setLux] = useState<number | null>(null);
  const [oscuroPorSensor, setOscuroPorSensor] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    LightSensor.isAvailableAsync()
      .then(setSensorDisponible)
      .catch(() => setSensorDisponible(false));
  }, []);

  useEffect(() => {
    if (preferencia !== 'sensor' || !sensorDisponible) return;
    LightSensor.setUpdateInterval(1500);
    const sub = LightSensor.addListener(({ illuminance }) => {
      setLux(Math.round(illuminance));
      setOscuroPorSensor((antes) => (antes ? illuminance <= LUX_ACLARAR : illuminance < LUX_OSCURECER));
    });
    return () => sub.remove();
  }, [preferencia, sensorDisponible]);

  const usarOscuro =
    preferencia === 'oscuro' ||
    (preferencia === 'sistema' && esquema === 'dark') ||
    (preferencia === 'sensor' && (sensorDisponible ? oscuroPorSensor : esquema === 'dark'));

  const valor = useMemo<ValorTema>(
    () => ({
      colores: usarOscuro ? oscuro : claro,
      preferencia,
      cambiarPreferencia: (p) => {
        setPreferencia(p);
        void guardarJson(CLAVES.tema, p);
      },
      sensorDisponible,
      luxActual: lux,
    }),
    [usarOscuro, preferencia, sensorDisponible, lux],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): ValorTema {
  const v = useContext(Contexto);
  if (!v) throw new Error('useTema debe usarse dentro de ProveedorTema');
  return v;
}
