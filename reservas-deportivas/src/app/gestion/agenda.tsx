import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { Boton, Cargando, Chip, Etiqueta, Icono, Tarjeta, Texto, Vacio, VistaError } from '../../componentes/base';
import { SelectorDia, estiloEstado, estiloReserva } from '../../componentes/dominio';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useTema } from '../../contexto/TemaContext';
import { fechaLarga, horaDeIso, proximosDias } from '../../logica/fechas';
import { MINUTOS_AUSENTE_DESPUES, estaMarcado, personalPuedeCancelar, puedeMarcarAusente } from '../../logica/reglas';
import { agendaDelDia, cancelarReserva, marcarAusente } from '../../servicios/reservas';
import type { FilaAgenda } from '../../tipos';
import { espaciado } from '../../tema/colores';
import { llamar } from '../../utilidades/navegacion';
import { useCarga } from '../../utilidades/useCarga';
import { nombreComplejo } from '../../logica/complejos';

function Contenido() {
  const { colores } = useTema();
  const dias = useMemo(() => proximosDias(new Date()), []);
  const [fecha, setFecha] = useState(dias[0]);
  const [complejo, setComplejo] = useState<string | null>(null);
  const { estado, recargar, refrescando, reintentar } = useCarga(() => agendaDelDia(fecha), [fecha]);

  const secciones = useMemo(() => {
    if (estado.tipo !== 'exito') return [];
    const porHora: Record<string, FilaAgenda[]> = {};
    for (const f of estado.datos) {
      if (complejo && f.espacio?.complejo !== complejo) continue;
      (porHora[f.turno.inicio] ??= []).push(f);
    }
    return Object.keys(porHora).sort().map((h) => ({ hora: h, data: porHora[h] }));
  }, [estado, complejo]);

  const complejos = estado.tipo === 'exito' ? [...new Set(estado.datos.map((f) => f.espacio?.complejo).filter((c): c is string => !!c))] : [];

  const confirmar = (titulo: string, mensaje: string, accion: () => Promise<{ ok: boolean; error?: { mensaje: string } }>) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
          const r = await accion();
          if (!r.ok) Alert.alert('No se pudo', r.error?.mensaje ?? 'Error inesperado.');
          void recargar();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: espaciado.l, paddingBottom: 0, gap: espaciado.s }}>
        <SelectorDia dias={dias} valor={fecha} onCambiar={setFecha} ahora={new Date()} />
        <Texto variante="subtitulo" centrado>{fechaLarga(fecha)}</Texto>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espaciado.s }}>
          <Chip texto="Todos" activo={complejo === null} onPress={() => setComplejo(null)} />
          {complejos.map((c) => <Chip key={c} texto={nombreComplejo(c)} activo={complejo === c} onPress={() => setComplejo(c)} />)}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: espaciado.s }}>
          <Boton titulo="Escanear QR" icono="qr-code-outline" style={{ flex: 1 }} onPress={() => router.push('/gestion/escanear')} />
          <Boton titulo="Bloquear" icono="construct-outline" variante="secundario" style={{ flex: 1 }} onPress={() => router.push('/gestion/bloqueos')} />
        </View>
      </View>
      {estado.tipo === 'cargando' ? (
        <Cargando mensaje="Armando la agenda…" />
      ) : estado.tipo === 'error' ? (
        <VistaError mensaje={estado.error.mensaje} onReintentar={reintentar} />
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(f) => f.turno.id}
          contentContainerStyle={{ padding: espaciado.l, gap: espaciado.s, flexGrow: 1 }}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} colors={[colores.primario]} />}
          ListEmptyComponent={<Vacio mensaje="No hay turnos ocupados ni bloqueados este día." icono="calendar-clear-outline" />}
          renderSectionHeader={({ section }) => <Texto variante="subtitulo" style={{ marginTop: espaciado.s }}>{section.hora} hs</Texto>}
          renderItem={({ item: f }) => {
            const ahora = new Date();
            const e = estiloEstado(f.turno, false, colores);
            const r = f.reserva;
            const er = r ? estiloReserva(r.estado, colores) : null;
            const detalle = f.turno.estado === 'fijo' ? f.titularFija ?? 'Reserva fija' : f.turno.estado === 'mantenimiento' ? f.turno.motivoBloqueo : null;
            return (
              <Tarjeta style={{ gap: 6 }}>
                <View style={estilos.fila}>
                  <Texto style={{ flex: 1, fontWeight: '700' }}>{f.espacio?.nombre ?? f.turno.espacioId}</Texto>
                  <Etiqueta texto={e.texto} icono={e.icono} color={e.color} fondo={e.fondo} />
                </View>
                {detalle ? <Texto suave>{detalle}</Texto> : null}
                {r && er ? (
                  <>
                    <View style={estilos.fila}>
                      <Icono nombre="person-outline" tam={18} color={colores.textoSuave} />
                      <Texto style={{ flex: 1 }}>{f.usuario?.nombre ?? r.usuarioId} · {r.cantidadPersonas} pers.</Texto>
                      {f.usuario && estaMarcado(f.usuario) ? <Etiqueta texto="Cancela tarde" icono="flag" color={colores.advertencia} fondo={colores.advertenciaFondo} /> : null}
                    </View>
                    <View style={estilos.fila}>
                      <Etiqueta texto={er.texto} icono={er.icono} color={er.color} fondo={er.fondo} />
                      {r.ingresoEn ? <Texto variante="chico" suave>Llegó {horaDeIso(r.ingresoEn)}</Texto> : null}
                    </View>
                    {r.estado === 'confirmada' ? (
                      <View style={[estilos.fila, { flexWrap: 'wrap' }]}>
                        {puedeMarcarAusente(r, ahora) ? (
                          <Boton
                            titulo="No se presentó"
                            icono="close-circle-outline"
                            variante="secundario"
                            onPress={() => confirmar('Marcar "no se presentó"', `${f.usuario?.nombre ?? 'El jugador'} suma una ausencia.`, () => marcarAusente(r.id))}
                          />
                        ) : null}
                        {personalPuedeCancelar(r, ahora) ? (
                          <Boton
                            titulo="Cancelar"
                            icono="ban-outline"
                            variante="secundario"
                            onPress={() =>
                              confirmar('Cancelar reserva', 'Si faltan menos de 4 horas, cuenta como cancelación tardía del jugador.', () => cancelarReserva(r.id, null))
                            }
                          />
                        ) : null}
                        {f.usuario?.telefono ? <Boton titulo="Llamar" icono="call-outline" variante="texto" onPress={() => llamar(f.usuario!.telefono)} /> : null}
                      </View>
                    ) : null}
                    {r.estado === 'confirmada' && !puedeMarcarAusente(r, ahora) && !personalPuedeCancelar(r, ahora) ? (
                      <Texto variante="chico" suave>«No se presentó» se habilita {MINUTOS_AUSENTE_DESPUES} minutos después del inicio.</Texto>
                    ) : null}
                  </>
                ) : null}
              </Tarjeta>
            );
          }}
        />
      )}
    </View>
  );
}

export default function PantallaAgenda() {
  return (
    <RequiereSesion staff mensaje="Ingresá como encargado o administrador.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
});
