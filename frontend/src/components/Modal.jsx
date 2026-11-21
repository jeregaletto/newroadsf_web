import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Pila de modales abiertos: Esc / Tab solo afectan al de arriba
const stack = [];

/**
 * Modal accesible. En mobile se muestra como bottom-sheet,
 * en desktop centrado. Cierra con Esc, click afuera o botón.
 */
export default function Modal({ open, onClose, title, children, size = 'md', hideTitle = false, variant = 'modal', headerExtra = null }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const token = {};
    stack.push(token);

    const onKey = (e) => {
      if (stack.at(-1) !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      // Mantiene el foco dentro del modal
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
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
      stack.splice(stack.indexOf(token), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open]);

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
          <div className="overflow-y-auto overscroll-contain">{children}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
