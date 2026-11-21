import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatARS, imgUrl, onImgError } from '../lib/format';
import SizePicker from './SizePicker';

export function stockBadge(producto) {
  if (producto.stock_total === 0) return { label: 'Agotado', cls: 'bg-zinc-800 text-zinc-300' };
  if (producto.stock_total <= 4) return { label: 'Últimas unidades', cls: 'bg-orange-500 text-ink' };
  if (producto.destacado) return { label: 'Destacado', cls: 'bg-acid text-ink' };
  return null;
}

/** Si hay un solo talle con stock (ej. accesorios), lo preselecciona. */
export function talleInicial(producto) {
  const disponibles = producto.talles.filter((t) => t.stock > 0);
  return disponibles.length === 1 ? disponibles[0].talle : '';
}

export default function ProductCard({ producto, onOpen, talleFiltro }) {
  const { addItem } = useCart();
  const [talle, setTalle] = useState(() => {
    const filtroOk = talleFiltro && producto.talles.some((t) => t.talle === talleFiltro && t.stock > 0);
    return filtroOk ? talleFiltro : talleInicial(producto);
  });
  const [aviso, setAviso] = useState(false);
  const [ok, setOk] = useState(false);
  const badge = stockBadge(producto);
  const agotado = producto.stock_total === 0;

  const agregar = () => {
    if (!talle) {
      setAviso(true);
      return;
    }
    if (addItem(producto, talle)) {
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-ink-2 transition hover:border-zinc-700">
      <button
        type="button"
        onClick={() => onOpen(producto)}
        className="relative block aspect-[4/5] overflow-hidden bg-ink-3"
        aria-label={`Ver detalle de ${producto.nombre}`}
      >
        <img
          src={imgUrl(producto.imagen_url, 600)} onError={onImgError}
          alt={producto.nombre}
          loading="lazy"
          decoding="async"
          width="600"
          height="750"
          className={`size-full object-cover transition duration-500 group-hover:scale-105 ${agotado ? 'opacity-40 grayscale' : ''}`}
        />
        {badge && (
          <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">{producto.categoria}</p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-base">
            <button type="button" onClick={() => onOpen(producto)} className="text-left hover:underline">
              {producto.nombre}
            </button>
          </h3>
          <p className="mt-1 font-display text-xl text-acid sm:text-2xl">{formatARS(producto.precio)}</p>
        </div>

        <div className="mt-auto space-y-2">
          <SizePicker
            talles={producto.talles}
            value={talle}
            onChange={(t) => {
              setTalle(t);
              setAviso(false);
            }}
          />
          {aviso && <p className="text-xs font-medium text-orange-400">Elegí un talle primero</p>}
          <button
            type="button"
            onClick={agregar}
            disabled={agotado}
            className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold uppercase tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-3 disabled:text-zinc-600 ${
              ok ? 'bg-white text-ink' : 'bg-acid text-ink hover:bg-acid-deep'
            }`}
          >
            {agotado ? (
              'Agotado'
            ) : ok ? (
              <>
                <Check className="size-4" strokeWidth={3} /> Listo
              </>
            ) : (
              <>
                <Plus className="size-4" strokeWidth={3} />
                <span className="sm:hidden">Agregar</span>
                <span className="hidden sm:inline">Agregar al carrito</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
