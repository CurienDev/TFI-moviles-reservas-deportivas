import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Boton, Campo, Chip, Etiqueta, FilaDato, Icono, Separador, Tarjeta, Texto } from '../../componentes/base';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSesion } from '../../contexto/SesionContext';
import { useTema, type PreferenciaTema } from '../../contexto/TemaContext';
import { UMBRAL_MARCA, estaMarcado, validarNombre, validarTelefono } from '../../logica/reglas';
import { pedirPermisoNotificaciones } from '../../notificaciones/notificaciones';
import { cambiarSimulacion, cambiarUrlApi, leerSimulacion, urlApi, urlApiPorDefecto, type Simulacion } from '../../servicios/cliente';
import { normalizarUrl } from '../../servicios/protocolo';
import { actualizarDatos, probarServidor } from '../../servicios/usuarios';
import { espaciado } from '../../tema/colores';

const NOMBRE_ROL = { jugador: 'Jugador', encargado: 'Encargado', administrador: 'Administrador' } as const;

const OPCIONES_TEMA: { valor: PreferenciaTema; texto: string; icono: string }[] = [
  { valor: 'sistema', texto: 'Como el teléfono', icono: 'phone-portrait-outline' },
  { valor: 'claro', texto: 'Claro', icono: 'sunny-outline' },
  { valor: 'oscuro', texto: 'Oscuro', icono: 'moon-outline' },
  { valor: 'sensor', texto: 'Según la luz', icono: 'bulb-outline' },
];

const OPCIONES_SIMULACION: { valor: Simulacion; texto: string }[] = [
  { valor: 'ninguna', texto: 'Normal' },
  { valor: 'error', texto: 'Error del servidor' },
  { valor: 'demora', texto: 'Respuesta lenta (3 s)' },
];

function DatosPersonales() {
  const { usuario, actualizarUsuario } = useSesion();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  if (!usuario) return null;
  if (!editando) {
    return <Boton titulo="Editar nombre y teléfono" icono="create-outline" variante="texto" onPress={() => setEditando(true)} style={{ alignSelf: 'flex-start' }} />;
  }
  return (
    <View>
      <Campo etiqueta="Nombre y apellido" value={nombre} onChangeText={setNombre} />
      <Campo etiqueta="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" error={error} />
      <View style={{ flexDirection: 'row', gap: espaciado.s }}>
        <Boton titulo="Cancelar" variante="secundario" style={{ flex: 1 }} onPress={() => setEditando(false)} />
        <Boton
          titulo="Guardar"
          style={{ flex: 1 }}
          cargando={guardando}
          onPress={async () => {
            const e = validarNombre(nombre) ?? validarTelefono(telefono);
            setError(e);
            if (e) return;
            setGuardando(true);
            const r = await actualizarDatos({ nombre: nombre.trim(), telefono: telefono.trim() });
            setGuardando(false);
            if (r.ok) {
              actualizarUsuario(r.datos);
              setEditando(false);
            } else setError(r.error.mensaje);
          }}
        />
      </View>
    </View>
  );
}

function Servidor() {
  const { colores } = useTema();
  const { recargar } = useCatalogo();
  const [url, setUrl] = useState(urlApi());
  const [estado, setEstado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [probando, setProbando] = useState(false);
  return (
    <Tarjeta style={{ gap: espaciado.s }}>
      <Texto variante="subtitulo">Servidor</Texto>
      <Texto variante="chico" suave>Dirección de la API de la cátedra corriendo en tu PC: en el emulador http://10.0.2.2:3000; en un celular por Wi-Fi, la IP de la PC (por ejemplo http://192.168.0.10:3000); por cable con adb reverse, http://localhost:3000.</Texto>
      <Campo etiqueta="Dirección de la API" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://..." />
      <View style={{ flexDirection: 'row', gap: espaciado.s }}>
        <Boton
          titulo="Probar"
          icono="pulse-outline"
          variante="secundario"
          style={{ flex: 1 }}
          cargando={probando}
          onPress={async () => {
            setProbando(true);
            const r = await probarServidor(normalizarUrl(url));
            setProbando(false);
            setEstado(r.ok ? { ok: true, texto: `Conectado. API ${r.datos.version}, base ${r.datos.motor}.` } : { ok: false, texto: r.error.mensaje });
          }}
        />
        <Boton
          titulo="Guardar"
          icono="save-outline"
          style={{ flex: 1 }}
          onPress={async () => {
            await cambiarUrlApi(url);
            setUrl(urlApi());
            await recargar();
            Alert.alert('Servidor guardado', 'La app usa ahora esta dirección.');
          }}
        />
      </View>
      {estado ? <Texto variante="chico" color={estado.ok ? colores.exito : colores.peligro}>{estado.texto}</Texto> : null}
      {urlApiPorDefecto() && url !== urlApiPorDefecto() ? (
        <Boton titulo="Volver a la dirección de fábrica" variante="texto" onPress={() => setUrl(urlApiPorDefecto())} style={{ alignSelf: 'flex-start' }} />
      ) : null}
    </Tarjeta>
  );
}

export default function PantallaPerfil() {
  const { colores, preferencia, cambiarPreferencia, sensorDisponible, luxActual } = useTema();
  const { usuario, cerrarSesion } = useSesion();
  const { espacio } = useCatalogo();
  const [simulacion, setSimulacion] = useState<Simulacion>('ninguna');

  useEffect(() => {
    void leerSimulacion().then(setSimulacion);
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.l }} keyboardShouldPersistTaps="handled">
      {usuario ? (
        <Tarjeta style={{ gap: espaciado.s }}>
          <View style={estilos.fila}>
            <View style={[estilos.avatar, { backgroundColor: colores.primario }]}>
              <Texto variante="titulo" color={colores.primarioTexto}>{usuario.nombre.charAt(0)}</Texto>
            </View>
            <View style={{ flex: 1 }}>
              <Texto variante="subtitulo">{usuario.nombre}</Texto>
              <Texto suave variante="chico">{usuario.email}</Texto>
            </View>
            <Etiqueta texto={NOMBRE_ROL[usuario.rol]} color={colores.primario} fondo={colores.superficieAlta} />
          </View>
          <FilaDato icono="call-outline" texto={usuario.telefono} />
          <DatosPersonales />
          {usuario.rol === 'jugador' ? (
            <>
              <FilaDato icono="time-outline" texto={`Cancelaciones tardías: ${usuario.cancelacionesTardias}`} />
              <FilaDato icono="person-remove-outline" texto={`Ausencias registradas: ${usuario.ausencias}`} />
              {estaMarcado(usuario) ? (
                <Texto variante="chico" color={colores.advertencia}>
                  Tenés {usuario.cancelacionesTardias} cancelaciones tardías. Por ahora no hay sanciones, pero la Dirección lo tiene registrado.
                </Texto>
              ) : (
                <Texto variante="chico" suave>Cancelá con más de 4 horas de anticipación: después solo puede cancelar el encargado y cuenta como cancelación tardía (se marca a partir de {UMBRAL_MARCA}).</Texto>
              )}
              <Separador />
              <Texto variante="etiqueta" suave>Espacios favoritos</Texto>
              {usuario.espaciosFavoritos.length === 0 ? (
                <Texto variante="chico" suave>Marcá la estrella en un espacio para enterarte cuando se libere un turno.</Texto>
              ) : (
                usuario.espaciosFavoritos.map((id) => (
                  <Pressable key={id} onPress={() => router.push(`/espacio/${id}`)} style={estilos.fila}>
                    <Icono nombre="star" color="#F5B400" tam={18} />
                    <Texto style={{ flex: 1 }}>{espacio(id)?.nombre ?? id}</Texto>
                    <Icono nombre="chevron-forward" tam={18} color={colores.textoSuave} />
                  </Pressable>
                ))
              )}
            </>
          ) : null}
          <Separador />
          <Boton titulo="Cerrar sesión" icono="log-out-outline" variante="secundario" onPress={cerrarSesion} />
        </Tarjeta>
      ) : (
        <Tarjeta style={{ gap: espaciado.m }}>
          <Texto variante="subtitulo">No ingresaste</Texto>
          <Texto suave>Podés ver espacios y disponibilidad sin cuenta. Para reservar, ingresá o creá una cuenta.</Texto>
          <Boton titulo="Ingresar" icono="log-in-outline" onPress={() => router.push('/login')} />
          <Boton titulo="Crear cuenta" variante="secundario" onPress={() => router.push('/registro')} />
        </Tarjeta>
      )}

      <Tarjeta style={{ gap: espaciado.m }}>
        <Texto variante="subtitulo">Apariencia</Texto>
        <Texto variante="chico" suave>El modo oscuro se lee mejor de noche y a la intemperie.</Texto>
        <View style={estilos.chips}>
          {OPCIONES_TEMA.filter((o) => o.valor !== 'sensor' || sensorDisponible).map((o) => (
            <Chip key={o.valor} texto={o.texto} icono={o.icono} activo={preferencia === o.valor} onPress={() => cambiarPreferencia(o.valor)} />
          ))}
        </View>
        {preferencia === 'sensor' ? (
          <Texto variante="chico" suave>
            Usa el sensor de luz del teléfono: con poca luz pasa a modo oscuro.{luxActual !== null ? ` Luz actual: ${luxActual} lux.` : ''}
          </Texto>
        ) : null}
      </Tarjeta>

      <Tarjeta style={{ gap: espaciado.m }}>
        <Texto variante="subtitulo">Notificaciones</Texto>
        <Texto variante="chico" suave>Recordatorio 2 horas antes de cada turno, y avisos si se suspende un turno tuyo o se libera uno de tus favoritos.</Texto>
        <Boton
          titulo="Permitir notificaciones"
          icono="notifications-outline"
          variante="secundario"
          onPress={async () => {
            const ok = await pedirPermisoNotificaciones();
            Alert.alert(ok ? 'Notificaciones activadas' : 'Notificaciones desactivadas', ok ? 'Te vamos a avisar antes de cada turno.' : 'Podés activarlas desde los ajustes del teléfono.');
          }}
        />
      </Tarjeta>

      <Servidor />

      <Tarjeta style={{ gap: espaciado.m }}>
        <Texto variante="subtitulo">Probar errores</Texto>
        <Texto variante="chico" suave>Le pide a la API que simule una falla o una demora (cabecera X-Simular) para ver cómo responde la app.</Texto>
        <View style={estilos.chips}>
          {OPCIONES_SIMULACION.map((o) => (
            <Chip
              key={o.valor}
              texto={o.texto}
              activo={simulacion === o.valor}
              onPress={async () => {
                setSimulacion(o.valor);
                await cambiarSimulacion(o.valor);
              }}
            />
          ))}
        </View>
      </Tarjeta>

      <View style={{ alignItems: 'center', gap: 4, paddingBottom: espaciado.xl }}>
        <Texto variante="chico" suave>Reservas Deportivas · Municipalidad de Villaguay</Texto>
        <Texto variante="chico" suave>Versión {Constants.expoConfig?.version ?? '1.0.0'} · Mapas © OpenStreetMap</Texto>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m, minHeight: 44 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s },
});
