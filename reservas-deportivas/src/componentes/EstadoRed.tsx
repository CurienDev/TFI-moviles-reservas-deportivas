import { useNetworkState } from 'expo-network';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../contexto/TemaContext';
import { espaciado } from '../tema/colores';
import { Icono, Texto } from './base';

/** true si el teléfono tiene red (expo-network). Mientras no se sabe, se asume que sí. */
export function useHayRed(): boolean {
  const red = useNetworkState();
  return red.isConnected !== false && red.isInternetReachable !== false;
}

/**
 * Franja fija arriba de todo que avisa cuando el teléfono se queda sin conexión
 * (requisito del TFI: avisar el estado de la red con expo-network).
 */
export function BannerSinRed() {
  const hayRed = useHayRed();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  if (hayRed) return null;
  return (
    <View
      style={[estilos.banner, { backgroundColor: colores.advertenciaFondo, paddingTop: insets.top + 4 }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Icono nombre="cloud-offline-outline" tam={18} color={colores.advertencia} />
      <Texto variante="chico" color={colores.advertencia} style={{ flex: 1, fontWeight: '700' }}>
        Sin conexión. Ves los datos guardados en el teléfono; para reservar o cancelar hace falta red.
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, paddingHorizontal: espaciado.m, paddingBottom: 6 },
});
