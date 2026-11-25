import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { useLenis } from 'lenis/react';
import { X } from 'lucide-react';
import { useModalA11y, modalesAbiertos } from '../lib/useModalA11y';
import { dialogo, drawer, fondo, sheet } from '../lib/motion';

/** true en pantallas sm o más anchas (el modal pasa de bottom-sheet a diálogo centrado). */
function useEsDesktop() {
  const consulta = '(min-width: 640px)';
  const [es, setEs] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const onChange = () => setEs(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return es;
}

/**
 * Modal de la tienda: misma API y accesibilidad que Modal (focus trap, Escape, devolución del foco),
 * con entrada y salida animadas.
 * - variant "drawer": entra desde la derecha.
 * - variant "modal": bottom-sheet en mobile, scale + fade en desktop.
 * Mientras está abierto frena Lenis, así la rueda no mueve la página de fondo.
 * `onExitComplete` avisa cuando terminó la animación de salida (para resetear contenido sin que se vea).
 */
export default function AnimatedModal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  hideTitle = false,
  variant = 'modal',
  headerExtra = null,
  onExitComplete,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const lenis = useLenis();
  const esDesktop = useEsDesktop();
  useModalA11y(open, onClose, panelRef);

  // Capa según el orden de apertura: el último modal abierto queda arriba
  // (los portales existen siempre, así que el orden del DOM no alcanza)
  const [capa, setCapa] = useState(1);
  useEffect(() => {
    if (open) setCapa(modalesAbiertos());
  }, [open]);

  useEffect(() => {
    if (!open || !lenis) return;
    lenis.stop();
    return () => {
      // Se reanuda recién cuando no queda ningún modal abierto (pueden apilarse)
      queueMicrotask(() => {
        if (modalesAbiertos() === 0) lenis.start();
      });
    };
  }, [open, lenis]);

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl' };
  const isDrawer = variant === 'drawer';
  const wrapperCls = isDrawer
    ? 'fixed inset-0 flex justify-end'
    : 'fixed inset-0 flex items-end justify-center sm:items-center sm:p-6';
  const panelCls = isDrawer
    ? 'relative flex h-dvh w-full max-w-md flex-col border-l border-line bg-ink-2 shadow-2xl outline-none'
    : `relative flex max-h-[92dvh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-3xl border border-line bg-ink-2 shadow-2xl outline-none sm:rounded-3xl`;
  const variantes = isDrawer ? drawer : esDesktop ? dialogo : sheet;

  return createPortal(
    // inert durante la salida: no recibe clics ni foco y los lectores de pantalla lo ignoran
    <div inert={!open}>
      <AnimatePresence onExitComplete={onExitComplete}>
        {open && (
          <div key="modal" className={wrapperCls} style={{ zIndex: 60 + capa }}>
            <m.div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
              variants={fondo}
              initial="oculto"
              animate="visible"
              exit="salida"
            />
            <m.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className={panelCls}
              variants={variantes}
              initial="oculto"
              animate="visible"
              exit="salida"
            >
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2 id={titleId} className={hideTitle ? 'sr-only' : 'font-display text-xl text-white'}>
                  {title}
                </h2>
                {headerExtra}
                <button
                  type="button"
                  onClick={onClose}
                  className={`-mr-2 grid size-10 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white ${headerExtra ? '' : 'ml-auto'}`}
                  aria-label="Cerrar"
                >
                  <X className="size-5" />
                </button>
              </div>
              {isDrawer ? (
                <div className="flex min-h-0 flex-1 flex-col">{children}</div>
              ) : (
                <div className="overflow-y-auto overscroll-contain" data-lenis-prevent>
                  {children}
                </div>
              )}
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
