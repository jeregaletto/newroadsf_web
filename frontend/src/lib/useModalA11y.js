import { useEffect, useRef } from 'react';

// Pila de modales abiertos (compartida por Modal y AnimatedModal): Esc y Tab solo afectan al de arriba
const pila = [];

/** Cantidad de modales abiertos en este momento. */
export const modalesAbiertos = () => pila.length;

const ENFOCABLES =
  'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Comportamiento accesible de un diálogo: bloquea el scroll de la página, cierra con Escape,
 * mantiene el foco adentro (focus trap) y al cerrar devuelve el foco a donde estaba.
 * Se activa con `open` y se desactiva apenas `open` pasa a false (aunque la animación de
 * salida siga corriendo), así el foco vuelve enseguida al elemento que abrió el modal.
 */
export function useModalA11y(open, onClose, panelRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const token = {};
    pila.push(token);

    const onKey = (e) => {
      if (pila.at(-1) !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      // Mantiene el foco dentro del modal
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll(ENFOCABLES);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();

    return () => {
      pila.splice(pila.indexOf(token), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, panelRef]);
}
