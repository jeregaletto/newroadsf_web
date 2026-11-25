import { useEffect, useLayoutEffect, useRef } from 'react';
import { FLIP } from './motion';

/**
 * Reacomodo animado (técnica FLIP) de los hijos de un contenedor cuando cambia `clave`.
 * Reemplaza a `layout` de Motion (que exige el paquete domMax, ~18 KB gzip más):
 * mide dónde estaba cada hijo marcado con data-flip="<id>" y lo anima desde ahí
 * con la Web Animations API, solo con transform (corre en el compositor).
 *
 * Las posiciones se guardan relativas al contenedor, así no importa si la página scrolleó
 * entre un cambio y otro. Si el contenedor cambia de tamaño se descartan (no se anima con datos viejos).
 */
export function useFlip(contenedorRef, clave, { reducir = false } = {}) {
  const posiciones = useRef(new Map());

  useLayoutEffect(() => {
    const cont = contenedorRef.current;
    if (!cont) return;
    const base = cont.getBoundingClientRect();
    const previas = posiciones.current;
    const nuevas = new Map();

    for (const el of cont.children) {
      const id = el.dataset.flip;
      if (!id) continue;
      // Si venía animándose (filtros tocados seguido), se corta para medir su lugar real
      el.getAnimations().forEach((a) => a.cancel());
      const r = el.getBoundingClientRect();
      const pos = { x: r.left - base.left, y: r.top - base.top };
      nuevas.set(id, pos);

      const antes = previas.get(id);
      if (!antes || reducir) continue;
      const dx = antes.x - pos.x;
      const dy = antes.y - pos.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
        duration: FLIP.duracionMs,
        easing: FLIP.easing,
      });
    }
    posiciones.current = nuevas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // Si cambia el ancho (rotar el celular, achicar la ventana), las posiciones guardadas ya no sirven
  useEffect(() => {
    const cont = contenedorRef.current;
    if (!cont) return;
    let ancho = cont.offsetWidth;
    const ro = new ResizeObserver(() => {
      // El observer dispara también al empezar: solo se descarta si el ancho cambió de verdad
      if (cont.offsetWidth !== ancho) {
        ancho = cont.offsetWidth;
        posiciones.current.clear();
      }
    });
    ro.observe(cont);
    return () => ro.disconnect();
    // Se re-engancha con la clave: el contenedor puede no existir todavía (catálogo cargando)
  }, [contenedorRef, clave]);
}
