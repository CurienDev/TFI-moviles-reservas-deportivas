import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Boton, Campo, Cargando, Separador, Tarjeta, Texto } from '../../componentes/base';
import { SelectorDiaSemana, SelectorEspacios, SelectorHora } from '../../componentes/formularios';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { aFechaLocal } from '../../logica/fechas';
import { validarFija } from '../../logica/reglas';
import { crearFija, darDeBajaFija, editarFija, listarFijas } from '../../servicios/reservas';
import type { ReservaFija } from '../../tipos';
import { espaciado } from '../../tema/colores';

type Borrador = Omit<ReservaFija, 'id' | 'activa'>;

const MENSAJES_CONFLICTO: Record<string, string> = {
  FIJA_SUPERPUESTA: 'Ya hay otra reserva fija activa en ese espacio, día y horario.',
  CONFLICTO_CON_RESERVAS:
    'Hay reservas confirmadas de jugadores en ese horario. Resolvelas primero (cancelalas desde la Agenda del día avisando a cada persona) y volvé a cargar la fija.',
};

/** Alta y edición de una reserva fija (solo administrador). */
function Contenido() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colores } = useTema();
  const { esAdmin } = useSesion();
  const { estado: catalogo } = useCatalogo();
  const [cargando, setCargando] = useState(!!id);
  const [activa, setActiva] = useState(true);
  const [b, setB] = useState<Borrador>({
    espacioId: '', titular: '', dia: 2, inicio: '21:00', fin: '22:00', desde: aFechaLocal(new Date()), hasta: null,
  });
  const [conFin, setConFin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!id) return;
    void listarFijas().then((r) => {
      if (r.ok) {
        const actual = r.datos.find((f) => f.id === id);
        if (actual) {
          const { id: _id, activa: estaActiva, ...resto } = actual;
          setB(resto);
          setActiva(estaActiva);
          setConFin(actual.hasta !== null);
        }
      } else {
        setError(r.error.mensaje);
      }
      setCargando(false);
    });
  }, [id]);

  if (cargando) return <Cargando />;

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }));

  const enviar = async () => {
    const fija: Borrador = { ...b, titular: b.titular.trim(), hasta: conFin ? b.hasta : null };
    const err = validarFija(fija);
    setError(err);
    if (err) return;
    setEnviando(true);
    const r = id ? await editarFija(id, fija) : await crearFija(fija);
    setEnviando(false);
    if (r.ok) {
      router.back();
      return;
    }
    setError(MENSAJES_CONFLICTO[r.error.codigo] ?? r.error.mensaje);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.l }} keyboardShouldPersistTaps="handled">
        {!esAdmin ? (
          <Texto color={colores.advertencia}>Solo el administrador puede cargar o editar reservas fijas.</Texto>
        ) : null}
        {id && !activa ? <Texto color={colores.advertencia}>Esta reserva fija está dada de baja.</Texto> : null}
        <Tarjeta style={{ gap: espaciado.m }}>
          <Texto variante="subtitulo">Espacio</Texto>
          {catalogo.tipo === 'exito' ? (
            <SelectorEspacios espacios={catalogo.datos.espacios} seleccion={b.espacioId ? [b.espacioId] : []} onCambiar={(ids) => set('espacioId', ids[0] ?? '')} />
          ) : null}
        </Tarjeta>
        <Tarjeta style={{ gap: espaciado.m }}>
          <Campo etiqueta="Titular (grupo, club o persona)" value={b.titular} onChangeText={(t) => set('titular', t)} placeholder="Grupo de los martes" maxLength={120} />
          <Texto variante="etiqueta" suave>Día de la semana</Texto>
          <SelectorDiaSemana valor={b.dia} onCambiar={(d) => set('dia', d)} />
          <SelectorHora etiqueta="Desde las" valor={b.inicio} onCambiar={(h) => set('inicio', h)} hasta={23} />
          <SelectorHora etiqueta="Hasta las" valor={b.fin} onCambiar={(h) => set('fin', h)} desde={9} />
          <Separador />
          <Campo etiqueta="Vigente desde (AAAA-MM-DD)" value={b.desde} onChangeText={(t) => set('desde', t)} placeholder="2026-03-01" keyboardType="numbers-and-punctuation" />
          <View style={estilos.fila}>
            <Texto style={{ flex: 1 }}>Tiene fecha de fin</Texto>
            <Boton
              titulo={conFin ? 'Sí' : 'No'}
              variante="secundario"
              onPress={() => {
                const v = !conFin;
                setConFin(v);
                if (v && !b.hasta) set('hasta', b.desde);
              }}
            />
          </View>
          {conFin ? (
            <Campo etiqueta="Vigente hasta (AAAA-MM-DD)" value={b.hasta ?? ''} onChangeText={(t) => set('hasta', t)} keyboardType="numbers-and-punctuation" />
          ) : null}
        </Tarjeta>
        {error ? <Texto color={colores.peligro}>{error}</Texto> : null}
        {esAdmin ? (
          <Boton titulo={id ? 'Guardar cambios' : 'Crear reserva fija'} icono="save-outline" grande cargando={enviando} onPress={enviar} />
        ) : null}
        {esAdmin && id && !activa ? (
          <Boton titulo="Volver a activarla" icono="refresh-outline" variante="secundario" onPress={async () => {
            const r = await editarFija(id, { activa: true });
            if (r.ok) router.back();
            else setError(MENSAJES_CONFLICTO[r.error.codigo] ?? r.error.mensaje);
          }} />
        ) : null}
        {esAdmin && id && activa ? (
          <Boton
            titulo="Dar de baja la reserva fija"
            icono="trash-outline"
            variante="peligro"
            onPress={() =>
              Alert.alert('Dar de baja', 'Desde hoy esos horarios vuelven a quedar libres.', [
                { text: 'Volver', style: 'cancel' },
                {
                  text: 'Dar de baja',
                  style: 'destructive',
                  onPress: async () => {
                    const r = await darDeBajaFija(id);
                    if (r.ok) router.back();
                    else setError(r.error.mensaje);
                  },
                },
              ])
            }
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function PantallaFija() {
  return (
    <RequiereSesion staff mensaje="Ingresá como administrador.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: espaciado.s },
});
