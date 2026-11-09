import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { BannerCache, Boton, Cargando, Etiqueta, Icono, Tarjeta, Texto, Vacio, VistaError } from '../../componentes/base';
import { estiloReserva } from '../../componentes/dominio';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { fechaRelativa, precioATexto, rangoHorario } from '../../logica/fechas';
import { MAX_RESERVAS_ACTIVAS, esReservaActiva } from '../../logica/reglas';
import { misReservas } from '../../servicios/reservas';
import { espaciado } from '../../tema/colores';
import { useCarga } from '../../utilidades/useCarga';
import { complejoDe, unir } from '../../logica/complejos';

function Contenido() {
  const { colores } = useTema();
  const { usuario } = useSesion();
  const { deporte } = useCatalogo();
  const { estado, recargar, refrescando, reintentar } = useCarga(() => misReservas(usuario!.id), [usuario!.id]);

  const secciones = useMemo(() => {
    if (estado.tipo !== 'exito') return [];
    const ahora = new Date();
    const clave = (d: { fecha: string; inicio: string }) => d.fecha + d.inicio;
    const proximas = estado.datos.filter((d) => esReservaActiva(d.reserva, ahora)).sort((a, b) => clave(a).localeCompare(clave(b)));
    const pasadas = estado.datos.filter((d) => !esReservaActiva(d.reserva, ahora)).sort((a, b) => clave(b).localeCompare(clave(a)));
    return [
      { titulo: `Próximas (${proximas.length} de ${MAX_RESERVAS_ACTIVAS} activas)`, data: proximas, vacio: 'No tenés reservas próximas.' },
      { titulo: 'Pasadas y canceladas', data: pasadas, vacio: 'Todavía no hay historial.' },
    ];
  }, [estado]);

  if (estado.tipo === 'cargando') return <Cargando mensaje="Buscando tus reservas…" />;
  if (estado.tipo === 'error') return <VistaError mensaje={estado.error.mensaje} onReintentar={reintentar} />;

  return (
    <View style={{ flex: 1 }}>
      <BannerCache visible={estado.desdeCache} />
      <SectionList
        sections={secciones}
        keyExtractor={(d) => d.reserva.id}
        contentContainerStyle={{ padding: espaciado.l, gap: espaciado.s }}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} colors={[colores.primario]} />}
        renderSectionHeader={({ section }) => (
          <View style={{ marginTop: espaciado.m, marginBottom: espaciado.xs }}>
            <Texto variante="etiqueta" suave>{section.titulo}</Texto>
            {section.data.length === 0 ? <Texto suave variante="chico" style={{ marginTop: 6 }}>{section.vacio}</Texto> : null}
          </View>
        )}
        ListFooterComponent={
          estado.datos.length === 0 ? (
            <Vacio mensaje="Elegí un espacio y reservá un turno libre en dos toques." icono="calendar-outline">
              <Boton titulo="Ver espacios" icono="grid-outline" onPress={() => router.navigate('/')} />
            </Vacio>
          ) : null
        }
        renderItem={({ item }) => {
          const e = estiloReserva(item.reserva.estado, colores);
          const dep = item.espacio ? deporte(item.espacio.deporteId) : undefined;
          const nombre = item.espacio?.nombre ?? item.reserva.espacioId;
          const cuando = `${fechaRelativa(item.fecha, new Date())} ${rangoHorario(item.inicio, item.fin)}`;
          return (
            <Tarjeta onPress={() => router.push(`/reserva/${item.reserva.id}`)} accesibilidad={`${nombre}, ${cuando}, ${e.texto}`}>
              <View style={estilos.fila}>
                <View style={[estilos.icono, { backgroundColor: dep?.color ?? colores.primario }]}>
                  <Icono nombre={dep?.icono ?? 'calendar-outline'} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto variante="subtitulo" lineas={1}>{nombre}</Texto>
                  <Texto>{cuando}</Texto>
                  {item.espacio ? <Texto variante="chico" suave>{unir([complejoDe(item.espacio), precioATexto(item.espacio.precioPorHora)])}</Texto> : null}
                </View>
                <Icono nombre="qr-code-outline" color={item.reserva.estado === 'confirmada' ? colores.primario : colores.pasado} />
              </View>
              <View style={{ marginTop: espaciado.s }}>
                <Etiqueta texto={e.texto} icono={e.icono} color={e.color} fondo={e.fondo} />
              </View>
            </Tarjeta>
          );
        }}
      />
    </View>
  );
}

export default function PantallaMisReservas() {
  return (
    <RequiereSesion mensaje="Ingresá para ver tus reservas. Para mirar la disponibilidad no hace falta cuenta.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
