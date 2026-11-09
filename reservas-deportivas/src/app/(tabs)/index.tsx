import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BannerCache, Boton, Cargando, Chip, Icono, Texto, Vacio, VistaError } from '../../componentes/base';
import { TarjetaEspacio } from '../../componentes/dominio';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { distanciaKm } from '../../servicios/espacios';
import { lugarDe, nombreComplejo } from '../../logica/complejos';
import { espaciado } from '../../tema/colores';
import { useUbicacion } from '../../utilidades/useUbicacion';

/** Listado de los once espacios con filtros por deporte y por complejo. No requiere cuenta. */
export default function PantallaEspacios() {
  const { colores } = useTema();
  const { estado, recargar } = useCatalogo();
  const { usuario } = useSesion();
  const ubicacion = useUbicacion(false);
  const [deporte, setDeporte] = useState<string | null>(null);
  const [complejo, setComplejo] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const datos = estado.tipo === 'exito' ? estado.datos : null;
  const complejos = useMemo(() => [...new Set(datos?.espacios.map((e) => e.complejo) ?? [])], [datos]);
  const coords = ubicacion.estado.tipo === 'concedida' ? ubicacion.estado.coords : null;

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const lista = datos.espacios.filter((e) => (!deporte || e.deporteId === deporte) && (!complejo || e.complejo === complejo));
    if (!coords) return lista;
    return [...lista].sort((a, b) => distanciaKm(coords, a.coordenadas) - distanciaKm(coords, b.coordenadas));
  }, [datos, deporte, complejo, coords]);

  const masCercano = useMemo(() => {
    if (!coords || !datos) return null;
    let mejor: { nombre: string; km: number } | null = null;
    // Por lugar físico: los espacios sueltos («—») cuentan cada uno por su lado.
    for (const e of datos.espacios) {
      const km = distanciaKm(coords, e.coordenadas);
      if (!mejor || km < mejor.km) mejor = { nombre: lugarDe(e), km };
    }
    return mejor;
  }, [coords, datos]);

  if (estado.tipo === 'cargando') return <Cargando mensaje="Cargando espacios…" />;
  if (estado.tipo === 'error') return <VistaError mensaje={estado.error.mensaje} onReintentar={recargar} />;

  const cabecera = (
    <View style={{ gap: espaciado.s, marginBottom: espaciado.m }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        <Chip texto="Todos" activo={deporte === null} onPress={() => setDeporte(null)} icono="apps-outline" />
        {datos!.deportes.map((d) => (
          <Chip key={d.id} texto={d.nombre} icono={d.icono} color={d.color} activo={deporte === d.id} onPress={() => setDeporte(deporte === d.id ? null : d.id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        <Chip texto="Todos los complejos" activo={complejo === null} onPress={() => setComplejo(null)} icono="business-outline" />
        {complejos.map((c) => (
          <Chip key={c} texto={nombreComplejo(c)} activo={complejo === c} onPress={() => setComplejo(complejo === c ? null : c)} />
        ))}
      </ScrollView>
      {masCercano ? (
        <View style={[estilos.cercano, { backgroundColor: colores.superficieAlta }]}>
          <Icono nombre="navigate-circle-outline" color={colores.primario} />
          <Texto variante="chico" style={{ flex: 1 }}>
            Te queda más cerca: <Texto variante="chico" style={{ fontWeight: '700' }}>{masCercano.nombre}</Texto> (a {masCercano.km.toFixed(1)} km). Ordenado por distancia.
          </Texto>
        </View>
      ) : ubicacion.estado.tipo === 'sin_pedir' ? (
        <Boton titulo="Ver qué complejo me queda más cerca" icono="locate-outline" variante="texto" onPress={ubicacion.pedir} style={{ alignSelf: 'flex-start' }} />
      ) : ubicacion.estado.tipo === 'denegada' ? (
        <Texto variante="chico" suave>Sin permiso de ubicación: podés usar la app igual. Se usa solo para el mapa y la distancia.</Texto>
      ) : null}
      <Texto variante="chico" suave>{filtrados.length} {filtrados.length === 1 ? 'espacio' : 'espacios'}</Texto>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <BannerCache visible={estado.desdeCache} />
      <FlatList
        data={filtrados}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: espaciado.l, gap: espaciado.m }}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={<Vacio mensaje="No hay espacios con esos filtros." icono="search-outline" />}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            colors={[colores.primario]}
            onRefresh={async () => {
              setRefrescando(true);
              await recargar();
              setRefrescando(false);
            }}
          />
        }
        renderItem={({ item }) => (
          <TarjetaEspacio
            espacio={item}
            deporte={datos!.deportes.find((d) => d.id === item.deporteId)}
            distanciaKm={coords ? distanciaKm(coords, item.coordenadas) : null}
            favorito={!!usuario?.espaciosFavoritos.includes(item.id)}
            onPress={() => router.push(`/espacio/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  chips: { gap: espaciado.s, paddingRight: espaciado.l },
  cercano: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, padding: espaciado.m, borderRadius: 12 },
});
