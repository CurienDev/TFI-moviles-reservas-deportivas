import { Camera, Map, NativeUserLocation, ViewAnnotation, type CameraRef, type StyleSpecification } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Boton, Cargando, Icono, Tarjeta, Texto, VistaError } from '../../componentes/base';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useTema } from '../../contexto/TemaContext';
import type { Coordenadas, Espacio } from '../../tipos';
import { distanciaKm } from '../../servicios/espacios';
import { lugarDe } from '../../logica/complejos';
import { espaciado, radio } from '../../tema/colores';
import { abrirComoLlegar } from '../../utilidades/navegacion';
import { useUbicacion } from '../../utilidades/useUbicacion';

const CENTRO_VILLAGUAY: [number, number] = [-59.0262, -31.8635];

function estiloMapa(oscuro: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      { id: 'fondo', type: 'background', paint: { 'background-color': oscuro ? '#0B0C12' : '#F2EFE9' } },
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        paint: oscuro ? { 'raster-brightness-max': 0.55, 'raster-saturation': -0.4, 'raster-contrast': 0.1 } : {},
      },
    ],
  };
}

interface Complejo {
  nombre: string;
  coordenadas: Coordenadas;
  espacios: Espacio[];
}

// MapLibre + OpenStreetMap: no necesita clave de Google.
export default function PantallaMapa() {
  const { colores } = useTema();
  const { estado, recargar, deporte } = useCatalogo();
  const ubicacion = useUbicacion(true);
  const camara = useRef<CameraRef>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const complejos = useMemo<Complejo[]>(() => {
    if (estado.tipo !== 'exito') return [];
    const mapa: Record<string, Espacio[]> = {};
    for (const e of estado.datos.espacios) (mapa[lugarDe(e)] ??= []).push(e);
    return Object.entries(mapa).map(([nombre, espacios]) => ({
      nombre,
      espacios,
      coordenadas: {
        latitud: espacios.reduce((s, e) => s + e.coordenadas.latitud, 0) / espacios.length,
        longitud: espacios.reduce((s, e) => s + e.coordenadas.longitud, 0) / espacios.length,
      },
    }));
  }, [estado]);

  const coords = ubicacion.estado.tipo === 'concedida' ? ubicacion.estado.coords : null;
  const cercano = useMemo(() => {
    if (!coords || complejos.length === 0) return null;
    return [...complejos].sort((a, b) => distanciaKm(coords, a.coordenadas) - distanciaKm(coords, b.coordenadas))[0];
  }, [coords, complejos]);

  if (estado.tipo === 'cargando') return <Cargando mensaje="Cargando mapa…" />;
  if (estado.tipo === 'error') return <VistaError mensaje={estado.error.mensaje} onReintentar={recargar} />;

  const elegido = complejos.find((c) => c.nombre === seleccion) ?? null;

  const enfocar = (c: Complejo) => {
    setSeleccion(c.nombre);
    camara.current?.flyTo({ center: [c.coordenadas.longitud, c.coordenadas.latitud], zoom: 16, duration: 800 });
  };

  return (
    <View style={{ flex: 1 }}>
      <Map
        style={{ flex: 1 }}
        mapStyle={estiloMapa(colores.oscuro)}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8, left: 8 }}
        compass
        onPress={() => setSeleccion(null)}
      >
        <Camera ref={camara} initialViewState={{ center: CENTRO_VILLAGUAY, zoom: 14 }} />
        {coords ? <NativeUserLocation /> : null}
        {complejos.map((c) => (
          <ViewAnnotation
            key={c.nombre}
            id={c.nombre}
            lngLat={[c.coordenadas.longitud, c.coordenadas.latitud]}
            anchor="bottom"
            onPress={() => enfocar(c)}
          >
            <View style={estilos.marcadorContenedor}>
              <View style={[estilos.marcador, { backgroundColor: seleccion === c.nombre ? colores.peligro : colores.primario }]}>
                <Icono nombre="location" tam={22} color="#FFFFFF" />
                <Texto variante="chico" color="#FFFFFF" style={{ fontWeight: '700' }}>{c.espacios.length}</Texto>
              </View>
            </View>
          </ViewAnnotation>
        ))}
      </Map>

      <View style={[estilos.atribucion, { backgroundColor: colores.superficie }]} pointerEvents="none">
        <Texto variante="chico" suave>© OpenStreetMap</Texto>
      </View>

      <View style={estilos.panel} pointerEvents="box-none">
        {ubicacion.estado.tipo === 'denegada' ? (
          <Tarjeta style={estilos.aviso}>
            <Texto variante="chico">Sin permiso de ubicación: el mapa funciona igual, pero no podemos marcar dónde estás ni el complejo más cercano.</Texto>
          </Tarjeta>
        ) : null}
        {cercano && !elegido ? (
          <Tarjeta onPress={() => enfocar(cercano)} style={estilos.aviso} accesibilidad={`Complejo más cercano: ${cercano.nombre}`}>
            <View style={estilos.fila}>
              <Icono nombre="navigate-circle" color={colores.primario} />
              <Texto style={{ flex: 1 }}>
                Más cerca: <Texto style={{ fontWeight: '700' }}>{cercano.nombre}</Texto> · {distanciaKm(coords!, cercano.coordenadas).toFixed(1)} km
              </Texto>
            </View>
          </Tarjeta>
        ) : null}
        {!elegido ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espaciado.s, paddingHorizontal: espaciado.l }}>
            {complejos.map((c) => (
              <Pressable key={c.nombre} onPress={() => enfocar(c)} style={[estilos.pildora, { backgroundColor: colores.superficie, borderColor: colores.borde }]}>
                <Icono nombre="business-outline" tam={16} color={colores.primario} />
                <Texto variante="chico" style={{ fontWeight: '600' }}>{c.nombre}</Texto>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Tarjeta style={{ marginHorizontal: espaciado.l, gap: espaciado.s }}>
            <View style={estilos.fila}>
              <Texto variante="subtitulo" style={{ flex: 1 }}>{elegido.nombre}</Texto>
              <Pressable accessibilityLabel="Cerrar" onPress={() => setSeleccion(null)} hitSlop={12}>
                <Icono nombre="close" color={colores.textoSuave} />
              </Pressable>
            </View>
            {coords ? <Texto variante="chico" suave>A {distanciaKm(coords, elegido.coordenadas).toFixed(1)} km de tu ubicación</Texto> : null}
            <ScrollView style={{ maxHeight: 170 }}>
              {elegido.espacios.map((e) => (
                <Pressable key={e.id} onPress={() => router.push(`/espacio/${e.id}`)} style={({ pressed }) => [estilos.filaEspacio, { opacity: pressed ? 0.6 : 1, borderColor: colores.borde }]}>
                  <Icono nombre={deporte(e.deporteId)?.icono ?? 'ellipse-outline'} color={deporte(e.deporteId)?.color} tam={20} />
                  <Texto style={{ flex: 1 }}>{e.nombre}</Texto>
                  <Icono nombre="chevron-forward" tam={18} color={colores.textoSuave} />
                </Pressable>
              ))}
            </ScrollView>
            <Boton titulo="Cómo llegar" icono="navigate-outline" onPress={() => abrirComoLlegar(elegido.coordenadas, elegido.nombre)} />
          </Tarjeta>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  marcadorContenedor: { alignItems: 'center' },
  marcador: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radio.pill, borderWidth: 2, borderColor: '#FFFFFF' },
  panel: { position: 'absolute', left: 0, right: 0, bottom: espaciado.l, gap: espaciado.s },
  aviso: { marginHorizontal: espaciado.l, padding: espaciado.m },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: radio.pill, borderWidth: 1 },
  filaEspacio: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  atribucion: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, borderRadius: 6, opacity: 0.85 },
});
