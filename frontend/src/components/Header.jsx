import { useRef, useState } from 'react';
import { m, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ShoppingBag, Ruler } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Logo } from './BrandIcons';
import ContadorBump from './ContadorBump';
import { DURACION, EASE, TAP } from '../lib/motion';

const LINKS = [
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#local', label: 'El local' },
  { href: '#envios', label: 'Envíos y pagos' },
];

// Debajo de esta altura el header siempre se ve (incluye el marquee y el arranque del hero)
const ZONA_SIEMPRE_VISIBLE = 160;
// Movimiento mínimo para cambiar de estado (evita parpadeos con el trackpad)
const UMBRAL = 8;

export default function Header({ onOpenSizeGuide }) {
  const { count, open } = useCart();
  const reducir = useReducedMotion();
  const { scrollY } = useScroll();
  const [oculto, setOculto] = useState(false);
  const ultimo = useRef(0);

  // Ocultar al bajar, mostrar al subir. Solo cambia el estado al invertir la dirección:
  // no hay re-render por frame.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const delta = y - ultimo.current;
    if (Math.abs(delta) < UMBRAL) return;
    ultimo.current = y;
    const ocultar = !reducir && y > ZONA_SIEMPRE_VISIBLE && delta > 0;
    if (ocultar !== oculto) setOculto(ocultar);
  });

  // Fondo con blur que aparece al empezar a scrollear (solo opacidad, ligado al scroll)
  const opacidadFondo = useTransform(scrollY, [0, 48], [0, 1]);

  return (
    <m.header
      className="sticky top-0 z-40"
      animate={{ y: oculto ? '-100%' : 0 }}
      transition={{ duration: DURACION.base, ease: EASE }}
      // Si el foco entra al header (Tab), se muestra aunque se esté bajando
      onFocusCapture={() => setOculto(false)}
    >
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 border-b border-line/80 bg-ink/85 backdrop-blur-md"
        style={{ opacity: opacidadFondo }}
      />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <a href="#top" aria-label="New Road Indumentaria — inicio" className="shrink-0">
          <Logo />
        </a>

        <nav className="ml-8 hidden items-center gap-7 text-sm font-medium text-zinc-400 md:flex" aria-label="Principal">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSizeGuide}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <Ruler className="size-4" />
            <span className="hidden sm:inline">Guía de talles</span>
            <span className="sr-only sm:hidden">Guía de talles</span>
          </button>

          <m.button
            type="button"
            onClick={open}
            whileTap={TAP}
            className="relative flex h-10 items-center gap-2 rounded-full bg-acid px-4 text-sm font-bold text-ink transition-colors hover:bg-acid-deep"
            aria-label={`Abrir carrito (${count} ${count === 1 ? 'prenda' : 'prendas'})`}
          >
            <ShoppingBag className="size-4" strokeWidth={2.5} />
            <ContadorBump valor={count} className="tabular-nums" />
          </m.button>
        </div>
      </div>
    </m.header>
  );
}
