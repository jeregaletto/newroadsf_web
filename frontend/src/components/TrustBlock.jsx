import { m } from 'motion/react';
import { revelar, VIEWPORT } from '../lib/motion';
import { Truck, CreditCard, Store, MessageCircle, Banknote, ArrowLeftRight } from 'lucide-react';

export default function TrustBlock() {
  return (
    // La sección (destino del ancla #envios) no se mueve, así Lenis calcula bien el destino; se revela su contenido
    <section id="envios" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <m.div variants={revelar} initial="oculto" whileInView="visible" viewport={VIEWPORT}>
      <div className="grid gap-3 md:grid-cols-2">
        {/* Bloques destacados */}
        <div className="relative overflow-hidden rounded-3xl bg-acid p-6 text-ink sm:p-8">
          <Truck className="absolute -bottom-6 -right-6 size-40 opacity-10" strokeWidth={1.5} />
          <Truck className="size-8" strokeWidth={2.2} />
          <h2 className="mt-4 font-display text-4xl leading-none sm:text-5xl">Envíos a todo el país</h2>
          <p className="mt-3 max-w-sm text-sm font-medium text-ink/75 sm:text-base">
            Despachamos a cualquier provincia por correo o transporte. Si sos de Santa Fe, también podés retirar en el
            local.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-line bg-ink-2 p-6 sm:p-8">
          <CreditCard className="absolute -bottom-6 -right-6 size-40 text-white opacity-5" strokeWidth={1.5} />
          <CreditCard className="size-8 text-acid" strokeWidth={2.2} />
          <h2 className="mt-4 font-display text-4xl leading-none text-white sm:text-5xl">Todos los medios de pago</h2>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {[
              { icon: Banknote, label: 'Efectivo' },
              { icon: ArrowLeftRight, label: 'Transferencia' },
              { icon: CreditCard, label: 'Tarjetas de crédito y débito' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-full border border-line bg-ink-3 px-3 py-1.5 text-zinc-300">
                <Icon className="size-4 text-acid" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-ink-2 p-4">
          <Store className="mt-0.5 size-5 shrink-0 text-acid" />
          <div>
            <p className="text-sm font-bold text-white">Retiro sin cargo</p>
            <p className="text-xs text-zinc-400">En nuestro local de Santa Fe</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-ink-2 p-4">
          <MessageCircle className="mt-0.5 size-5 shrink-0 text-acid" />
          <div>
            <p className="text-sm font-bold text-white">Atención real</p>
            <p className="text-xs text-zinc-400">Te respondemos por WhatsApp</p>
          </div>
        </div>
      </div>
      </m.div>
    </section>
  );
}
