import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BannerSinRed } from '../componentes/EstadoRed';
import { VerificarIdentidad } from '../componentes/VerificarIdentidad';
import { ProveedorCatalogo } from '../contexto/CatalogoContext';
import { ProveedorSesion, useSesion } from '../contexto/SesionContext';
import { ProveedorTema, useTema } from '../contexto/TemaContext';
import { configurarNotificaciones } from '../notificaciones/notificaciones';

configurarNotificaciones();

/** Reingreso: con sesión guardada se pide huella (o contraseña) antes de mostrar la app. */
function Reingreso() {
  const { colores } = useTema();
  const { desbloquear, cerrarSesion } = useSesion();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colores.fondo, zIndex: 10, elevation: 10 }]}>
      <VerificarIdentidad
        titulo="Bienvenido de nuevo"
        mensajeSistema="Ingresá a Reservas Deportivas"
        onListo={desbloquear}
        onCerrarSesion={cerrarSesion}
      />
    </View>
  );
}

function Navegacion() {
  const { colores } = useTema();
  const { bloqueada, cargando } = useSesion();

  // Al tocar una notificación se abre la reserva o la bandeja de avisos.
  useEffect(() => {
    const abrir = (r: Notifications.NotificationResponse | null) => {
      const datos = r?.notification.request.content.data as { tipo?: string; reservaId?: string | null } | undefined;
      if (!datos?.tipo) return;
      if (datos.tipo === 'recordatorio' && datos.reservaId) router.push(`/reserva/${datos.reservaId}`);
      else if (datos.tipo === 'aviso') router.push('/avisos');
    };
    const ultima = Notifications.getLastNotificationResponse();
    if (ultima) abrir(ultima);
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, []);

  const tema = useMemo(() => {
    const base = colores.oscuro ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colores.primario,
        background: colores.fondo,
        card: colores.superficie,
        text: colores.texto,
        border: colores.borde,
        notification: colores.peligro,
      },
    };
  }, [colores]);

  return (
    <ThemeProvider value={tema}>
      <StatusBar style={colores.oscuro ? 'light' : 'dark'} />
      <BannerSinRed />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colores.superficie },
          headerTintColor: colores.texto,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colores.fondo },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="espacio/[id]" options={{ title: 'Espacio' }} />
        <Stack.Screen name="disponibilidad/[id]" options={{ title: 'Disponibilidad' }} />
        <Stack.Screen name="reserva/[id]" options={{ title: 'Mi reserva' }} />
        <Stack.Screen name="login" options={{ title: 'Ingresar', presentation: 'modal' }} />
        <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="gestion/agenda" options={{ title: 'Agenda del día' }} />
        <Stack.Screen name="gestion/escanear" options={{ title: 'Escanear ingreso' }} />
        <Stack.Screen name="gestion/bloqueos" options={{ title: 'Bloqueos' }} />
        <Stack.Screen name="gestion/fijas" options={{ title: 'Reservas fijas' }} />
        <Stack.Screen name="gestion/fija" options={{ title: 'Reserva fija' }} />
        <Stack.Screen name="gestion/precios" options={{ title: 'Precios por hora' }} />
        <Stack.Screen name="gestion/fotos" options={{ title: 'Fotos de las canchas' }} />
        <Stack.Screen name="gestion/usuarios" options={{ title: 'Usuarios' }} />
      </Stack>
      {bloqueada ? <Reingreso /> : null}
      {cargando ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colores.fondo, zIndex: 11, elevation: 11 }]} /> : null}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProveedorTema>
        <ProveedorSesion>
          <ProveedorCatalogo>
            <Navegacion />
          </ProveedorCatalogo>
        </ProveedorSesion>
      </ProveedorTema>
    </SafeAreaProvider>
  );
}
