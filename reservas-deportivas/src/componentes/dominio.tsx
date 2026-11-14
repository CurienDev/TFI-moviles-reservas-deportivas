import { Image } from 'expo-image';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { memo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { Deporte, Espacio, EstadoReserva, Turno } from '../tipos';
import { useTema } from '../contexto/TemaContext';
import { fechaCorta, fechaRelativa, precioATexto, sumarDias } from '../logica/fechas';
import { estaDescargado, fuenteMedio, guardarMediosSinConexion } from '../servicios/medios';
import { espaciado, radio, type Paleta } from '../tema/colores';
import { Boton, Etiqueta, Icono, Tarjeta, Texto } from './base';
import { complejoDe, unir } from '../logica/complejos';

export function ImagenEspacio({ uri, alto = 160, icono = 'image-outline', redondeo = radio.m }: { uri: string | undefined; alto?: number; icono?: string; redondeo?: number }) {
  const { colores } = useTema();
  const [fallo, setFallo] = useState(false);
  const fuente = uri ? fuenteMedio(uri) : null;
  if (!fuente || fallo) {
    return (
      <View style={[est.imagenVacia, { height: alto, backgroundColor: colores.superficieAlta, borderRadius: redondeo }]}>
        <Icono nombre={icono} tam={40} color={colores.textoSuave} />
        <Texto variante="chico" suave>{fallo ? 'Foto no disponible sin conexión' : 'Sin foto'}</Texto>
      </View>
    );
  }
  return (
    <Image
      source={fuente}
      style={{ width: '100%', height: alto, borderRadius: redondeo }}
      contentFit="cover"
      cachePolicy="disk"
      transition={200}
      onError={() => setFallo(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

export const TarjetaEspacio = memo(function TarjetaEspacio({
  espacio, deporte, distanciaKm, onPress, favorito,
}: { espacio: Espacio; deporte: Deporte | undefined; distanciaKm: number | null; onPress: () => void; favorito: boolean }) {
  const { colores } = useTema();
  return (
    <Tarjeta style={{ padding: 0, overflow: 'hidden' }} onPress={onPress} accesibilidad={unir([espacio.nombre, deporte?.nombre, complejoDe(espacio)], ', ')}>
      <ImagenEspacio uri={espacio.imagenes[0]} alto={150} icono={deporte?.icono} redondeo={0} />
      <View style={{ padding: espaciado.m, gap: 6 }}>
        <View style={est.fila}>
          <Texto variante="subtitulo" style={{ flex: 1 }} lineas={1}>{espacio.nombre}</Texto>
          {favorito ? <Icono nombre="star" tam={20} color="#F5B400" /> : null}
        </View>
        {complejoDe(espacio) || distanciaKm !== null ? (
          <Texto suave variante="chico">{unir([complejoDe(espacio), distanciaKm !== null && `a ${distanciaKm.toFixed(1)} km`])}</Texto>
        ) : null}
        <View style={[est.fila, { flexWrap: 'wrap', gap: 6 }]}>
          {deporte ? <Etiqueta texto={deporte.nombre} icono={deporte.icono} color="#FFFFFF" fondo={deporte.color} /> : null}
          <Etiqueta texto={espacio.superficie} icono="layers-outline" color={colores.texto} fondo={colores.superficieAlta} />
          <Etiqueta
            texto={espacio.iluminacion ? 'Con luz' : 'Sin luz'}
            icono={espacio.iluminacion ? 'bulb' : 'bulb-outline'}
            color={espacio.iluminacion ? colores.advertencia : colores.textoSuave}
            fondo={espacio.iluminacion ? colores.advertenciaFondo : colores.superficieAlta}
          />
          {espacio.techado ? <Etiqueta texto="Techado" icono="home-outline" color={colores.texto} fondo={colores.superficieAlta} /> : null}
          {espacio.videoUrl ? <Etiqueta texto="Video" icono="videocam-outline" color={colores.texto} fondo={colores.superficieAlta} /> : null}
        </View>
        <Texto variante="chico" style={{ fontWeight: '700' }}>{precioATexto(espacio.precioPorHora)} por hora</Texto>
      </View>
    </Tarjeta>
  );
});

export function Galeria({ imagenes, icono }: { imagenes: string[]; icono?: string }) {
  const { width } = useWindowDimensions();
  const { colores } = useTema();
  const [indice, setIndice] = useState(0);
  if (imagenes.length === 0) return <ImagenEspacio uri={undefined} alto={230} icono={icono} redondeo={0} />;
  return (
    <View>
      <FlatList
        data={imagenes}
        keyExtractor={(uri) => uri}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <ImagenEspacio uri={item} alto={230} icono={icono} redondeo={0} />
          </View>
        )}
      />
      {imagenes.length > 1 ? (
        <View style={est.puntos} accessibilityLabel={`Foto ${indice + 1} de ${imagenes.length}`}>
          {imagenes.map((uri, i) => (
            <View key={uri} style={[est.punto, { backgroundColor: i === indice ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }]} />
          ))}
        </View>
      ) : null}
      <View style={[est.contador, { backgroundColor: colores.oscuro ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)' }]}>
        <Texto variante="chico" color="#FFFFFF">{indice + 1}/{imagenes.length}</Texto>
      </View>
    </View>
  );
}

function ReproductorVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(fuenteMedio(uri), (p) => {
    p.loop = false;
    p.muted = true;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { colores } = useTema();
  return (
    <View>
      <VideoView player={player} style={est.video} nativeControls contentFit="contain" />
      {status === 'error' ? (
        <View style={[est.videoError, { backgroundColor: colores.peligroFondo }]}>
          <Icono nombre="alert-circle-outline" color={colores.peligro} tam={18} />
          <Texto variante="chico" color={colores.peligro} style={{ flex: 1 }}>
            No se pudo reproducir el video. Revisá la conexión o guardalo cuando tengas Wi-Fi.
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

export function VideoCancha({ espacio }: { espacio: Espacio }) {
  const { colores } = useTema();
  const [version, setVersion] = useState(0);
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  if (!espacio.videoUrl) {
    return (
      <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: espaciado.s }}>
        <Icono nombre="videocam-off-outline" color={colores.textoSuave} />
        <Texto suave style={{ flex: 1 }}>Este espacio todavía no tiene video del recorrido.</Texto>
      </Tarjeta>
    );
  }
  const guardado = estaDescargado(espacio.videoUrl);
  return (
    <View style={{ gap: espaciado.s }}>
      <ReproductorVideo key={version} uri={espacio.videoUrl} />
      {guardado ? (
        <View style={est.fila}>
          <Icono nombre="checkmark-circle" color={colores.exito} tam={18} />
          <Texto variante="chico" color={colores.exito}>  Video guardado en el teléfono: se ve sin datos.</Texto>
        </View>
      ) : (
        <Boton
          titulo="Guardar el video para ver sin datos"
          icono="download-outline"
          variante="secundario"
          cargando={descargando}
          onPress={async () => {
            setDescargando(true);
            setMensaje(null);
            const r = await guardarMediosSinConexion([espacio], true);
            setDescargando(false);
            setMensaje(r.errores > 0 ? 'No se pudo descargar. Probá de nuevo con conexión.' : 'Listo: ya lo podés ver sin datos.');
            setVersion((v) => v + 1);
          }}
        />
      )}
      {mensaje ? <Texto variante="chico" suave>{mensaje}</Texto> : null}
    </View>
  );
}

export function QrReserva({ codigo, apagado }: { codigo: string; apagado?: boolean }) {
  const { width } = useWindowDimensions();
  const tam = Math.min(260, width - 120);
  return (
    <View style={[est.qrMarco, apagado && { opacity: 0.25 }]} accessibilityLabel={`Código QR de ingreso ${codigo}`}>
      {/* El QR siempre va negro sobre blanco para que la cámara lo lea aun en modo oscuro. */}
      <QRCode value={codigo} size={tam} color="#000000" backgroundColor="#FFFFFF" ecl="M" />
    </View>
  );
}

export function SelectorDia({ dias, valor, onCambiar, ahora }: { dias: string[]; valor: string; onCambiar: (d: string) => void; ahora: Date }) {
  const { colores } = useTema();
  const i = dias.indexOf(valor);
  return (
    <View style={[est.selectorDia, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Día anterior"
        disabled={i <= 0}
        onPress={() => onCambiar(dias[i - 1])}
        style={({ pressed }) => [est.flecha, { opacity: i <= 0 ? 0.3 : pressed ? 0.6 : 1 }]}
      >
        <Icono nombre="chevron-back" tam={26} color={colores.primario} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
        {dias.map((d) => {
          const activo = d === valor;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={fechaRelativa(d, ahora)}
              onPress={() => onCambiar(d)}
              style={[est.dia, { backgroundColor: activo ? colores.primario : colores.superficieAlta }]}
            >
              <Texto variante="chico" color={activo ? colores.primarioTexto : colores.textoSuave} style={{ fontWeight: '600' }}>
                {fechaRelativa(d, ahora) === 'Hoy' || fechaRelativa(d, ahora) === 'Mañana' ? fechaRelativa(d, ahora) : fechaCorta(d).split(' ')[0]}
              </Texto>
              <Texto variante="subtitulo" color={activo ? colores.primarioTexto : colores.texto}>{d.slice(8, 10)}</Texto>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Día siguiente"
        disabled={i >= dias.length - 1}
        onPress={() => onCambiar(dias[i + 1])}
        style={({ pressed }) => [est.flecha, { opacity: i >= dias.length - 1 ? 0.3 : pressed ? 0.6 : 1 }]}
      >
        <Icono nombre="chevron-forward" tam={26} color={colores.primario} />
      </Pressable>
    </View>
  );
}

export function rangoDias(desde: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => sumarDias(desde, i));
}

export function estiloEstado(turno: Turno, pasado: boolean, c: Paleta) {
  if (turno.estado === 'mantenimiento') return { texto: 'MANTENIMIENTO', icono: 'construct-outline', color: c.mantenimiento, fondo: c.mantenimientoFondo };
  if (turno.estado === 'fijo') return { texto: 'FIJO', icono: 'repeat-outline', color: c.fijo, fondo: c.fijoFondo };
  if (turno.estado === 'reservado') return { texto: 'OCUPADO', icono: 'lock-closed-outline', color: c.ocupado, fondo: c.ocupadoFondo };
  if (pasado) return { texto: 'Ya pasó', icono: 'time-outline', color: c.pasado, fondo: 'transparent' };
  return { texto: 'Libre', icono: 'checkmark-circle-outline', color: c.libre, fondo: c.libreFondo };
}

export const FilaTurno = memo(function FilaTurno({
  turno, pasado, seleccionado, onPress, esMia, titularFija,
}: { turno: Turno; pasado: boolean; seleccionado: boolean; onPress: () => void; esMia: boolean; titularFija?: string | null }) {
  const { colores } = useTema();
  const e = estiloEstado(turno, pasado, colores);
  const reservable = turno.estado === 'libre' && !pasado;
  const detalle =
    turno.estado === 'fijo' ? titularFija ?? 'Reserva fija semanal' :
    turno.estado === 'mantenimiento' ? turno.motivoBloqueo :
    esMia ? 'Tu reserva' : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !reservable, selected: seleccionado }}
      accessibilityLabel={`${turno.inicio} a ${turno.fin}, ${e.texto}${detalle ? `, ${detalle}` : ''}${reservable ? `, ${precioATexto(turno.precio)}` : ''}`}
      disabled={!reservable}
      onPress={onPress}
      style={({ pressed }) => [
        est.filaTurno,
        {
          backgroundColor: seleccionado ? colores.superficieAlta : colores.superficie,
          borderColor: seleccionado ? colores.seleccion : colores.borde,
          borderWidth: seleccionado ? 2 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Texto variante="subtitulo" color={pasado ? colores.pasado : colores.texto} style={{ width: 64 }}>{turno.inicio}</Texto>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={[est.estadoPill, { backgroundColor: e.fondo }]}>
          <Icono nombre={e.icono} tam={16} color={e.color} />
          <Texto variante="chico" color={e.color} style={{ fontWeight: '700' }}>{e.texto}</Texto>
        </View>
        {detalle ? <Texto variante="chico" suave lineas={1}>{detalle}</Texto> : null}
      </View>
      {reservable ? <Texto style={{ fontWeight: '700' }} color={colores.libre}>{precioATexto(turno.precio)}</Texto> : null}
      {esMia ? <Icono nombre="person-circle" color={colores.primario} /> : null}
    </Pressable>
  );
});

export function Leyenda() {
  const { colores } = useTema();
  const items = [
    { t: 'Libre', i: 'checkmark-circle-outline', c: colores.libre },
    { t: 'Ocupado', i: 'lock-closed-outline', c: colores.ocupado },
    { t: 'Fijo', i: 'repeat-outline', c: colores.fijo },
    { t: 'Mantenimiento', i: 'construct-outline', c: colores.mantenimiento },
  ];
  return (
    <View style={[est.fila, { flexWrap: 'wrap', gap: espaciado.m }]}>
      {items.map((x) => (
        <View key={x.t} style={[est.fila, { gap: 4 }]}>
          <Icono nombre={x.i} tam={14} color={x.c} />
          <Texto variante="chico" suave>{x.t}</Texto>
        </View>
      ))}
    </View>
  );
}

export function estiloReserva(estado: EstadoReserva, c: Paleta) {
  switch (estado) {
    case 'confirmada': return { texto: 'Confirmada', icono: 'checkmark-circle-outline', color: c.exito, fondo: c.exitoFondo };
    case 'cumplida': return { texto: 'Asistió', icono: 'flag-outline', color: c.fijo, fondo: c.fijoFondo };
    case 'ausente': return { texto: 'No se presentó', icono: 'close-circle-outline', color: c.advertencia, fondo: c.advertenciaFondo };
    case 'cancelada': return { texto: 'Cancelada', icono: 'ban-outline', color: c.peligro, fondo: c.peligroFondo };
  }
}

const est = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  imagenVacia: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 6 },
  puntos: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  contador: { position: 'absolute', top: 10, right: 10, borderRadius: radio.pill, paddingHorizontal: 8, paddingVertical: 2 },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: radio.m, backgroundColor: '#000' },
  videoError: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: espaciado.s, borderRadius: radio.s, marginTop: 6 },
  qrMarco: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: radio.l, alignSelf: 'center' },
  selectorDia: { flexDirection: 'row', alignItems: 'center', borderRadius: radio.l, borderWidth: StyleSheet.hairlineWidth },
  flecha: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dia: { alignItems: 'center', justifyContent: 'center', borderRadius: radio.m, paddingHorizontal: 12, paddingVertical: 6, minWidth: 58 },
  filaTurno: {
    flexDirection: 'row', alignItems: 'center', gap: espaciado.m, paddingHorizontal: espaciado.m,
    minHeight: 58, borderRadius: radio.m, marginBottom: 6,
  },
  estadoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: radio.pill, paddingHorizontal: 8, paddingVertical: 2 },
});
