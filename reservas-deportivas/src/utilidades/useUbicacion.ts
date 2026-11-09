import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { Coordenadas } from '../tipos';

/**
 * Ubicación en primer plano, opcional. Si la persona la niega la app funciona igual:
 * solo se usa para el mapa y para saber qué complejo queda más cerca (PDR).
 * Nunca se pide ubicación en segundo plano.
 */
export type EstadoUbicacion =
  | { tipo: 'sin_pedir' }
  | { tipo: 'buscando' }
  | { tipo: 'concedida'; coords: Coordenadas }
  | { tipo: 'denegada' }
  | { tipo: 'error'; mensaje: string };

async function consultarUbicacion(pedir: boolean): Promise<EstadoUbicacion> {
  try {
    let permiso = await Location.getForegroundPermissionsAsync();
    if (!permiso.granted && pedir && permiso.canAskAgain) {
      permiso = await Location.requestForegroundPermissionsAsync();
    }
    if (!permiso.granted) {
      return pedir || !permiso.canAskAgain ? { tipo: 'denegada' } : { tipo: 'sin_pedir' };
    }
    const ultima = await Location.getLastKnownPositionAsync();
    const pos = ultima ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { tipo: 'concedida', coords: { latitud: pos.coords.latitude, longitud: pos.coords.longitude } };
  } catch {
    return { tipo: 'error', mensaje: 'No pudimos obtener tu ubicación (¿está activado el GPS?).' };
  }
}

export function useUbicacion(pedirAlMontar = false) {
  const [estado, setEstado] = useState<EstadoUbicacion>({ tipo: 'sin_pedir' });

  useEffect(() => {
    // Al montar solo se consulta si ya había permiso; se pide únicamente si se indicó.
    let vigente = true;
    void consultarUbicacion(pedirAlMontar).then((e) => {
      if (vigente) setEstado(e);
    });
    return () => {
      vigente = false;
    };
  }, [pedirAlMontar]);

  const pedir = useCallback(async () => {
    setEstado({ tipo: 'buscando' });
    setEstado(await consultarUbicacion(true));
  }, []);

  return { estado, pedir };
}
