import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EstadoCarga, Resultado } from '../tipos';

export function useCarga<T>(cargar: () => Promise<Resultado<T>>, deps: unknown[] = []) {
  const [estado, setEstado] = useState<EstadoCarga<T>>({ tipo: 'cargando' });
  const [refrescando, setRefrescando] = useState(false);
  const fn = useRef(cargar);
  const vigente = useRef(0);
  const clavePrevia = useRef<string | null>(null);
  const clave = JSON.stringify(deps);

  useEffect(() => {
    fn.current = cargar;
  });

  const ejecutar = useCallback(async (silencioso: boolean, claveActual: string) => {
    const id = ++vigente.current;
    // Si cambiaron los parámetros se vuelve a mostrar la carga.
    const cambiaron = clavePrevia.current !== null && clavePrevia.current !== claveActual;
    clavePrevia.current = claveActual;
    if (!silencioso) setEstado((e) => (e.tipo === 'exito' && !cambiaron ? e : { tipo: 'cargando' }));
    const res = await fn.current();
    if (id !== vigente.current) return;
    setEstado(res.ok ? { tipo: 'exito', datos: res.datos, desdeCache: res.desdeCache } : { tipo: 'error', error: res.error });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void ejecutar(false, clave);
    }, [ejecutar, clave]),
  );

  const recargar = useCallback(async () => {
    setRefrescando(true);
    await ejecutar(true, clave);
    setRefrescando(false);
  }, [ejecutar, clave]);

  const reintentar = useCallback(() => {
    setEstado({ tipo: 'cargando' });
    void ejecutar(false, clave);
  }, [ejecutar, clave]);

  return { estado, setEstado, recargar, refrescando, reintentar };
}
