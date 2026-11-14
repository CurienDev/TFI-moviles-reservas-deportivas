import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Boton, Icono, Tarjeta, Texto, Vacio } from '../../componentes/base';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { fechaRelativa, horaDeIso } from '../../logica/fechas';
import { parseIdTurno } from '../../logica/grilla';
import { marcarLeido, marcarTodosLeidos } from '../../servicios/avisos';
import type { Aviso, TipoAviso } from '../../tipos';
import { espaciado } from '../../tema/colores';

const ICONOS: Record<TipoAviso, string> = {
  suspension: 'rainy-outline',
  turno_liberado: 'star-outline',
};

function Contenido() {
  const { colores } = useTema();
  const { usuario, avisos, sincronizar, recargarAvisos } = useSesion();
  const [refrescando, setRefrescando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void recargarAvisos();
    }, [recargarAvisos]),
  );

  const abrir = async (a: Aviso) => {
    if (!a.leido) {
      await marcarLeido(a);
      await recargarAvisos();
    }
    if (a.tipo === 'turno_liberado' && a.espacioId) {
      const fecha = a.turnoId ? parseIdTurno(a.turnoId)?.fecha : undefined;
      router.push({ pathname: '/disponibilidad/[id]', params: { id: a.espacioId, ...(fecha ? { fecha } : {}) } });
    } else if (a.reservaId) {
      router.push(`/reserva/${a.reservaId}`);
    }
  };

  return (
    <FlatList
      data={avisos}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: espaciado.l, gap: espaciado.s, flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          colors={[colores.primario]}
          onRefresh={async () => {
            setRefrescando(true);
            await sincronizar({ revisarFavoritos: true });
            setRefrescando(false);
          }}
        />
      }
      ListHeaderComponent={
        avisos.some((a) => !a.leido) ? (
          <Boton
            titulo="Marcar todos como leídos"
            icono="checkmark-done-outline"
            variante="texto"
            style={{ alignSelf: 'flex-end' }}
            onPress={async () => {
              await marcarTodosLeidos(usuario!.id);
              await recargarAvisos();
            }}
          />
        ) : null
      }
      ListEmptyComponent={
        <Vacio
          mensaje={
            usuario?.rol === 'jugador'
              ? 'No tenés avisos. Te avisamos si se suspende un turno tuyo o si se libera uno de tus espacios favoritos.'
              : 'No hay avisos.'
          }
          icono="notifications-off-outline"
        />
      }
      renderItem={({ item }) => (
        <Tarjeta onPress={() => abrir(item)} style={!item.leido && { borderColor: colores.primario, borderWidth: 1.5 }} accesibilidad={`${item.leido ? '' : 'Nuevo. '}${item.titulo}. ${item.mensaje}`}>
          <View style={estilos.fila}>
            <Icono nombre={ICONOS[item.tipo]} color={item.tipo === 'suspension' ? colores.peligro : colores.primario} />
            <View style={{ flex: 1, gap: 4 }}>
              <Texto variante="subtitulo">{item.titulo}</Texto>
              <Texto>{item.mensaje}</Texto>
              <Texto variante="chico" suave>{fechaRelativa(item.creadoEn.slice(0, 10), new Date())} · {horaDeIso(item.creadoEn)}</Texto>
            </View>
            {!item.leido ? <View style={[estilos.punto, { backgroundColor: colores.primario }]} /> : null}
          </View>
        </Tarjeta>
      )}
    />
  );
}

export default function PantallaAvisos() {
  return (
    <RequiereSesion mensaje="Ingresá para recibir avisos de suspensiones y de turnos liberados en tus favoritos.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: espaciado.m, alignItems: 'flex-start' },
  punto: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});
