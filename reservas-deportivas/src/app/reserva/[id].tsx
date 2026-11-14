import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { BannerCache, Boton, Cargando, Etiqueta, FilaDato, Icono, Separador, Tarjeta, Texto, VistaError } from '../../componentes/base';
import { QrReserva, estiloReserva } from '../../componentes/dominio';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { aFechaLocal, fechaCorta, fechaLarga, fechaRelativa, horaDeIso, precioATexto, rangoHorario } from '../../logica/fechas';
import { MINUTOS_INGRESO_ANTES, estadoIngreso, personalPuedeCancelar, tipoCancelacion, momentoRecordatorio } from '../../logica/reglas';
import { cancelarReserva, obtenerReserva } from '../../servicios/reservas';
import { espaciado, radio } from '../../tema/colores';
import { abrirComoLlegar } from '../../utilidades/navegacion';
import { useCarga } from '../../utilidades/useCarga';
import { complejoDe, unir } from '../../logica/complejos';

function Contenido() {
  const { id, nueva } = useLocalSearchParams<{ id: string; nueva?: string }>();
  const { colores } = useTema();
  const { usuario, esStaff, sincronizar } = useSesion();
  const { deporte } = useCatalogo();
  const { estado, setEstado, reintentar } = useCarga(() => obtenerReserva(String(id), usuario?.id ?? null), [id]);
  const [cancelando, setCancelando] = useState(false);

  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <VistaError mensaje={estado.error.mensaje} onReintentar={reintentar} />;

  const { reserva, espacio, fecha, inicio, fin } = estado.datos;
  const ahora = new Date();
  const e = estiloReserva(reserva.estado, colores);
  const esMia = reserva.usuarioId === usuario?.id;
  const tipo = tipoCancelacion(reserva, ahora);
  const puedeCancelar = esMia ? tipo === 'permitida' : esStaff && personalPuedeCancelar(reserva, ahora);
  const hastaFecha = reserva.cancelableHasta.slice(0, 10);
  const hastaTexto = `${horaDeIso(reserva.cancelableHasta)} ${hastaFecha === aFechaLocal(ahora) ? 'de hoy' : `del ${fechaCorta(hastaFecha)}`}`;
  const dep = espacio ? deporte(espacio.deporteId) : undefined;
  const ingreso = estadoIngreso(reserva, ahora);

  const cancelar = () => {
    const tardia = !esMia || tipo === 'fuera_de_plazo';
    Alert.alert(
      'Cancelar reserva',
      tardia
        ? 'Faltan menos de 4 horas: la cancelación queda registrada como tardía para el jugador. ¿Cancelar igual?'
        : 'El turno queda libre para otra persona.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Cancelar reserva',
          style: 'destructive',
          onPress: async () => {
            setCancelando(true);
            const r = await cancelarReserva(reserva.id, usuario?.id ?? null);
            setCancelando(false);
            if (!r.ok) {
              Alert.alert('No se pudo cancelar', r.error.mensaje);
              return;
            }
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setEstado({ tipo: 'exito', datos: { ...estado.datos, reserva: r.datos }, desdeCache: false });
            void sincronizar();
            Alert.alert('Reserva cancelada', 'Listo, el turno quedó libre.');
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <BannerCache visible={estado.desdeCache} />
      <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.l }}>
        {nueva === '1' && reserva.estado === 'confirmada' ? (
          <View style={[estilos.exito, { backgroundColor: colores.exitoFondo }]} accessibilityLiveRegion="polite">
            <Icono nombre="checkmark-circle" color={colores.exito} tam={26} />
            <Texto color={colores.exito} style={{ flex: 1, fontWeight: '700' }}>¡Reserva confirmada!{momentoRecordatorio({ fecha, inicio }).getTime() > ahora.getTime() ? ' Te recordamos 2 horas antes.' : ' Tu turno es en menos de 2 horas.'}</Texto>
          </View>
        ) : null}

        <Tarjeta style={{ gap: 4 }}>
          <Texto variante="titulo">{espacio?.nombre ?? reserva.espacioId}</Texto>
          <Texto>{fechaLarga(fecha)} {rangoHorario(inicio, fin)}</Texto>
          {espacio && complejoDe(espacio) ? <Texto suave>{complejoDe(espacio)}</Texto> : null}
          {espacio ? <Texto style={{ fontWeight: '700' }}>{precioATexto(espacio.precioPorHora)} · se paga en el lugar</Texto> : null}
          <View style={[estilos.fila, { marginTop: espaciado.s }]}>
            <Etiqueta texto={e.texto} icono={e.icono} color={e.color} fondo={e.fondo} />
            {dep ? <Etiqueta texto={dep.nombre} icono={dep.icono} color="#FFFFFF" fondo={dep.color} /> : null}
            <Etiqueta texto={`${reserva.cantidadPersonas} personas`} icono="people-outline" color={colores.texto} fondo={colores.superficieAlta} />
          </View>
        </Tarjeta>

        <Tarjeta style={{ alignItems: 'center', gap: espaciado.m }}>
          <Texto variante="etiqueta" suave>Código QR de ingreso</Texto>
          <QrReserva codigo={reserva.codigoQr} apagado={reserva.estado !== 'confirmada'} />
          <Texto variante="subtitulo" style={{ letterSpacing: 1 }}>{reserva.codigoQr}</Texto>
          {reserva.estado === 'confirmada' ? (
            <>
              <Texto centrado>Mostráselo al encargado en la puerta. Funciona sin señal: queda guardado en el teléfono.</Texto>
              {ingreso === 'temprano' ? (
                <Texto variante="chico" suave centrado>Se puede escanear desde {MINUTOS_INGRESO_ANTES} minutos antes del turno.</Texto>
              ) : null}
            </>
          ) : reserva.estado === 'cumplida' ? (
            <Texto centrado color={colores.exito}>
              Ingreso registrado{reserva.ingresoEn ? ` el ${fechaRelativa(reserva.ingresoEn.slice(0, 10), ahora).toLowerCase()} a las ${horaDeIso(reserva.ingresoEn)}` : ''}.
            </Texto>
          ) : (
            <Texto centrado color={colores.peligro}>Este código ya no es válido para ingresar.</Texto>
          )}
        </Tarjeta>

        <Tarjeta style={{ gap: espaciado.s }}>
          {espacio ? (
            <Boton titulo="Cómo llegar" icono="navigate-outline" variante="secundario" onPress={() => abrirComoLlegar(espacio.coordenadas, unir([espacio.nombre, complejoDe(espacio)], ' - '))} />
          ) : null}
          {reserva.estado === 'confirmada' && (esMia || esStaff) ? (
            <>
              <Separador />
              {puedeCancelar ? (
                <Boton
                  titulo="Cancelar reserva"
                  icono="close-circle-outline"
                  variante="peligro"
                  cargando={cancelando}
                  deshabilitado={estado.desdeCache}
                  onPress={cancelar}
                />
              ) : null}
              {esMia && tipo === 'permitida' ? (
                <Texto variante="chico" suave centrado>Se puede cancelar sin aviso hasta las {hastaTexto}.</Texto>
              ) : esMia && tipo === 'fuera_de_plazo' ? (
                <View style={[estilos.aviso, { backgroundColor: colores.advertenciaFondo }]}>
                  <Icono nombre="call-outline" color={colores.advertencia} />
                  <Texto color={colores.advertencia} style={{ flex: 1 }}>
                    Ya pasó el límite de las {hastaTexto}. Faltan menos de cuatro horas: avisale al encargado para cancelar (queda registrada como cancelación tardía).
                  </Texto>
                </View>
              ) : null}
              {estado.desdeCache && puedeCancelar ? <Texto variante="chico" color={colores.advertencia} centrado>Para cancelar necesitás conexión.</Texto> : null}
            </>
          ) : null}
          {!esMia && esStaff ? <FilaDato icono="briefcase-outline" texto="Vista del personal: si cancelás fuera de plazo, cuenta como cancelación tardía del jugador." /> : null}
        </Tarjeta>
      </ScrollView>
    </View>
  );
}

export default function PantallaReserva() {
  return (
    <RequiereSesion mensaje="Ingresá para ver tu reserva.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exito: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, padding: espaciado.m, borderRadius: radio.m },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, padding: espaciado.m, borderRadius: radio.m },
});
