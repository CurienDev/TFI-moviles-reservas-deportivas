import { Linking, Platform } from 'react-native';
import type { Coordenadas } from '../tipos';

/**
 * "Cómo llegar": abre la app de mapas que tenga instalada la persona (Android elige
 * con el esquema geo:). Si no hay ninguna, abre la ruta en OpenStreetMap en el
 * navegador. No depende de Google Maps ni de claves pagas.
 */
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
    // Sin app de teléfono (por ejemplo, en algunos emuladores): no se hace nada.
  }
}
