import { AnimatePresence, m } from 'motion/react';
import { ShoppingBag, Sparkles } from 'lucide-react';
import { WhatsAppIcon } from './BrandIcons';
import { useCart } from '../context/CartContext';
import { formatARS } from '../lib/format';
import { waLink, mensajeConsulta } from '../lib/whatsapp';
import { TAP, toast as toastVariantes } from '../lib/motion';
import ContadorBump from './ContadorBump';

/**
 * Mobile: barra inferior fija (WhatsApp + asistente + carrito) que nunca tapa las tarjetas.
 * Desktop: burbujas flotantes de asistente y WhatsApp.
 */
export default function FloatingActions({ chatDisponible, onOpenChat }) {
  const { count, total, open, toast } = useCart();

  return (
    <>
      {/* Región viva siempre montada (así los lectores de pantalla anuncian cada aviso); el toast entra y sale adentro */}
      <div role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
        <AnimatePresence mode="wait">
          {toast && (
            <m.div
              key={toast.id}
              variants={toastVariantes}
              initial="oculto"
              animate="visible"
              exit="salida"
              className="w-full max-w-sm rounded-2xl border border-line bg-white px-4 py-3 text-center text-sm font-semibold text-ink shadow-2xl"
            >
              {toast.mensaje}
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop */}
      <div className="fixed bottom-8 right-8 z-40 hidden flex-col items-end gap-3 md:flex">
        {chatDisponible && (
          <m.button
            type="button"
            onClick={onOpenChat}
            whileHover={{ scale: 1.04 }}
            whileTap={TAP}
            className="group flex h-14 items-center gap-2 rounded-full bg-acid pl-5 pr-6 font-extrabold text-ink shadow-lg shadow-black/40"
          >
            <Sparkles className="size-5" strokeWidth={2.5} />
            ¿Te ayudo a elegir?
          </m.button>
        )}
        <m.a
          href={waLink(mensajeConsulta())}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          whileHover={{ scale: 1.04 }}
          whileTap={TAP}
          className="grid size-14 place-items-center rounded-full bg-wa text-white shadow-lg shadow-black/40"
        >
          <WhatsAppIcon className="size-7" />
        </m.a>
      </div>

      {/* Mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-line bg-ink/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <m.a
          href={waLink(mensajeConsulta())}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          whileTap={TAP}
          className={`flex h-13 shrink-0 items-center justify-center gap-2 rounded-2xl bg-wa font-extrabold text-ink ${
            count > 0 || chatDisponible ? 'w-13' : 'flex-1 text-sm'
          }`}
        >
          <WhatsAppIcon className="size-6" />
          {count === 0 && !chatDisponible && 'Consultanos por WhatsApp'}
        </m.a>

        {chatDisponible && (
          <m.button
            type="button"
            onClick={onOpenChat}
            aria-label="Abrir asistente"
            whileTap={TAP}
            className={`flex h-13 items-center justify-center gap-2 rounded-2xl font-extrabold ${
              count > 0 ? 'w-13 shrink-0 border border-line bg-ink-3 text-acid' : 'flex-1 bg-white text-sm text-ink'
            }`}
          >
            <Sparkles className="size-5" strokeWidth={2.5} />
            {count === 0 && '¿Te ayudo a elegir?'}
          </m.button>
        )}

        {count > 0 && (
          <m.button
            type="button"
            onClick={open}
            whileTap={TAP}
            className="flex h-13 flex-1 items-center justify-between rounded-2xl bg-acid px-4 font-extrabold text-ink"
          >
            <span className="flex items-center gap-2 text-sm uppercase">
              <ShoppingBag className="size-5" strokeWidth={2.5} />
              <span>
                Carrito (<ContadorBump valor={count} />)
              </span>
            </span>
            <span className="font-display text-xl">{formatARS(total)}</span>
          </m.button>
        )}
      </div>
    </>
  );
}
