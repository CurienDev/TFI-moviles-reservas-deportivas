import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Cargando, Etiqueta, Icono, Texto, VistaError } from '../../componentes/base';
import { BotonFavorito } from '../../componentes/BotonFavorito';
import { FilaTurno, Leyenda, SelectorDia } from '../../componentes/dominio';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { fechaLarga, precioATexto, proximosDias, rangoHorario } from '../../logica/fechas';
import { fijaQueCubre } from '../../logica/grilla';
import { esTurnoPasado, validarCantidad } from '../../logica/reglas';
import { listarFijas, misReservasGuardadas, obtenerTurnos, reservar } from '../../servicios/reservas';
import type { Deporte, ReservaFija, Turno } from '../../tipos';
import { espaciado, radio } from '../../tema/colores';
import { useCarga } from '../../utilidades/useCarga';

export default function PantallaDisponibilidad() {
  const { id, fecha: fechaParam } = useLocalSearchParams<{ id: string; fecha?: string }>();
  const espacioId = String(id);
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const { usuario, esStaff, sincronizar } = useSesion();
  const { espacio: buscarEspacio, deporte } = useCatalogo();
  const espacio = buscarEspacio(espacioId);

  const [ahora, setAhora] = useState(() => new Date());
  const dias = useMemo(() => proximosDias(ahora), [ahora]);
  const [fecha, setFecha] = useState(() => (fechaParam && dias.includes(fechaParam) ? fechaParam : dias[0]));
  const [elegido, setElegido] = useState<Turno | null>(null);
  const [misIds, setMisIds] = useState<Set<string>>(new Set());
  const [fijas, setFijas] = useState<ReservaFija[]>([]);

  const { estado, recargar, refrescando, reintentar } = useCarga(() => obtenerTurnos(espacioId, fecha), [espacioId, fecha]);

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    void misReservasGuardadas(usuario.id).then((lista) => {
      if (vigente) setMisIds(new Set(lista.filter((r) => r.estado !== 'cancelada').map((r) => r.id)));
    });
    return () => {
      vigente = false;
    };
  }, [usuario, estado]);

  // La API no manda el titular de la fija en el turno.
  useEffect(() => {
    if (!esStaff) return;
    let vigente = true;
    void listarFijas().then((r) => {
      if (vigente && r.ok) setFijas(r.datos);
    });
    return () => {
      vigente = false;
    };
  }, [esStaff]);
  const idsPropios = usuario ? misIds : SIN_IDS;

  const resumen = useMemo(() => {
    if (estado.tipo !== 'exito') return null;
    const t = estado.datos;
    const libres = t.filter((x) => x.estado === 'libre' && !esTurnoPasado(x, ahora)).length;
    const bloqueados = t.filter((x) => x.estado === 'mantenimiento');
    return { libres, diaBloqueado: bloqueados.length === t.length ? bloqueados[0]?.motivoBloqueo : null };
  }, [estado, ahora]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: espacio?.nombre ?? 'Disponibilidad', headerRight: () => <BotonFavorito espacioId={espacioId} /> }} />
      <View style={{ padding: espaciado.l, paddingBottom: espaciado.s, gap: espaciado.s }}>
        <SelectorDia dias={dias} valor={fecha} onCambiar={(d) => { setFecha(d); setElegido(null); }} ahora={ahora} />
        <Texto variante="subtitulo" centrado>{fechaLarga(fecha)}</Texto>
        <Leyenda />
      </View>

      {estado.tipo === 'cargando' ? (
        <Cargando mensaje="Armando la grilla…" />
      ) : estado.tipo === 'error' ? (
        <VistaError mensaje={estado.error.mensaje} onReintentar={reintentar} />
      ) : (
        <FlatList
          data={estado.datos}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: espaciado.l, paddingBottom: 120 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} colors={[colores.primario]} />}
          ListHeaderComponent={
            resumen?.diaBloqueado ? (
              <AvisoGrilla icono="rainy-outline" color={colores.mantenimiento} fondo={colores.mantenimientoFondo}
                texto={`Día bloqueado: ${resumen.diaBloqueado}. Elegí otro día.`} />
            ) : resumen && resumen.libres === 0 ? (
              <AvisoGrilla icono="sad-outline" color={colores.advertencia} fondo={colores.advertenciaFondo}
                texto="No quedan turnos libres este día. Probá con otro día o marcá el espacio como favorito para enterarte si se libera uno." />
            ) : null
          }
          renderItem={({ item }) => (
            <FilaTurno
              turno={item}
              pasado={esTurnoPasado(item, ahora)}
              seleccionado={elegido?.id === item.id}
              esMia={!!item.reservaId && idsPropios.has(item.reservaId)}
              titularFija={item.estado === 'fijo' ? fijaQueCubre(item, fijas)?.titular ?? null : null}
              onPress={() => setElegido(item)}
            />
          )}
        />
      )}

      <View style={[estilos.barra, { backgroundColor: colores.superficie, borderTopColor: colores.borde, paddingBottom: espaciado.m + insets.bottom }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaciado.s, minHeight: 40 }}>
          <Icono nombre="hand-left-outline" color={colores.primario} />
          <Texto>
            {!resumen ? 'Tocá un turno libre para reservar' : resumen.libres === 0 ? 'No quedan turnos libres este día' : `${resumen.libres} turno${resumen.libres === 1 ? '' : 's'} libre${resumen.libres === 1 ? '' : 's'} · tocá uno para reservar`}
          </Texto>
        </View>
      </View>

      {espacio && elegido ? (
        <HojaReserva
          turno={elegido}
          nombreEspacio={espacio.nombre}
          capacidad={espacio.capacidad}
          deporte={deporte(espacio.deporteId)}
          logueado={!!usuario}
          esPersonal={esStaff}
          onCerrar={() => setElegido(null)}
          onConfirmar={async (cantidad) => {
            const r = await reservar(elegido.id, cantidad);
            if (!r.ok) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('No se pudo reservar', r.error.mensaje);
              if (['TURNO_OCUPADO', 'TURNO_PASADO', 'TURNO_NO_DISPONIBLE'].includes(r.error.codigo)) {
                setElegido(null);
                void recargar();
              }
              return;
            }
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setElegido(null);
            void sincronizar();
            router.push({ pathname: '/reserva/[id]', params: { id: r.datos.id, nueva: '1' } });
          }}
        />
      ) : null}
    </View>
  );
}

const SIN_IDS: Set<string> = new Set();

function AvisoGrilla({ icono, texto, color, fondo }: { icono: string; texto: string; color: string; fondo: string }) {
  return (
    <View style={[estilos.aviso, { backgroundColor: fondo }]} accessibilityLiveRegion="polite">
      <Icono nombre={icono} color={color} />
      <Texto color={color} style={{ flex: 1 }}>{texto}</Texto>
    </View>
  );
}

function HojaReserva({
  turno, nombreEspacio, capacidad, deporte, logueado, esPersonal, onCerrar, onConfirmar,
}: {
  turno: Turno; nombreEspacio: string; capacidad: number; deporte: Deporte | undefined;
  logueado: boolean; esPersonal: boolean;
  onCerrar: () => void; onConfirmar: (cantidad: number) => Promise<void>;
}) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const [cantidad, setCantidad] = useState(capacidad);
  const [enviando, setEnviando] = useState(false);
  const error = validarCantidad(cantidad, capacidad);

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={estilos.velo} onPress={onCerrar} accessibilityLabel="Cerrar" />
      <View style={[estilos.hoja, { backgroundColor: colores.superficie, paddingBottom: espaciado.l + insets.bottom }]}>
        <View style={[estilos.manija, { backgroundColor: colores.borde }]} />
        <Texto variante="titulo">{nombreEspacio}</Texto>
        <Texto>{fechaLarga(turno.fecha)} {rangoHorario(turno.inicio, turno.fin)}</Texto>
        <Texto suave variante="chico">{precioATexto(turno.precio)} · se paga en el lugar</Texto>

        {!logueado ? (
          <View style={{ gap: espaciado.s, marginTop: espaciado.m }}>
            <Texto>Para reservar necesitás una cuenta. Mirar la disponibilidad es libre.</Texto>
            <Boton titulo="Ingresar para reservar" icono="log-in-outline" grande onPress={() => { onCerrar(); router.push('/login'); }} />
            <Boton titulo="Crear cuenta" variante="secundario" onPress={() => { onCerrar(); router.push('/registro'); }} />
          </View>
        ) : esPersonal ? (
          <View style={{ gap: espaciado.s, marginTop: espaciado.m }}>
            <Texto>Las cuentas de encargado y administrador no reservan turnos: las reservas las hacen los jugadores desde su cuenta.</Texto>
            <Boton titulo="Entendido" variante="secundario" onPress={onCerrar} />
          </View>
        ) : (
          <>
            {deporte ? (
              <View style={{ marginTop: espaciado.m }}>
                <Etiqueta texto={deporte.nombre} icono={deporte.icono} color="#FFFFFF" fondo={deporte.color} />
              </View>
            ) : null}

            <Texto variante="etiqueta" suave style={{ marginTop: espaciado.l }}>¿Cuántos van a ser?</Texto>
            <View style={estilos.contador}>
              <Pressable accessibilityLabel="Menos personas" onPress={() => setCantidad((c) => Math.max(1, c - 1))} style={[estilos.botonContador, { backgroundColor: colores.superficieAlta }]}>
                <Icono nombre="remove" tam={26} />
              </Pressable>
              <Texto variante="titulo" style={{ minWidth: 60, textAlign: 'center' }}>{cantidad}</Texto>
              <Pressable accessibilityLabel="Más personas" onPress={() => setCantidad((c) => Math.min(capacidad, c + 1))} style={[estilos.botonContador, { backgroundColor: colores.superficieAlta }]}>
                <Icono nombre="add" tam={26} />
              </Pressable>
              <Texto suave variante="chico" style={{ flex: 1 }}>Máximo {capacidad}</Texto>
            </View>
            {error ? <Texto variante="chico" color={colores.peligro}>{error}</Texto> : null}

            <Texto variante="chico" suave style={{ marginTop: espaciado.m }}>
              Podés cancelar desde la app hasta 4 horas antes; después hay que avisarle al encargado. Máximo 3 reservas activas por persona.
            </Texto>
            <Boton
              titulo="Confirmar reserva"
              icono="checkmark-circle-outline"
              grande
              cargando={enviando}
              deshabilitado={!!error}
              style={{ marginTop: espaciado.m }}
              onPress={async () => {
                setEnviando(true);
                await onConfirmar(cantidad);
                setEnviando(false);
              }}
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: espaciado.m, borderTopWidth: StyleSheet.hairlineWidth },
  aviso: { flexDirection: 'row', gap: espaciado.s, alignItems: 'center', padding: espaciado.m, borderRadius: radio.m, marginBottom: espaciado.s },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  hoja: { borderTopLeftRadius: radio.l + 6, borderTopRightRadius: radio.l + 6, padding: espaciado.l, gap: 4 },
  manija: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: espaciado.m },
  contador: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m, marginTop: 6 },
  botonContador: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
