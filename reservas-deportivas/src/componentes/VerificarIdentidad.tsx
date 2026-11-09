import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSesion } from '../contexto/SesionContext';
import { useTema } from '../contexto/TemaContext';
import { verificarContrasena } from '../servicios/usuarios';
import { espaciado } from '../tema/colores';
import { Boton, Campo, Icono, Texto, Vacio } from './base';

/**
 * Confirma la identidad con huella o rostro (expo-local-authentication). Si el teléfono
 * no tiene biometría ni bloqueo de pantalla, o la persona prefiere no usarla, se confirma
 * con la contraseña de la cuenta (alternativa que pide el TFI).
 */

type Paso = { tipo: 'verificando' } | { tipo: 'contrasena'; motivo: string };

async function verificarBiometria(mensaje: string): Promise<Paso | null> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const nivel = await LocalAuthentication.getEnrolledLevelAsync();
    if (!hardware || nivel === LocalAuthentication.SecurityLevel.NONE) {
      return { tipo: 'contrasena', motivo: 'Este teléfono no tiene huella ni bloqueo de pantalla configurado. Confirmá con tu contraseña.' };
    }
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: mensaje, cancelLabel: 'Usar contraseña', disableDeviceFallback: false });
    return r.success ? null : { tipo: 'contrasena', motivo: 'No se pudo verificar. Podés reintentar o usar tu contraseña.' };
  } catch {
    return { tipo: 'contrasena', motivo: 'No se pudo usar la biometría. Confirmá con tu contraseña.' };
  }
}

export function VerificarIdentidad({
  titulo, mensajeSistema, onListo, onCerrarSesion,
}: { titulo: string; mensajeSistema: string; onListo: () => void; onCerrarSesion?: () => void }) {
  const { colores } = useTema();
  const { usuario } = useSesion();
  const [paso, setPaso] = useState<Paso>({ tipo: 'verificando' });
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const aplicar = useCallback((r: Paso | null) => (r ? setPaso(r) : onListo()), [onListo]);

  const reintentar = useCallback(async () => {
    setPaso({ tipo: 'verificando' });
    aplicar(await verificarBiometria(mensajeSistema));
  }, [aplicar, mensajeSistema]);

  useEffect(() => {
    void verificarBiometria(mensajeSistema).then(aplicar);
  }, [aplicar, mensajeSistema]);

  if (paso.tipo === 'verificando') {
    return <Vacio mensaje="Confirmá tu identidad con la huella o el rostro…" icono="finger-print-outline" />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.m, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: espaciado.s }}>
          <Icono nombre="finger-print-outline" tam={56} color={colores.primario} />
          <Texto variante="subtitulo" centrado>{titulo}</Texto>
          {usuario ? <Texto suave centrado>{usuario.nombre} · {usuario.email}</Texto> : null}
          <Texto centrado>{paso.motivo}</Texto>
        </View>
        <Boton titulo="Reintentar con huella o rostro" icono="finger-print-outline" variante="secundario" onPress={reintentar} />
        <Campo etiqueta="Contraseña" value={contrasena} onChangeText={setContrasena} secureTextEntry error={error} onSubmitEditing={() => undefined} />
        <Boton
          titulo="Confirmar con contraseña"
          icono="lock-open-outline"
          cargando={enviando}
          deshabilitado={!contrasena || !usuario}
          onPress={async () => {
            if (!usuario) return;
            setEnviando(true);
            const r = await verificarContrasena(usuario.email, contrasena);
            setEnviando(false);
            if (r.ok) onListo();
            else setError(r.error.mensaje);
          }}
        />
        {onCerrarSesion ? <Boton titulo="Cerrar sesión" variante="texto" onPress={onCerrarSesion} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
