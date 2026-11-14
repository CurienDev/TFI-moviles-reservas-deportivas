import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Aviso, Espacio, Resultado, Sesion, Usuario } from '../tipos';
import * as db from '../almacenamiento/db';
import { registrarPerdidaDeSesion } from '../servicios/cliente';
import { avisarSuspensiones, avisarTurnosLiberados, listarAvisos } from '../servicios/avisos';
import { misReservas, misReservasGuardadas } from '../servicios/reservas';
import {
  cerrarSesion as cerrarSesionServicio, iniciarSesion as iniciarSesionServicio,
  refrescarUsuario, registrarse as registrarseServicio, restaurarSesion, sesionGuardada,
} from '../servicios/usuarios';
import {
  cancelarTodosLosRecordatorios, entregarAvisos, pedirPermisoNotificaciones, sincronizarRecordatorios,
} from '../notificaciones/notificaciones';

interface ValorSesion {
  cargando: boolean;
  usuario: Usuario | null;
  bloqueada: boolean;
  esStaff: boolean;
  esAdmin: boolean;
  avisos: Aviso[];
  avisosSinLeer: number;
  desbloquear: () => void;
  iniciarSesion: (email: string, contrasena: string) => Promise<Resultado<Sesion>>;
  registrarse: (d: { nombre: string; email: string; telefono: string; contrasena: string }) => Promise<Resultado<Sesion>>;
  cerrarSesion: () => Promise<void>;
  actualizarUsuario: (u: Usuario) => void;
  sincronizar: (opciones?: { revisarFavoritos?: boolean }) => Promise<void>;
  recargarAvisos: () => Promise<void>;
}

const Contexto = createContext<ValorSesion | null>(null);
const INTERVALO_SINCRONIZACION_MS = 60_000;
const INTERVALO_FAVORITOS_MS = 120_000;

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [bloqueada, setBloqueada] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const usuarioRef = useRef<Usuario | null>(null);
  // Los favoritos se revisan cada 2 minutos, no en cada sincronización.
  const ultimaRevisionFavoritos = useRef<{ usuarioId: string; momento: number } | null>(null);
  const sincronizando = useRef(false);

  useEffect(() => {
    usuarioRef.current = usuario;
  }, [usuario]);

  const recargarAvisos = useCallback(async () => {
    const u = usuarioRef.current;
    setAvisos(u ? await listarAvisos(u.id) : []);
  }, []);

  const sincronizar = useCallback(async (opciones?: { revisarFavoritos?: boolean }) => {
    const actual = usuarioRef.current;
    if (!actual || sincronizando.current) return;
    sincronizando.current = true;
    try {
      const yo = await refrescarUsuario();
      const u = yo.ok && yo.datos.id === actual.id ? yo.datos : actual;
      if (yo.ok && usuarioRef.current?.id === yo.datos.id) setUsuario(yo.datos);
      const espacios = await db.listar<Espacio>('espacios');
      const antes = await misReservasGuardadas(u.id);
      const ahora = await misReservas(u.id);
      if (ahora.ok && !ahora.desdeCache) {
        await avisarSuspensiones(u, antes, ahora.datos.map((d) => d.reserva), espacios);
        await sincronizarRecordatorios(ahora.datos);
      }
      const previa = ultimaRevisionFavoritos.current;
      const toca = opciones?.revisarFavoritos || previa?.usuarioId !== u.id || Date.now() - previa.momento > INTERVALO_FAVORITOS_MS;
      if (u.rol === 'jugador' && toca) {
        ultimaRevisionFavoritos.current = { usuarioId: u.id, momento: Date.now() };
        await avisarTurnosLiberados(u, espacios);
      }
      const lista = await listarAvisos(u.id);
      setAvisos(lista);
      await entregarAvisos(u.id, lista);
    } finally {
      sincronizando.current = false;
    }
  }, []);

  useEffect(() => {
    // Si la API dice que el token ya no vale, se cierra la sesión en el teléfono.
    registrarPerdidaDeSesion(() => {
      void cerrarSesionServicio();
      setUsuario(null);
      setAvisos([]);
    });
    // Primero lo guardado en el teléfono y después se valida con la API.
    void (async () => {
      let local: Usuario | null = null;
      try {
        local = await sesionGuardada();
        if (local) {
          setUsuario(local);
          setBloqueada(true);
        }
      } finally {
        setCargando(false);
      }
      const u = await restaurarSesion();
      // Si mientras tanto cerró sesión desde la pantalla de reingreso, no se la devolvemos.
      if (u && !(await sesionGuardada())) return;
      setUsuario(u);
      if (!u) setBloqueada(false);
      else if (!local) setBloqueada(true);
    })();
  }, []);

  // Con la sesión desbloqueada: sincronizar al entrar, cada minuto y al volver a la app.
  useEffect(() => {
    if (!usuario || bloqueada) return;
    void sincronizar();
    const id = setInterval(() => {
      if (AppState.currentState === 'active') void sincronizar();
    }, INTERVALO_SINCRONIZACION_MS);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void sincronizar();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, bloqueada, sincronizar]);

  const valor = useMemo<ValorSesion>(
    () => ({
      cargando,
      usuario,
      bloqueada,
      esStaff: usuario?.rol === 'encargado' || usuario?.rol === 'administrador',
      esAdmin: usuario?.rol === 'administrador',
      avisos,
      avisosSinLeer: avisos.filter((a) => !a.leido).length,
      desbloquear: () => setBloqueada(false),
      iniciarSesion: async (email, contrasena) => {
        const res = await iniciarSesionServicio(email, contrasena);
        if (res.ok) {
          setUsuario(res.datos.usuario);
          setBloqueada(false);
          void pedirPermisoNotificaciones();
        }
        return res;
      },
      registrarse: async (d) => {
        const res = await registrarseServicio(d);
        if (res.ok) {
          setUsuario(res.datos.usuario);
          setBloqueada(false);
          void pedirPermisoNotificaciones();
        }
        return res;
      },
      cerrarSesion: async () => {
        await cancelarTodosLosRecordatorios();
        await cerrarSesionServicio();
        setAvisos([]);
        setBloqueada(false);
        setUsuario(null);
      },
      actualizarUsuario: setUsuario,
      sincronizar,
      recargarAvisos,
    }),
    [cargando, usuario, bloqueada, avisos, sincronizar, recargarAvisos],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ValorSesion {
  const v = useContext(Contexto);
  if (!v) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return v;
}
