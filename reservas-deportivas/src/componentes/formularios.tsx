import { ScrollView, StyleSheet, View } from 'react-native';
import type { Espacio } from '../tipos';
import { HORA_APERTURA, HORA_CIERRE, horaAString, nombreDia } from '../logica/fechas';
import { espaciado } from '../tema/colores';
import { Chip, Texto } from './base';
import { nombreComplejo, tieneComplejo } from '../logica/complejos';

export function SelectorHora({ etiqueta, valor, onCambiar, desde = HORA_APERTURA, hasta = HORA_CIERRE }: {
  etiqueta: string; valor: string; onCambiar: (h: string) => void; desde?: number; hasta?: number;
}) {
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => horaAString(desde + i));
  return (
    <View style={{ gap: 6 }}>
      <Texto variante="etiqueta" suave>{etiqueta}</Texto>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {horas.map((h) => <Chip key={h} texto={h} activo={valor === h} onPress={() => onCambiar(h)} />)}
      </ScrollView>
    </View>
  );
}

export function SelectorDiaSemana({ valor, onCambiar }: { valor: number; onCambiar: (d: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void }) {
  const orden = [1, 2, 3, 4, 5, 6, 0] as const;
  return (
    <View style={estilos.envolver}>
      {orden.map((d) => <Chip key={d} texto={nombreDia(d)} activo={valor === d} onPress={() => onCambiar(d)} />)}
    </View>
  );
}

export function SelectorEspacios({ espacios, seleccion, onCambiar, multiple }: {
  espacios: Espacio[]; seleccion: string[]; onCambiar: (ids: string[]) => void; multiple?: boolean;
}) {
  const complejos = [...new Set(espacios.map((e) => e.complejo))];
  const alternar = (id: string) => {
    if (!multiple) return onCambiar([id]);
    onCambiar(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);
  };
  return (
    <View style={{ gap: espaciado.s }}>
      {complejos.map((c) => {
        const ids = espacios.filter((e) => e.complejo === c).map((e) => e.id);
        const todos = ids.every((id) => seleccion.includes(id));
        return (
          <View key={c} style={{ gap: 6 }}>
            <Texto variante="etiqueta" suave>{nombreComplejo(c)}</Texto>
            <View style={estilos.envolver}>
              {multiple ? (
                <Chip
                  texto={todos ? 'Quitar todos' : tieneComplejo({ complejo: c }) ? 'Todo el complejo' : 'Todos estos'}
                  icono="checkmark-done-outline"
                  activo={todos}
                  onPress={() => onCambiar(todos ? seleccion.filter((x) => !ids.includes(x)) : [...new Set([...seleccion, ...ids])])}
                />
              ) : null}
              {espacios.filter((e) => e.complejo === c).map((e) => (
                <Chip key={e.id} texto={e.nombre} activo={seleccion.includes(e.id)} onPress={() => alternar(e.id)} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  envolver: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
