import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSesion } from '../contexto/SesionContext';
import { espaciado } from '../tema/colores';
import { Boton, Cargando, Vacio } from './base';

/** Muestra el contenido solo con sesión; si no, invita a ingresar (mirar no requiere cuenta). */
export function RequiereSesion({ children, mensaje, staff }: { children: ReactNode; mensaje: string; staff?: boolean }) {
  const { usuario, cargando, esStaff } = useSesion();
  if (cargando) return <Cargando />;
  if (!usuario) {
    return (
      <Vacio mensaje={mensaje} icono="person-circle-outline">
        <View style={{ gap: espaciado.s, alignSelf: 'stretch' }}>
          <Boton titulo="Ingresar" icono="log-in-outline" onPress={() => router.push('/login')} />
          <Boton titulo="Crear cuenta" variante="secundario" onPress={() => router.push('/registro')} />
        </View>
      </Vacio>
    );
  }
  if (staff && !esStaff) {
    return <Vacio mensaje="Esta sección es solo para encargados y administradores." icono="lock-closed-outline" />;
  }
  return <>{children}</>;
}
