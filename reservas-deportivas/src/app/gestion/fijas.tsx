import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Cargando, Etiqueta, Icono, Tarjeta, Texto, Vacio, VistaError } from '../../componentes/base';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { nombreDia } from '../../logica/fechas';
import { listarFijas } from '../../servicios/reservas';
import { espaciado } from '../../tema/colores';
import { useCarga } from '../../utilidades/useCarga';

/** Reservas fijas: reglas que ocupan el mismo turno todas las semanas. */
function Contenido() {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { espacio } = useCatalogo();
  const { esAdmin } = useSesion();
  const { estado, recargar, refrescando, reintentar } = useCarga(listarFijas);

  const secciones = useMemo(() => {
    if (estado.tipo !== 'exito') return [];
    const grupos: Record<string, typeof estado.datos> = {};
    for (const f of estado.datos) (grupos[f.espacioId] ??= []).push(f);
    return Object.keys(grupos).sort().map((id) => ({
      titulo: espacio(id)?.nombre ?? id,
      data: grupos[id].sort((a, b) => ((a.dia + 6) % 7) - ((b.dia + 6) % 7) || a.inicio.localeCompare(b.inicio)),
    }));
  }, [estado, espacio]);

  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <VistaError mensaje={estado.error.mensaje} onReintentar={reintentar} />;

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        sections={secciones}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: espaciado.l, gap: espaciado.s, paddingBottom: 100 + insets.bottom, flexGrow: 1 }}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} colors={[colores.primario]} />}
        ListHeaderComponent={
          <Texto suave variante="chico">
            Una fija no es un turno: es una regla. Ocupa el horario todas las semanas entre «desde» y «hasta», sin que nadie reserve cada vez. Solo el administrador las carga y edita.
          </Texto>
        }
        ListEmptyComponent={<Vacio mensaje="No hay reservas fijas." icono="repeat-outline" />}
        renderSectionHeader={({ section }) => <Texto variante="subtitulo" style={{ marginTop: espaciado.m }}>{section.titulo}</Texto>}
        renderItem={({ item }) => (
          <Tarjeta onPress={() => router.push({ pathname: '/gestion/fija', params: { id: item.id } })} accesibilidad={`${item.titular}, ${nombreDia(item.dia)} de ${item.inicio} a ${item.fin}`}>
            <View style={estilos.fila}>
              <Icono nombre="repeat-outline" color={item.activa ? colores.fijo : colores.pasado} />
              <View style={{ flex: 1, gap: 2 }}>
                <Texto style={{ fontWeight: '700' }}>{item.titular}</Texto>
                <Texto>Todos los {plural(nombreDia(item.dia).toLowerCase())} · {item.inicio} a {item.fin}</Texto>
                <Texto variante="chico" suave>Desde {item.desde.split('-').reverse().join('/')}{item.hasta ? ` hasta ${item.hasta.split('-').reverse().join('/')}` : ' · sin fecha de fin'}</Texto>
              </View>
              {!item.activa ? <Etiqueta texto="Inactiva" color={colores.textoSuave} fondo={colores.superficieAlta} /> : null}
            </View>
          </Tarjeta>
        )}
      />
      {esAdmin ? (
        <View style={[estilos.barra, { paddingBottom: espaciado.m + insets.bottom, backgroundColor: colores.superficie, borderTopColor: colores.borde }]}>
          <Boton titulo="Nueva reserva fija" icono="add-circle-outline" grande onPress={() => router.push('/gestion/fija')} />
        </View>
      ) : null}
    </View>
  );
}

export default function PantallaFijas() {
  return (
    <RequiereSesion staff mensaje="Ingresá como encargado o administrador.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: espaciado.m, borderTopWidth: StyleSheet.hairlineWidth },
});

/** lunes → lunes, sábado → sábados, domingo → domingos. */
function plural(dia: string): string {
  return dia.endsWith('s') ? dia : `${dia}s`;
}
