import { Tabs } from 'expo-router';
import { Icono } from '../../componentes/base';
import { useSesion } from '../../contexto/SesionContext';
import { useTema } from '../../contexto/TemaContext';

export default function LayoutPestanas() {
  const { colores } = useTema();
  const { esStaff, avisosSinLeer } = useSesion();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colores.superficie },
        headerTintColor: colores.texto,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarStyle: { backgroundColor: colores.superficie, borderTopColor: colores.borde },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Espacios',
          headerTitle: 'Reservas Deportivas',
          tabBarIcon: ({ color, size }) => <Icono nombre="grid-outline" color={color} tam={size} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{ title: 'Mapa', tabBarIcon: ({ color, size }) => <Icono nombre="map-outline" color={color} tam={size} /> }}
      />
      <Tabs.Screen
        name="reservas"
        options={{ title: 'Mis reservas', tabBarLabel: esStaff ? 'Reservas' : 'Mis reservas', tabBarIcon: ({ color, size }) => <Icono nombre="ticket-outline" color={color} tam={size} /> }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarBadge: avisosSinLeer > 0 ? avisosSinLeer : undefined,
          tabBarIcon: ({ color, size }) => <Icono nombre="notifications-outline" color={color} tam={size} />,
        }}
      />
      <Tabs.Screen
        name="gestion"
        options={{
          title: 'Gestión',
          href: esStaff ? undefined : null,
          tabBarIcon: ({ color, size }) => <Icono nombre="briefcase-outline" color={color} tam={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Icono nombre="person-circle-outline" color={color} tam={size} /> }}
      />
    </Tabs>
  );
}
