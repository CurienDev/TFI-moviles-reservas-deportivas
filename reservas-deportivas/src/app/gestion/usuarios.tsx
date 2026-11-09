import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Boton, Cargando, Etiqueta, FilaDato, Tarjeta, Texto, Vacio, VistaError } from '../../componentes/base';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useTema } from '../../contexto/TemaContext';
import { proximosDias } from '../../logica/fechas';
import { UMBRAL_MARCA, estaMarcado } from '../../logica/reglas';
import { reservasDelDia } from '../../servicios/reservas';
import { obtenerUsuario } from '../../servicios/usuarios';
import type { Resultado, Usuario } from '../../tipos';
import { espaciado } from '../../tema/colores';
import { llamar } from '../../utilidades/navegacion';
import { useCarga } from '../../utilidades/useCarga';

/**
 * Jugadores con reservas en los próximos siete días, con sus cancelaciones tardías y
 * ausencias. La API no tiene un listado de usuarios: se arma con GET /reservas?fecha= y
 * GET /usuarios/<id>. Es solo informativo (el PRD no pide sanciones todavía).
 */
async function jugadoresDeLaSemana(): Promise<Resultado<Usuario[]>> {
  const ids = new Set<string>();
  for (const fecha of proximosDias(new Date())) {
    const r = await reservasDelDia(fecha);
    if (!r.ok) return r;
    r.datos.forEach((x) => ids.add(x.usuarioId));
  }
  const usuarios: Usuario[] = [];
  for (const id of ids) {
    const u = await obtenerUsuario(id);
    if (u.ok) usuarios.push(u.datos);
  }
  usuarios.sort((a, b) => b.cancelacionesTardias - a.cancelacionesTardias || b.ausencias - a.ausencias || a.nombre.localeCompare(b.nombre));
  return { ok: true, datos: usuarios, meta: null, desdeCache: false };
}

function Contenido() {
  const { colores } = useTema();
  const { estado, recargar, refrescando, reintentar } = useCarga(jugadoresDeLaSemana);
  if (estado.tipo === 'cargando') return <Cargando mensaje="Buscando jugadores…" />;
  if (estado.tipo === 'error') return <VistaError mensaje={estado.error.mensaje} onReintentar={reintentar} />;
  return (
    <FlatList
      data={estado.datos}
      keyExtractor={(u) => u.id}
      contentContainerStyle={{ padding: espaciado.l, gap: espaciado.s, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} colors={[colores.primario]} />}
      ListHeaderComponent={
        <Texto suave variante="chico">
          Jugadores con reservas en los próximos siete días. Se marca a quien acumula {UMBRAL_MARCA} o más cancelaciones tardías; por ahora es solo informativo.
        </Texto>
      }
      ListEmptyComponent={<Vacio mensaje="No hay reservas de jugadores en los próximos siete días." icono="people-outline" />}
      renderItem={({ item }) => (
        <Tarjeta style={{ gap: 4 }}>
          <View style={estilos.fila}>
            <Texto style={{ flex: 1, fontWeight: '700' }}>{item.nombre}</Texto>
            {estaMarcado(item) ? <Etiqueta texto="Marcado" icono="flag" color={colores.advertencia} fondo={colores.advertenciaFondo} /> : null}
          </View>
          <Texto variante="chico" suave>{item.email}</Texto>
          <FilaDato icono="time-outline" texto={`Cancelaciones tardías: ${item.cancelacionesTardias}`} color={estaMarcado(item) ? colores.advertencia : undefined} />
          <FilaDato icono="person-remove-outline" texto={`Ausencias: ${item.ausencias}`} />
          <Boton titulo={item.telefono} icono="call-outline" variante="texto" style={{ alignSelf: 'flex-start' }} onPress={() => llamar(item.telefono)} />
        </Tarjeta>
      )}
    />
  );
}

export default function PantallaUsuarios() {
  return (
    <RequiereSesion staff mensaje="Ingresá como encargado o administrador.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
});
