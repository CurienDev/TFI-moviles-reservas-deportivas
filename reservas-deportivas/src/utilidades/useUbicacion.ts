import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { Coordenadas } from '../tipos';

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
