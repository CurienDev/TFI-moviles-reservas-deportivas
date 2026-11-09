import { router, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icono, Tarjeta, Texto } from '../../componentes/base';
import { RequiereSesion } from '../../componentes/RequiereSesion';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';
import { espaciado } from '../../tema/colores';

const ACCIONES: { titulo: string; detalle: string; icono: string; ruta: Href; soloAdmin?: boolean }[] = [
  { titulo: 'Escanear ingreso', detalle: 'Leer el QR en la puerta y registrar la llegada', icono: 'qr-code-outline', ruta: '/gestion/escanear' },
  { titulo: 'Agenda del día', detalle: 'Todos los espacios; marcar ausentes y cancelar reservas', icono: 'today-outline', ruta: '/gestion/agenda' },
  { titulo: 'Bloqueos', detalle: 'Mantenimiento o lluvia, por turno o día completo', icono: 'construct-outline', ruta: '/gestion/bloqueos' },
  { titulo: 'Reservas fijas', detalle: 'Grupos y clubes que ocupan el mismo horario cada semana', icono: 'repeat-outline', ruta: '/gestion/fijas' },
  { titulo: 'Precios por hora', detalle: 'Cambiar el precio de cada espacio (administrador)', icono: 'pricetag-outline', ruta: '/gestion/precios', soloAdmin: true },
  { titulo: 'Fotos de las canchas', detalle: 'Subir fotos del estado actual desde la galería', icono: 'images-outline', ruta: '/gestion/fotos' },
  { titulo: 'Jugadores', detalle: 'Cancelaciones tardías y ausencias de quienes reservaron', icono: 'people-outline', ruta: '/gestion/usuarios' },
];

export default function PantallaGestion() {
  const { colores } = useTema();
  const { usuario, esAdmin } = useSesion();
  return (
    <RequiereSesion staff mensaje="Ingresá con una cuenta de encargado o administrador.">
      <ScrollView contentContainerStyle={{ padding: espaciado.l, gap: espaciado.m }}>
        <Texto suave>Hola, {usuario?.nombre.split(' ')[0]}. ¿Qué necesitás hacer?</Texto>
        {ACCIONES.filter((a) => !a.soloAdmin || esAdmin).map((a) => (
          <Tarjeta key={a.titulo} onPress={() => router.push(a.ruta)} accesibilidad={`${a.titulo}. ${a.detalle}`}>
            <View style={estilos.fila}>
              <View style={[estilos.icono, { backgroundColor: colores.superficieAlta }]}>
                <Icono nombre={a.icono} color={colores.primario} tam={26} />
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="subtitulo">{a.titulo}</Texto>
                <Texto variante="chico" suave>{a.detalle}</Texto>
              </View>
              <Icono nombre="chevron-forward" color={colores.textoSuave} />
            </View>
          </Tarjeta>
        ))}
      </ScrollView>
    </RequiereSesion>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.m },
  icono: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
