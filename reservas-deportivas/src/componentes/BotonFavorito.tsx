import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable } from 'react-native';
import { useSesion } from '../contexto/SesionContext';
import { useTema } from '../contexto/TemaContext';
import { marcarFavorito } from '../servicios/espacios';
import { Icono } from './base';

/** Estrella de favorito: se avisa cuando se libera un turno de este espacio. */
export function BotonFavorito({ espacioId }: { espacioId: string }) {
  const { colores } = useTema();
  const { usuario, actualizarUsuario, sincronizar } = useSesion();
  const [guardando, setGuardando] = useState(false);
  const activo = !!usuario?.espaciosFavoritos.includes(espacioId);

  const alternar = async () => {
    if (!usuario) {
      Alert.alert('Favoritos', 'Ingresá para guardar favoritos y enterarte cuando se libere un turno.', [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Ingresar', onPress: () => router.push('/login') },
      ]);
      return;
    }
    setGuardando(true);
    const r = await marcarFavorito(espacioId, !activo);
    setGuardando(false);
    if (r.ok) {
      actualizarUsuario(r.datos);
      void Haptics.selectionAsync();
      // Se toma enseguida la foto de la grilla del favorito, para avisar cuando se libere un turno.
      if (!activo) void sincronizar({ revisarFavoritos: true });
    } else {
      Alert.alert('No se pudo guardar', r.error.mensaje);
    }
  };

  if (guardando) return <ActivityIndicator color={colores.primario} style={{ marginHorizontal: 8 }} />;
  return (
    <Pressable
      onPress={alternar}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={activo ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 6 })}
    >
      <Icono nombre={activo ? 'star' : 'star-outline'} color={activo ? '#F5B400' : colores.texto} tam={24} />
    </Pressable>
  );
}
