import { ShoppingBag, Ruler } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Logo } from './BrandIcons';

const LINKS = [
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#local', label: 'El local' },
  { href: '#envios', label: 'Envíos y pagos' },
];

export default function Header({ onOpenSizeGuide }) {
  const { count, open } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
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

          <button
            type="button"
            onClick={open}
            className="relative flex h-10 items-center gap-2 rounded-full bg-acid px-4 text-sm font-bold text-ink transition hover:bg-acid-deep active:scale-95"
            aria-label={`Abrir carrito (${count} ${count === 1 ? 'prenda' : 'prendas'})`}
          >
            <ShoppingBag className="size-4" strokeWidth={2.5} />
            <span className="tabular-nums">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
