import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Boton, Campo, Icono, Tarjeta, Texto } from '../componentes/base';
import { useSesion } from '../contexto/SesionContext';
import { useTema } from '../contexto/TemaContext';
import { validarEmail } from '../logica/reglas';
import { espaciado } from '../tema/colores';

/** Usuarios de demo de la API de la cátedra (todos con la contraseña villaguay2026). */
const CONTRASENA_DEMO = 'villaguay2026';
const CUENTAS_DEMO = [
  { rol: 'Jugador', email: 'emiliano@mail.com', icono: 'football-outline' },
  { rol: 'Jugador con 3 reservas', email: 'lleno@demo.ar', icono: 'albums-outline' },
  { rol: 'Encargado', email: 'marcelo@villaguay.demo.ar', icono: 'qr-code-outline' },
  { rol: 'Administrador', email: 'nahuel@villaguay.demo.ar', icono: 'briefcase-outline' },
];

export default function PantallaLogin() {
  const { colores } = useTema();
  const { iniciarSesion } = useSesion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const ingresar = async (e = email, p = password) => {
    const ee = validarEmail(e);
    setErrorEmail(ee);
    if (ee || !p) {
      setError(!p ? 'Ingresá tu contraseña.' : null);
      return;
    }
    setEnviando(true);
    setError(null);
    const r = await iniciarSesion(e.trim(), p);
    setEnviando(false);
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    // Se vuelve a la pantalla anterior: "atrás" no debe regresar al formulario.
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.m }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: espaciado.s, marginVertical: espaciado.m }}>
          <Icono nombre="football" tam={56} color={colores.primario} />
          <Texto variante="titulo">Reservas Deportivas</Texto>
          <Texto suave centrado>Ingresá para reservar. Ver la disponibilidad no requiere cuenta.</Texto>
        </View>
        <Campo
          etiqueta="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="tu@mail.com"
          error={errorEmail}
        />
        <Campo
          etiqueta="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
          onSubmitEditing={() => ingresar()}
        />
        {error ? <Texto color={colores.peligro}>{error}</Texto> : null}
        <Boton titulo="Ingresar" icono="log-in-outline" grande cargando={enviando} onPress={() => ingresar()} />
        <Boton titulo="No tengo cuenta: crear una" variante="texto" onPress={() => router.replace('/registro')} />

        <Tarjeta style={{ gap: espaciado.s, marginTop: espaciado.m }}>
          <Texto variante="subtitulo">Cuentas de prueba</Texto>
          <Texto variante="chico" suave>Usuarios de demo de la API de la cátedra (contraseña villaguay2026). Tocá uno para ingresar.</Texto>
          {CUENTAS_DEMO.map((c) => (
            <Boton
              key={c.email}
              titulo={`${c.rol} · ${c.email}`}
              icono={c.icono}
              variante="secundario"
              deshabilitado={enviando}
              style={estilos.demo}
              onPress={() => {
                setEmail(c.email);
                setPassword(CONTRASENA_DEMO);
                void ingresar(c.email, CONTRASENA_DEMO);
              }}
            />
          ))}
        </Tarjeta>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  demo: { justifyContent: 'flex-start' },
});
