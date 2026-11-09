import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Boton, Campo, Chip, Icono, Separador, Tarjeta, Texto, VistaError } from '../../componentes/base';
import { SelectorDia, rangoDias } from '../../componentes/dominio';
import { SelectorEspacios, SelectorHora } from '../../componentes/formularios';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useTema } from '../../contexto/TemaContext';
import { aFechaLocal, fechaCorta, fechaLarga } from '../../logica/fechas';
import { validarRangoHorario } from '../../logica/reglas';
import { crearBloqueo, eliminarBloqueo, listarBloqueos } from '../../servicios/reservas';
import { espaciado } from '../../tema/colores';
import { useCarga } from '../../utilidades/useCarga';

const MOTIVOS_RAPIDOS = ['Lluvia: cancha impracticable', 'Mantenimiento', 'Corte de luz', 'Evento municipal'];

/** Bloquear turnos o días enteros por mantenimiento o lluvia, con motivo escrito. */
function Contenido() {
  const { colores } = useTema();
  const { estado: catalogo, espacio } = useCatalogo();
  const hoy = aFechaLocal(new Date());
  const dias = useMemo(() => rangoDias(hoy, 30), [hoy]);
  const [espacioIds, setEspacioIds] = useState<string[]>([]);
  const [fecha, setFecha] = useState(hoy);
  const [diaCompleto, setDiaCompleto] = useState(true);
  const [inicio, setInicio] = useState('20:00');
  const [fin, setFin] = useState('22:00');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { estado, recargar, reintentar } = useCarga(() => listarBloqueos(hoy), [hoy]);

  const guardar = () => {
    const err =
      espacioIds.length === 0 ? 'Elegí al menos un espacio.' :
      motivo.trim().length < 3 ? 'Escribí el motivo (se les muestra a las personas afectadas).' :
      diaCompleto ? null : validarRangoHorario(inicio, fin);
    setError(err);
    if (err) return;
    const que = diaCompleto ? 'todo el día' : `de ${inicio} a ${fin}`;
    Alert.alert(
      'Confirmar bloqueo',
      `${espacioIds.length} espacio(s), ${fechaLarga(fecha)}, ${que}.\nLas reservas en ese horario se suspenden y se avisa a cada persona.`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            setEnviando(true);
            const r = await crearBloqueo({ espacioIds, fecha, inicio: diaCompleto ? null : inicio, fin: diaCompleto ? null : fin, motivo: motivo.trim() });
            setEnviando(false);
            if (!r.ok) {
              setError(r.error.mensaje);
              return;
            }
            Alert.alert(
              'Bloqueo creado',
              `Se crearon ${r.datos.length} bloqueo(s). Las reservas confirmadas de esos turnos quedaron canceladas (no cuentan como cancelación tardía) y cada jugador ve el aviso al abrir la app.`,
            );
            setMotivo('');
            setEspacioIds([]);
            void recargar();
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.l }} keyboardShouldPersistTaps="handled">
      <Tarjeta style={{ gap: espaciado.m }}>
        <Texto variante="subtitulo">Nuevo bloqueo</Texto>
        {catalogo.tipo === 'exito' ? (
          <SelectorEspacios espacios={catalogo.datos.espacios} seleccion={espacioIds} onCambiar={setEspacioIds} multiple />
        ) : null}
        <Separador />
        <Texto variante="etiqueta" suave>Día</Texto>
        <SelectorDia dias={dias} valor={fecha} onCambiar={setFecha} ahora={new Date()} />
        <Texto centrado>{fechaLarga(fecha)}</Texto>
        <View style={estilos.fila}>
          <Texto style={{ flex: 1 }}>Día completo</Texto>
          <Switch value={diaCompleto} onValueChange={setDiaCompleto} trackColor={{ true: colores.primario, false: colores.borde }} accessibilityLabel="Día completo" />
        </View>
        {!diaCompleto ? (
          <>
            <SelectorHora etiqueta="Desde" valor={inicio} onCambiar={setInicio} hasta={23} />
            <SelectorHora etiqueta="Hasta" valor={fin} onCambiar={setFin} desde={9} />
          </>
        ) : null}
        <View style={estilos.envolver}>
          {MOTIVOS_RAPIDOS.map((m) => <Chip key={m} texto={m} activo={motivo === m} onPress={() => setMotivo(m)} />)}
        </View>
        <Campo etiqueta="Motivo" value={motivo} onChangeText={setMotivo} placeholder="Ej.: Cancha anegada por lluvia" multiline />
        {error ? <Texto color={colores.peligro}>{error}</Texto> : null}
        <Boton titulo="Bloquear" icono="lock-closed-outline" variante="peligro" cargando={enviando} onPress={guardar} />
      </Tarjeta>

      <Texto variante="subtitulo">Próximos bloqueos</Texto>
      {estado.tipo === 'error' ? (
        <VistaError mensaje={estado.error.mensaje} onReintentar={reintentar} />
      ) : estado.tipo === 'exito' && estado.datos.length === 0 ? (
        <Texto suave>No hay bloqueos cargados.</Texto>
      ) : estado.tipo === 'exito' ? (
        estado.datos.map((b) => (
          <Tarjeta key={b.id} style={[estilos.fila, { gap: espaciado.m }]}>
            <Icono nombre={b.inicio ? 'construct-outline' : 'rainy-outline'} color={colores.mantenimiento} />
            <View style={{ flex: 1 }}>
              <Texto style={{ fontWeight: '700' }}>{espacio(b.espacioId)?.nombre ?? b.espacioId}</Texto>
              <Texto>{fechaCorta(b.fecha)} · {b.inicio ? `${b.inicio} a ${b.fin}` : 'Día completo'}</Texto>
              <Texto variante="chico" suave>{b.motivo}</Texto>
            </View>
            <Boton
              titulo="Quitar"
              variante="texto"
              onPress={() =>
                Alert.alert('Quitar bloqueo', 'Los turnos vuelven a quedar libres. Las reservas que se cancelaron siguen canceladas.', [
                  { text: 'Volver', style: 'cancel' },
                  {
                    text: 'Quitar',
                    style: 'destructive',
                    onPress: async () => {
                      const r = await eliminarBloqueo(b.id);
                      if (!r.ok) Alert.alert('Error', r.error.mensaje);
                      void recargar();
                    },
                  },
                ])
              }
            />
          </Tarjeta>
        ))
      ) : (
        <Texto suave>Cargando…</Texto>
      )}
    </ScrollView>
  );
}

export default function PantallaBloqueos() {
  return (
    <RequiereSesion staff mensaje="Ingresá como encargado o administrador.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center' },
  envolver: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
