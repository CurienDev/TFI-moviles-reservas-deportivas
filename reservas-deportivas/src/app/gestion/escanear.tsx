import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { Boton, Campo, Chip, Icono, Tarjeta, Texto, Vacio } from '../../componentes/base';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { VerificarIdentidad } from '../../componentes/VerificarIdentidad';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useTema } from '../../contexto/TemaContext';
import { horaDeIso, rangoHorario } from '../../logica/fechas';
import { parseIdTurno } from '../../logica/grilla';
import { registrarIngreso } from '../../servicios/reservas';
import { obtenerUsuario } from '../../servicios/usuarios';
import type { Reserva } from '../../tipos';
import { espaciado, radio } from '../../tema/colores';
import { nombreComplejo } from '../../logica/complejos';

/**
 * Escaneo del QR en la puerta. Antes de abrir la cámara el encargado se vuelve a
 * identificar con huella o rostro (o con su contraseña si el teléfono no tiene). La API
 * valida el código (de hoy, de esta cancha, en horario, sin usar) y la app lo muestra
 * claro, con vibración distinta para válido e inválido.
 */

/** Códigos con los que la API rechaza un QR (se muestran como "código inválido"). */
const RECHAZOS = new Set([
  'CODIGO_INVALIDO', 'RESERVA_CANCELADA', 'RESERVA_AUSENTE', 'CODIGO_DE_OTRO_DIA',
  'CODIGO_DE_OTRO_ESPACIO', 'INGRESO_YA_REGISTRADO', 'FUERA_DE_HORARIO',
]);

type ResultadoEscaneo =
  | { valido: true; reserva: Reserva; titular: string | null }
  | { valido: false; mensaje: string };

function Escaner() {
  const { colores } = useTema();
  const { estado } = useCatalogo();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const espacios = estado.tipo === 'exito' ? estado.datos.espacios : [];
  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEscaneo | null>(null);
  const [errorRed, setErrorRed] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [manual, setManual] = useState('');
  // onBarcodeScanned se dispara en cada cuadro: la bandera evita procesar el mismo código varias veces.
  const bloqueado = useRef(false);

  const validar = async (codigo: string) => {
    if (!espacioId || bloqueado.current) return;
    bloqueado.current = true;
    setProcesando(true);
    setErrorRed(null);
    const r = await registrarIngreso(codigo, espacioId);
    if (r.ok) {
      const titular = await obtenerUsuario(r.datos.usuarioId);
      setProcesando(false);
      setResultado({ valido: true, reserva: r.datos, titular: titular.ok ? titular.datos.nombre : null });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    setProcesando(false);
    if (RECHAZOS.has(r.error.codigo)) {
      setResultado({ valido: false, mensaje: r.error.mensaje });
      // Patrón largo y distinto para que se note sin mirar la pantalla.
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate([0, 400, 150, 400]);
      return;
    }
    // Falla de red o del servidor: no es un problema del código, se puede reintentar.
    setErrorRed(r.error.mensaje);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const otro = () => {
    setResultado(null);
    setErrorRed(null);
    setManual('');
    bloqueado.current = false;
  };

  const complejos = [...new Set(espacios.map((e) => e.complejo))];

  if (!espacioId) {
    return (
      <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.m }}>
        <Texto variante="subtitulo">¿En qué cancha estás?</Texto>
        <Texto suave>El código se valida contra la cancha, el día de hoy y el horario (desde 30 minutos antes del turno hasta que termina).</Texto>
        {complejos.map((c) => (
          <View key={c} style={{ gap: espaciado.s }}>
            <Texto variante="etiqueta" suave>{nombreComplejo(c)}</Texto>
            <View style={estilos.chips}>
              {espacios.filter((e) => e.complejo === c).map((e) => (
                <Chip key={e.id} texto={e.nombre} activo={false} onPress={() => setEspacioId(e.id)} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  const espacio = espacios.find((e) => e.id === espacioId)!;

  return (
    <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.m }} keyboardShouldPersistTaps="handled">
      <View style={estilos.fila}>
        <Icono nombre="location-outline" color={colores.primario} />
        <Texto variante="subtitulo" style={{ flex: 1 }}>{espacio.nombre}</Texto>
        <Boton titulo="Cambiar" variante="texto" onPress={() => { setEspacioId(null); otro(); }} />
      </View>

      {resultado ? (
        <Tarjeta style={[estilos.resultado, { backgroundColor: resultado.valido ? colores.exitoFondo : colores.peligroFondo, borderColor: resultado.valido ? colores.exito : colores.peligro }]}>
          <Icono nombre={resultado.valido ? 'checkmark-circle' : 'close-circle'} tam={72} color={resultado.valido ? colores.exito : colores.peligro} />
          <Texto variante="titulo" color={resultado.valido ? colores.exito : colores.peligro} centrado>
            {resultado.valido ? 'INGRESO VÁLIDO' : 'CÓDIGO INVÁLIDO'}
          </Texto>
          {!resultado.valido ? <Texto variante="subtitulo" centrado>{resultado.mensaje}</Texto> : null}
          {resultado.valido ? (
            <View style={{ gap: 2, alignItems: 'center' }}>
              <Texto centrado style={{ fontWeight: '700' }}>{resultado.titular ?? 'Jugador'} · {resultado.reserva.cantidadPersonas} personas</Texto>
              <Texto centrado>{espacio.nombre} · {rangoHorario(parseIdTurno(resultado.reserva.turnoId)?.inicio ?? '00:00', parseIdTurno(resultado.reserva.turnoId)?.fin ?? '00:00')}</Texto>
              {resultado.reserva.ingresoEn ? <Texto centrado suave>Llegada registrada a las {horaDeIso(resultado.reserva.ingresoEn)}</Texto> : null}
            </View>
          ) : null}
          <Boton titulo="Escanear otro" icono="scan-outline" grande onPress={otro} style={{ alignSelf: 'stretch' }} />
        </Tarjeta>
      ) : !permiso ? (
        <Vacio mensaje="Consultando permiso de cámara…" icono="camera-outline" />
      ) : !permiso.granted ? (
        <Tarjeta style={{ gap: espaciado.m, alignItems: 'center' }}>
          <Icono nombre="camera-outline" tam={48} color={colores.textoSuave} />
          <Texto centrado>Para escanear el QR hace falta usar la cámara. También podés escribir el código abajo.</Texto>
          {permiso.canAskAgain ? <Boton titulo="Permitir cámara" icono="camera-outline" onPress={pedirPermiso} /> : <Texto variante="chico" suave centrado>Activá el permiso de cámara desde los ajustes del teléfono.</Texto>}
        </Tarjeta>
      ) : (
        <View style={estilos.camaraMarco}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={procesando || resultado ? undefined : (r: BarcodeScanningResult) => void validar(r.data)}
          />
          <View style={estilos.mira} pointerEvents="none" />
          <View style={[estilos.leyendaCamara, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Texto color="#FFFFFF" centrado>{procesando ? 'Validando…' : 'Apuntá al código QR de la reserva'}</Texto>
          </View>
        </View>
      )}

      {errorRed ? (
        <Tarjeta style={{ gap: espaciado.s, backgroundColor: colores.advertenciaFondo }}>
          <Texto color={colores.advertencia}>{errorRed}</Texto>
          <Boton titulo="Reintentar" variante="secundario" onPress={otro} />
        </Tarjeta>
      ) : null}

      {!resultado ? (
        <Tarjeta style={{ gap: espaciado.s }}>
          <Texto variante="subtitulo">¿No lee el código?</Texto>
          <Campo etiqueta="Escribí el código" value={manual} onChangeText={(t) => setManual(t.toUpperCase())} autoCapitalize="characters" placeholder="VGY-0919-19-K3X9QM" />
          <Boton titulo="Validar código" icono="checkmark-outline" deshabilitado={manual.trim().length < 5} cargando={procesando} onPress={() => validar(manual)} />
        </Tarjeta>
      ) : null}
    </ScrollView>
  );
}

export default function PantallaEscanear() {
  const [verificado, setVerificado] = useState(false);
  return (
    <RequiereSesion staff mensaje="Ingresá con la cuenta de encargado para escanear.">
      {verificado ? (
        <Escaner />
      ) : (
        <VerificarIdentidad titulo="Confirmá que sos el encargado" mensajeSistema="Confirmá tu identidad para escanear" onListo={() => setVerificado(true)} />
      )}
    </RequiereSesion>
  );
}
const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s },
  camaraMarco: { height: 340, borderRadius: radio.l, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  mira: { width: 220, height: 220, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 20 },
  leyendaCamara: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: espaciado.s },
  resultado: { alignItems: 'center', gap: espaciado.m, borderWidth: 2 },
});
