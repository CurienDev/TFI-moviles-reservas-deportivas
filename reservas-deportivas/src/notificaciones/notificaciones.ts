import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Aviso, ReservaDetallada } from '../tipos';
import { CLAVES, guardarJson, leerJson } from '../almacenamiento/kv';
import { rangoHorario, fechaRelativa } from '../logica/fechas';
import { esReservaActiva, momentoRecordatorio } from '../logica/reglas';
import { complejoDe } from '../logica/complejos';

const CANAL_RECORDATORIOS = 'recordatorios';
const CANAL_AVISOS = 'avisos';

export function configurarNotificaciones(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
      name: 'Recordatorios de turnos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    });
    void Notifications.setNotificationChannelAsync(CANAL_AVISOS, {
      name: 'Avisos de la Dirección de Deportes',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  try {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
  } catch {
    return false;
  }
}

async function permisoConcedido(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function sincronizarRecordatorios(reservas: ReservaDetallada[]): Promise<void> {
  try {
    const programadas = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of programadas) {
      if (n.content.data?.tipo === 'recordatorio') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    if (!(await permisoConcedido())) return;
    const ahora = new Date();
    for (const d of reservas) {
      if (!esReservaActiva(d.reserva, ahora)) continue;
      const cuando = momentoRecordatorio(d);
      if (cuando.getTime() <= ahora.getTime()) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `En 2 horas: ${d.espacio?.nombre ?? 'tu turno'}`,
          body: `${fechaRelativa(d.fecha, cuando)} ${rangoHorario(d.inicio, d.fin)}${d.espacio && complejoDe(d.espacio) ? ` · ${complejoDe(d.espacio)}` : ''}. Tené a mano el QR.`,
          data: { tipo: 'recordatorio', reservaId: d.reserva.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL_RECORDATORIOS },
      });
    }
  } catch {
    // Si el sistema las rechaza, la app sigue igual.
  }
}

export async function cancelarTodosLosRecordatorios(): Promise<void> {
  await sincronizarRecordatorios([]);
}

export async function entregarAvisos(usuarioId: string, avisos: Aviso[]): Promise<void> {
  const clave = CLAVES.avisosEntregados(usuarioId);
  const entregados = new Set((await leerJson<string[]>(clave)) ?? []);
  const nuevos = avisos.filter((a) => !a.leido && !entregados.has(a.id));
  if (nuevos.length === 0) return;
  const puede = await permisoConcedido();
  for (const a of nuevos) {
    entregados.add(a.id);
    if (!puede) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: a.titulo,
          body: a.mensaje,
          data: { tipo: 'aviso', avisoId: a.id, reservaId: a.reservaId, espacioId: a.espacioId },
        },
        trigger: Platform.OS === 'android' ? { channelId: CANAL_AVISOS } : null,
      });
    } catch {
      // Ignorado.
    }
  }
  await guardarJson(clave, [...entregados]);
}
