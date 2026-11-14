import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerCache, Boton, Cargando, FilaDato, Separador, Tarjeta, Texto, VistaError } from '../../componentes/base';
import { BotonFavorito } from '../../componentes/BotonFavorito';
import { Galeria, ImagenEspacio, VideoCancha } from '../../componentes/dominio';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useTema } from '../../contexto/TemaContext';
import { fechaRelativa, horaDeIso, precioATexto } from '../../logica/fechas';
import { obtenerEspacio } from '../../servicios/espacios';
import { complejoDe, unir } from '../../logica/complejos';
import { fotosDeCancha } from '../../servicios/medios';
import type { FotoCancha } from '../../tipos';
import { espaciado } from '../../tema/colores';
import { abrirComoLlegar } from '../../utilidades/navegacion';
import { useCarga } from '../../utilidades/useCarga';

export default function PantallaEspacio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { deporte } = useCatalogo();
  const { estado, reintentar } = useCarga(() => obtenerEspacio(String(id)), [id]);
  const [fotos, setFotos] = useState<FotoCancha[]>([]);

  useEffect(() => {
    let vigente = true;
    void fotosDeCancha(String(id)).then((f) => {
      if (vigente) setFotos(f);
    });
    return () => {
      vigente = false;
    };
  }, [id]);

  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <VistaError mensaje={estado.error.mensaje} onReintentar={reintentar} />;

  const e = estado.datos;
  const dep = deporte(e.deporteId);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: e.nombre, headerRight: () => <BotonFavorito espacioId={e.id} /> }} />
      <BannerCache visible={estado.desdeCache} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <Galeria imagenes={e.imagenes} icono={dep?.icono} />
        <View style={{ padding: espaciado.l, gap: espaciado.l }}>
          <View style={{ gap: 4 }}>
            <Texto variante="titulo">{e.nombre}</Texto>
            <Texto suave>{unir([dep?.nombre, complejoDe(e)])}</Texto>
          </View>

          <Tarjeta style={estilos.precio}>
            <Texto variante="etiqueta" suave>Precio por hora</Texto>
            <Texto variante="titulo" color={colores.primario}>{precioATexto(e.precioPorHora)}</Texto>
            <Texto variante="chico" suave>Se paga en el lugar. La app no cobra.</Texto>
          </Tarjeta>

          <Tarjeta>
            <Texto variante="subtitulo" style={{ marginBottom: espaciado.s }}>Características</Texto>
            <FilaDato icono={dep?.icono ?? 'ellipse-outline'} texto={`Deporte: ${dep?.nombre ?? '—'}`} />
            <FilaDato icono="layers-outline" texto={`Superficie: ${e.superficie}`} />
            <FilaDato icono={e.techado ? 'home-outline' : 'partly-sunny-outline'} texto={e.techado ? 'Techado' : 'Al aire libre'} />
            <FilaDato
              icono={e.iluminacion ? 'bulb' : 'bulb-outline'}
              texto={e.iluminacion ? 'Con iluminación para jugar de noche' : 'Sin iluminación nocturna'}
              color={e.iluminacion ? colores.advertencia : undefined}
            />
            <FilaDato icono="people-outline" texto={`Capacidad: hasta ${e.capacidad} personas`} />
          </Tarjeta>

          <View style={{ gap: espaciado.s }}>
            <Texto variante="subtitulo">Recorrido en video</Texto>
            <VideoCancha espacio={e} />
          </View>

          {fotos.length > 0 ? (
            <View style={{ gap: espaciado.s }}>
              <Texto variante="subtitulo">Estado actual de la cancha</Texto>
              {fotos.slice(0, 3).map((f) => (
                <View key={f.id} style={{ gap: 4 }}>
                  <ImagenEspacio uri={f.uriLocal} alto={180} />
                  <Texto variante="chico" suave>Foto del {fechaRelativa(f.creadaEn.slice(0, 10), new Date()).toLowerCase()} a las {horaDeIso(f.creadaEn)}</Texto>
                </View>
              ))}
            </View>
          ) : null}

          <Tarjeta>
            <Texto variante="subtitulo" style={{ marginBottom: espaciado.s }}>Reglas del lugar</Texto>
            <Texto>{e.reglas}</Texto>
          </Tarjeta>

          <Tarjeta style={{ gap: espaciado.s }}>
            <Texto variante="subtitulo">Ubicación</Texto>
            <FilaDato icono="location-outline" texto={unir([complejoDe(e), 'Villaguay'], ', ')} />
            <Separador />
            <View style={{ flexDirection: 'row', gap: espaciado.s }}>
              <Boton titulo="Cómo llegar" icono="navigate-outline" variante="secundario" style={{ flex: 1 }} onPress={() => abrirComoLlegar(e.coordenadas, unir([e.nombre, complejoDe(e)], ' - '))} />
              <Boton titulo="Ver en el mapa" icono="map-outline" variante="secundario" style={{ flex: 1 }} onPress={() => router.navigate('/mapa')} />
            </View>
          </Tarjeta>
        </View>
      </ScrollView>
      <View style={[estilos.barra, { backgroundColor: colores.superficie, borderTopColor: colores.borde, paddingBottom: espaciado.m + insets.bottom }]}>
        <Boton titulo="Ver disponibilidad y reservar" icono="calendar-outline" grande onPress={() => router.push(`/disponibilidad/${e.id}`)} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  precio: { alignItems: 'flex-start', gap: 2 },
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: espaciado.m, borderTopWidth: StyleSheet.hairlineWidth },
});
