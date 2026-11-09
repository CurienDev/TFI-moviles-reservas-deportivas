import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Boton, Cargando, Tarjeta, Texto, Vacio, VistaError } from '../../componentes/base';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useCatalogo } from '../../contexto/CatalogoContext';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { precioATexto } from '../../logica/fechas';
import { validarPrecio } from '../../logica/reglas';
import { cambiarPrecio } from '../../servicios/espacios';
import { complejoDe, unir } from '../../logica/complejos';
import type { Espacio } from '../../tipos';
import { espaciado, radio } from '../../tema/colores';

function FilaPrecio({ espacio, onGuardado }: { espacio: Espacio; onGuardado: (e: Espacio) => void }) {
  const { colores } = useTema();
  const [texto, setTexto] = useState(String(espacio.precioPorHora));
  const [guardando, setGuardando] = useState(false);
  const valor = Number(texto.replace(/\./g, ''));
  const error = validarPrecio(valor);
  const cambio = !error && valor !== espacio.precioPorHora;
  return (
    <Tarjeta style={{ gap: espaciado.s }}>
      <Texto style={{ fontWeight: '700' }}>{espacio.nombre}</Texto>
      <Texto variante="chico" suave>{unir([complejoDe(espacio), `actual ${precioATexto(espacio.precioPorHora)}`])}</Texto>
      <View style={estilos.fila}>
        <Texto variante="subtitulo">$</Texto>
        <TextInput
          value={texto}
          onChangeText={(t) => setTexto(t.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          accessibilityLabel={`Precio por hora de ${espacio.nombre}`}
          maxLength={8}
          style={[estilos.input, { color: colores.texto, borderColor: error ? colores.peligro : colores.borde, backgroundColor: colores.superficieAlta }]}
        />
        <Boton
          titulo="Guardar"
          deshabilitado={!cambio}
          cargando={guardando}
          onPress={async () => {
            setGuardando(true);
            const r = await cambiarPrecio(espacio.id, valor);
            setGuardando(false);
            if (r.ok) {
              onGuardado(r.datos);
              Alert.alert('Precio actualizado', `${espacio.nombre}: ${precioATexto(valor)} por hora. Se aplica a los turnos que se muestren desde ahora.`);
            } else Alert.alert('No se pudo guardar', r.error.mensaje);
          }}
        />
      </View>
      {error ? <Texto variante="chico" color={colores.peligro}>{error}</Texto> : null}
    </Tarjeta>
  );
}

function Contenido() {
  const { estado, recargar, reemplazarEspacio } = useCatalogo();
  if (estado.tipo === 'cargando') return <Cargando />;
  if (estado.tipo === 'error') return <VistaError mensaje={estado.error.mensaje} onReintentar={recargar} />;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList
        data={estado.datos.espacios}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: espaciado.l, gap: espaciado.s }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<Texto suave variante="chico">Precio en pesos por hora. La app solo lo muestra: el turno se paga en el lugar.</Texto>}
        renderItem={({ item }) => <FilaPrecio espacio={item} onGuardado={reemplazarEspacio} />}
      />
    </KeyboardAvoidingView>
  );
}

function SoloAdmin() {
  const { esAdmin } = useSesion();
  if (!esAdmin) return <Vacio mensaje="Solo el administrador puede cambiar los precios." icono="lock-closed-outline" />;
  return <Contenido />;
}

export default function PantallaPrecios() {
  return (
    <RequiereSesion staff mensaje="Ingresá como administrador.">
      <SoloAdmin />
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s },
  input: { flex: 1, borderWidth: 1, borderRadius: radio.m, minHeight: 48, paddingHorizontal: espaciado.m, fontSize: 18, fontWeight: '700' },
});
