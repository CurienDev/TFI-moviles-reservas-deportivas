import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type ColorValue, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useTema } from '../contexto/TemaContext';
import { espaciado, radio } from '../tema/colores';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

export function Icono({ nombre, tam = 22, color, style }: { nombre: string; tam?: number; color?: ColorValue; style?: StyleProp<TextStyle> }) {
  const { colores } = useTema();
  return <Ionicons name={nombre as NombreIcono} size={tam} color={color ?? colores.texto} style={style} />;
}

type VarianteTexto = 'titulo' | 'subtitulo' | 'cuerpo' | 'chico' | 'etiqueta';

export function Texto({
  children, variante = 'cuerpo', suave, color, style, lineas, centrado,
}: {
  children: ReactNode; variante?: VarianteTexto; suave?: boolean; color?: string;
  style?: StyleProp<TextStyle>; lineas?: number; centrado?: boolean;
}) {
  const { colores } = useTema();
  return (
    <Text
      numberOfLines={lineas}
      maxFontSizeMultiplier={1.6}
      style={[
        estilos[variante],
        { color: color ?? (suave ? colores.textoSuave : colores.texto) },
        centrado && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'texto';

export function Boton({
  titulo, onPress, variante = 'primario', icono, cargando, deshabilitado, style, grande, accesibilidad,
}: {
  titulo: string; onPress: () => void; variante?: VarianteBoton; icono?: string; cargando?: boolean;
  deshabilitado?: boolean; style?: StyleProp<ViewStyle>; grande?: boolean; accesibilidad?: string;
}) {
  const { colores } = useTema();
  const inactivo = deshabilitado || cargando;
  const fondo =
    variante === 'primario' ? colores.primario :
    variante === 'peligro' ? colores.peligro :
    variante === 'secundario' ? colores.superficieAlta : 'transparent';
  const texto =
    variante === 'primario' ? colores.primarioTexto :
    variante === 'peligro' ? (colores.oscuro ? '#1A0503' : '#FFFFFF') :
    variante === 'secundario' ? colores.texto : colores.primario;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accesibilidad ?? titulo}
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        grande && estilos.botonGrande,
        { backgroundColor: fondo, opacity: inactivo ? 0.45 : pressed ? 0.75 : 1 },
        variante === 'secundario' && { borderWidth: 1, borderColor: colores.borde },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={texto} />
      ) : (
        <>
          {icono ? <Icono nombre={icono} tam={grande ? 22 : 19} color={texto} /> : null}
          <Text maxFontSizeMultiplier={1.4} style={[estilos.botonTexto, grande && { fontSize: 17 }, { color: texto }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Tarjeta({ children, style, onPress, accesibilidad }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accesibilidad?: string }) {
  const { colores } = useTema();
  const base = [estilos.tarjeta, { backgroundColor: colores.superficie, borderColor: colores.borde }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accesibilidad} onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.8 }]}>
      {children}
    </Pressable>
  );
}

export function Chip({ texto, activo, onPress, icono, color }: { texto: string; activo: boolean; onPress: () => void; icono?: string; color?: string }) {
  const { colores } = useTema();
  const c = color ?? colores.primario;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.chip,
        { borderColor: activo ? c : colores.borde, backgroundColor: activo ? c : colores.superficie, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {icono ? <Icono nombre={icono} tam={16} color={activo ? '#FFFFFF' : colores.textoSuave} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={[estilos.chipTexto, { color: activo ? '#FFFFFF' : colores.texto }]}>{texto}</Text>
    </Pressable>
  );
}

export function Etiqueta({ texto, icono, color, fondo }: { texto: string; icono?: string; color: string; fondo: string }) {
  return (
    <View style={[estilos.etiquetaPill, { backgroundColor: fondo }]}>
      {icono ? <Icono nombre={icono} tam={14} color={color} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={[estilos.etiquetaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

export function Cargando({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  const { colores } = useTema();
  return (
    <View style={estilos.centro} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colores.primario} />
      <Texto suave style={{ marginTop: espaciado.m }}>{mensaje}</Texto>
    </View>
  );
}

export function VistaError({ mensaje, onReintentar, icono = 'cloud-offline-outline' }: { mensaje: string; onReintentar?: () => void; icono?: string }) {
  const { colores } = useTema();
  return (
    <View style={estilos.centro} accessibilityLiveRegion="assertive">
      <Icono nombre={icono} tam={48} color={colores.peligro} />
      <Texto centrado style={{ marginVertical: espaciado.m }}>{mensaje}</Texto>
      {onReintentar ? <Boton titulo="Reintentar" icono="refresh" onPress={onReintentar} variante="secundario" /> : null}
    </View>
  );
}

export function Vacio({ mensaje, icono = 'file-tray-outline', children }: { mensaje: string; icono?: string; children?: ReactNode }) {
  const { colores } = useTema();
  return (
    <View style={estilos.centro}>
      <Icono nombre={icono} tam={48} color={colores.textoSuave} />
      <Texto suave centrado style={{ marginVertical: espaciado.m }}>{mensaje}</Texto>
      {children}
    </View>
  );
}

export function BannerCache({ visible }: { visible: boolean }) {
  const { colores } = useTema();
  if (!visible) return null;
  return (
    <View style={[estilos.banner, { backgroundColor: colores.advertenciaFondo }]} accessibilityLiveRegion="polite">
      <Icono nombre="cloud-offline-outline" tam={18} color={colores.advertencia} />
      <Texto variante="chico" color={colores.advertencia} style={{ flex: 1 }}>
        Sin conexión: estás viendo los datos guardados en el teléfono.
      </Texto>
    </View>
  );
}

export function Campo({
  etiqueta, error, ...props
}: TextInputProps & { etiqueta: string; error?: string | null }) {
  const { colores } = useTema();
  return (
    <View style={{ marginBottom: espaciado.m }}>
      <Texto variante="etiqueta" suave style={{ marginBottom: 6 }}>{etiqueta}</Texto>
      <TextInput
        placeholderTextColor={colores.textoSuave}
        maxFontSizeMultiplier={1.4}
        accessibilityLabel={etiqueta}
        {...props}
        style={[
          estilos.campo,
          { color: colores.texto, backgroundColor: colores.superficie, borderColor: error ? colores.peligro : colores.borde },
          props.style,
        ]}
      />
      {error ? <Texto variante="chico" color={colores.peligro} style={{ marginTop: 4 }}>{error}</Texto> : null}
    </View>
  );
}

export function FilaDato({ icono, texto, color }: { icono: string; texto: string; color?: string }) {
  const { colores } = useTema();
  return (
    <View style={estilos.filaDato}>
      <Icono nombre={icono} tam={18} color={color ?? colores.textoSuave} />
      <Texto style={{ flex: 1 }} color={color}>{texto}</Texto>
    </View>
  );
}

export function Separador() {
  const { colores } = useTema();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colores.borde, marginVertical: espaciado.m }} />;
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 22, fontWeight: '700' },
  subtitulo: { fontSize: 17, fontWeight: '700' },
  cuerpo: { fontSize: 15, lineHeight: 21 },
  chico: { fontSize: 13, lineHeight: 18 },
  etiqueta: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  boton: {
    minHeight: 48, borderRadius: radio.m, paddingHorizontal: espaciado.l,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaciado.s,
  },
  botonGrande: { minHeight: 56 },
  botonTexto: { fontSize: 15, fontWeight: '700' },
  tarjeta: { borderRadius: radio.l, borderWidth: StyleSheet.hairlineWidth, padding: espaciado.l },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radio.pill,
    paddingHorizontal: 14, minHeight: 38,
  },
  chipTexto: { fontSize: 14, fontWeight: '600' },
  etiquetaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radio.pill,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  etiquetaTexto: { fontSize: 12, fontWeight: '700' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaciado.xl },
  banner: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, padding: espaciado.m },
  campo: { borderWidth: 1, borderRadius: radio.m, paddingHorizontal: espaciado.m, minHeight: 50, fontSize: 16 },
  filaDato: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s, marginVertical: 4 },
});
