import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Boton, Etiqueta, Icono, Tarjeta, Texto } from '../../componentes/base';
import { ImagenEspacio } from '../../componentes/dominio';
import { SelectorEspacios } from '../../componentes/formularios';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useTema } from '../../contexto/TemaContext';
import { fechaRelativa, horaDeIso } from '../../logica/fechas';
import { agregarFotoDeCancha, borrarFotoDeCancha, fotosDeCancha } from '../../servicios/medios';
import type { FotoCancha } from '../../tipos';
import { espaciado, radio } from '../../tema/colores';

/**
 * Fotos del estado de una cancha (expo-image-picker). Se guardan en el teléfono con
 * expo-file-system y se suben a la API (POST /archivos). Aparecen en la ficha del espacio.
 */
function Contenido() {
  const { colores } = useTema();
  const { estado } = useCatalogo();
  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<FotoCancha[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async (id: string) => setFotos(await fotosDeCancha(id)), []);

  useEffect(() => {
    if (!espacioId) return;
    let vigente = true;
    void fotosDeCancha(espacioId).then((f) => {
      if (vigente) setFotos(f);
    });
    return () => {
      vigente = false;
    };
  }, [espacioId]);

  const agregar = async () => {
    if (!espacioId) return;
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Sin acceso a la galería', 'Permití el acceso a las fotos para poder subir el estado de la cancha.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: false });
    if (r.canceled || !r.assets[0]) return;
    setSubiendo(true);
    try {
      const res = await agregarFotoDeCancha(espacioId, r.assets[0].uri);
      await cargar(espacioId);
      Alert.alert(
        res.subida ? 'Foto guardada y subida' : 'Foto guardada en el teléfono',
        res.subida ? 'Se ve en la ficha del espacio.' : `No se pudo subir al servidor (${res.error}). Queda guardada en este teléfono.`,
      );
    } catch {
      Alert.alert('No se pudo procesar la foto', 'Probá con otra imagen.');
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = (foto: FotoCancha) => {
    Alert.alert('Quitar foto', 'La foto se borra de este teléfono.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          await borrarFotoDeCancha(foto);
          if (espacioId) await cargar(espacioId);
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.l }}>
      <Tarjeta style={{ gap: espaciado.m }}>
        <Texto variante="subtitulo">Elegí el espacio</Texto>
        {estado.tipo === 'exito' ? (
          <SelectorEspacios espacios={estado.datos.espacios} seleccion={espacioId ? [espacioId] : []} onCambiar={(ids) => setEspacioId(ids[0] ?? null)} />
        ) : null}
      </Tarjeta>
      {espacioId ? (
        <>
          <Boton titulo="Agregar foto desde la galería" icono="image-outline" grande cargando={subiendo} onPress={agregar} />
          <Texto variante="chico" suave>
            La foto se achica antes de guardarse (ahorra datos), queda en el teléfono para verla sin conexión y se sube al servidor.
          </Texto>
          {fotos.length === 0 ? <Texto suave>Todavía no hay fotos del estado de esta cancha.</Texto> : null}
          <View style={estilos.grilla}>
            {fotos.map((f) => (
              <View key={f.id} style={estilos.celda}>
                <ImagenEspacio uri={f.uriLocal} alto={120} />
                <Pressable onPress={() => quitar(f)} accessibilityLabel="Quitar foto" style={[estilos.quitar, { backgroundColor: colores.peligro }]} hitSlop={8}>
                  <Icono nombre="trash-outline" tam={18} color="#FFFFFF" />
                </Pressable>
                <Texto variante="chico" suave style={{ marginTop: 4 }}>
                  {fechaRelativa(f.creadaEn.slice(0, 10), new Date())} {horaDeIso(f.creadaEn)}
                </Texto>
                <Etiqueta
                  texto={f.urlServidor ? 'Subida' : 'Solo en el teléfono'}
                  icono={f.urlServidor ? 'cloud-done-outline' : 'phone-portrait-outline'}
                  color={f.urlServidor ? colores.exito : colores.advertencia}
                  fondo={f.urlServidor ? colores.exitoFondo : colores.advertenciaFondo}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

export default function PantallaFotos() {
  return (
    <RequiereSesion staff mensaje="Ingresá como encargado o administrador.">
      <Contenido />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s },
  celda: { width: '48%', gap: 4 },
  quitar: { position: 'absolute', top: 6, right: 6, width: 36, height: 36, borderRadius: radio.pill, alignItems: 'center', justifyContent: 'center' },
});
