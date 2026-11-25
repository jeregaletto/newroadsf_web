import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalA11y } from '../lib/useModalA11y';

/**
 * Modal accesible con animaciones CSS. En mobile se muestra como bottom-sheet,
 * en desktop centrado. Cierra con Esc, click afuera o botón.
 * Lo usa el panel admin; la tienda usa AnimatedModal (misma accesibilidad, animado con Motion).
 */
export default function Modal({ open, onClose, title, children, size = 'md', hideTitle = false, variant = 'modal', headerExtra = null }) {
  const titleId = useId();
  const panelRef = useRef(null);
  useModalA11y(open, onClose, panelRef);

  if (!open) return null;

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl' };
  const isDrawer = variant === 'drawer';
  const wrapperCls = isDrawer
    ? 'fixed inset-0 z-[60] flex justify-end'
    : 'fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6';
  const panelCls = isDrawer
    ? 'relative flex h-dvh w-full max-w-md flex-col border-l border-line bg-ink-2 shadow-2xl outline-none animate-slide-left'
    : `relative flex max-h-[92dvh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-3xl border border-line bg-ink-2 shadow-2xl outline-none animate-slide-up sm:rounded-3xl`;

  return createPortal(
    <div className={wrapperCls}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={panelCls}
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
      </div>
    </div>,
    document.body,
  );
}
