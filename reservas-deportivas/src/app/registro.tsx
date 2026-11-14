import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Boton, Campo, Texto } from '../componentes/base';
import { useSesion } from '../contexto/SesionContext';
import { useTema } from '../contexto/TemaContext';
import { validarEmail, validarNombre, validarPassword, validarTelefono } from '../logica/reglas';
import { espaciado } from '../tema/colores';

type Errores = Partial<Record<'nombre' | 'email' | 'telefono' | 'password' | 'repetir', string | null>>;

export default function PantallaRegistro() {
  const { colores } = useTema();
  const { registrarse } = useSesion();
  const [d, setD] = useState({ nombre: '', email: '', telefono: '', password: '', repetir: '' });
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo: keyof typeof d) => (v: string) => setD((x) => ({ ...x, [campo]: v }));

  const enviar = async () => {
    const e: Errores = {
      nombre: validarNombre(d.nombre),
      email: validarEmail(d.email),
      telefono: validarTelefono(d.telefono),
      password: validarPassword(d.password),
      repetir: d.password !== d.repetir ? 'Las contraseñas no coinciden.' : null,
    };
    setErrores(e);
    if (Object.values(e).some(Boolean)) return;
    setEnviando(true);
    setError(null);
    const r = await registrarse({ nombre: d.nombre.trim(), email: d.email.trim(), telefono: d.telefono.trim(), contrasena: d.password });
    setEnviando(false);
    if (!r.ok) {
      setError(r.error.mensaje);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: espaciado.l }} keyboardShouldPersistTaps="handled">
        <Texto suave style={{ marginBottom: espaciado.l }}>La cuenta es para reservar. El teléfono sirve para que la Dirección te pueda avisar.</Texto>
        <Campo etiqueta="Nombre y apellido" value={d.nombre} onChangeText={cambiar('nombre')} autoComplete="name" error={errores.nombre} />
        <Campo etiqueta="Email" value={d.email} onChangeText={cambiar('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errores.email} />
        <Campo etiqueta="Teléfono" value={d.telefono} onChangeText={cambiar('telefono')} keyboardType="phone-pad" autoComplete="tel" placeholder="3455-401122" error={errores.telefono} />
        <Campo etiqueta="Contraseña (mínimo 8)" value={d.password} onChangeText={cambiar('password')} secureTextEntry autoComplete="new-password" error={errores.password} />
        <Campo etiqueta="Repetir contraseña" value={d.repetir} onChangeText={cambiar('repetir')} secureTextEntry error={errores.repetir} onSubmitEditing={enviar} />
        {error ? <Texto color={colores.peligro} style={{ marginBottom: espaciado.m }}>{error}</Texto> : null}
        <Boton titulo="Crear cuenta" icono="person-add-outline" grande cargando={enviando} onPress={enviar} />
        <Boton titulo="Ya tengo cuenta" variante="texto" style={{ marginTop: espaciado.s }} onPress={() => router.replace('/login')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
