import { Linking, Platform } from 'react-native';
import type { Coordenadas } from '../tipos';

export async function abrirComoLlegar(destino: Coordenadas, nombre: string): Promise<void> {
  const { latitud: lat, longitud: lon } = destino;
  const etiqueta = encodeURIComponent(nombre);
  const nativa =
    Platform.OS === 'ios'
      ? `maps://?daddr=${lat},${lon}&q=${etiqueta}`
      : `geo:${lat},${lon}?q=${lat},${lon}(${etiqueta})`;
  try {
    await Linking.openURL(nativa);
  } catch {
    await Linking.openURL(
      `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lat}%2C${lon}#map=16/${lat}/${lon}`,
    );
  }
}

export async function llamar(telefono: string): Promise<void> {
  const limpio = telefono.replace(/[^\d+]/g, '');
  try {
    await Linking.openURL(`tel:${limpio}`);
  } catch {
    // Sin app de teléfono (algunos emuladores).
  }
}
