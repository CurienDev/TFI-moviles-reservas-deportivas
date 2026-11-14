import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Deporte, Espacio, EstadoCarga } from '../tipos';
import { listarDeportes, listarEspacios } from '../servicios/espacios';
import { guardarMediosSinConexion } from '../servicios/medios';

interface Catalogo {
  deportes: Deporte[];
  espacios: Espacio[];
}

interface ValorCatalogo {
  estado: EstadoCarga<Catalogo>;
  recargar: () => Promise<void>;
  deporte: (id: string) => Deporte | undefined;
  espacio: (id: string) => Espacio | undefined;
  reemplazarEspacio: (e: Espacio) => void;
}

const Contexto = createContext<ValorCatalogo | null>(null);

async function obtenerCatalogo(): Promise<EstadoCarga<Catalogo>> {
  const [dep, esp] = await Promise.all([listarDeportes(), listarEspacios()]);
  if (dep.ok && esp.ok) {
    if (!esp.desdeCache) void guardarMediosSinConexion(esp.datos).catch(() => undefined);
    return { tipo: 'exito', datos: { deportes: dep.datos, espacios: esp.datos }, desdeCache: dep.desdeCache || esp.desdeCache };
  }
  return { tipo: 'error', error: !dep.ok ? dep.error : !esp.ok ? esp.error : { codigo: 'ERROR_INTERNO', mensaje: 'Error inesperado.' } };
}

export function ProveedorCatalogo({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoCarga<Catalogo>>({ tipo: 'cargando' });

  const aplicar = useCallback((nuevo: EstadoCarga<Catalogo>) => {
    setEstado((e) => (nuevo.tipo === 'error' && e.tipo === 'exito' ? e : nuevo));
  }, []);

  const recargar = useCallback(async () => {
    aplicar(await obtenerCatalogo());
  }, [aplicar]);

  useEffect(() => {
    void obtenerCatalogo().then(aplicar);
  }, [aplicar]);

  const valor = useMemo<ValorCatalogo>(() => {
    const datos = estado.tipo === 'exito' ? estado.datos : { deportes: [], espacios: [] };
    return {
      estado,
      recargar,
      deporte: (id) => datos.deportes.find((d) => d.id === id),
      espacio: (id) => datos.espacios.find((e) => e.id === id),
      reemplazarEspacio: (nuevo) =>
        setEstado((e) =>
          e.tipo === 'exito'
            ? { ...e, datos: { ...e.datos, espacios: e.datos.espacios.map((x) => (x.id === nuevo.id ? nuevo : x)) } }
            : e,
        ),
    };
  }, [estado, recargar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCatalogo(): ValorCatalogo {
  const v = useContext(Contexto);
  if (!v) throw new Error('useCatalogo debe usarse dentro de ProveedorCatalogo');
  return v;
}
