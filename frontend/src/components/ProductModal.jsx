import { useState } from 'react';
import { m } from 'motion/react';
import { Minus, Plus, Ruler, Truck, ShoppingBag } from 'lucide-react';
import AnimatedModal from './AnimatedModal';
import SizePicker from './SizePicker';
import { WhatsAppIcon } from './BrandIcons';
import { useCart } from '../context/CartContext';
import { formatARS, imgUrl, onImgError } from '../lib/format';
import { CATEGORIA_A_GUIA } from '../lib/constants';
import { waLink, mensajeConsulta } from '../lib/whatsapp';
import { talleInicial } from './ProductCard';
import { TAP } from '../lib/motion';

function Detalle({ producto, onClose, onOpenSizeGuide }) {
  const { addItem, items, open: openCart } = useCart();
  const [talle, setTalle] = useState(() => talleInicial(producto));
  const [cantidad, setCantidad] = useState(1);
  const [aviso, setAviso] = useState(false);

  const stockTalle = producto.talles.find((t) => t.talle === talle)?.stock ?? 0;
  const enCarrito = items.find((i) => i.key === `${producto.id}-${talle}`)?.cantidad ?? 0;
  const maxAgregable = Math.max(0, stockTalle - enCarrito);
  const guia = CATEGORIA_A_GUIA[producto.categoria];
  const agotado = producto.stock_total === 0;

  const agregar = () => {
    if (!talle) return setAviso(true);
    if (addItem(producto, talle, cantidad)) {
      onClose();
      openCart();
    }
  };

  return (
    <div className="grid md:grid-cols-2">
      <div className="relative aspect-square bg-ink-3 sm:aspect-[4/5] md:aspect-auto md:min-h-[520px]">
        <img src={imgUrl(producto.imagen_url, 900)} onError={onImgError} alt={producto.nombre} className="absolute inset-0 size-full object-cover" />
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{producto.categoria}</p>
          <h3 className="mt-1 text-2xl font-bold leading-tight text-white">{producto.nombre}</h3>
          <p className="mt-2 font-display text-3xl text-acid">{formatARS(producto.precio)}</p>
        </div>

        {producto.descripcion && <p className="text-sm leading-relaxed text-zinc-400">{producto.descripcion}</p>}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Talle y stock</p>
            {guia && (
              <button
                type="button"
                onClick={() => onOpenSizeGuide(guia)}
                className="flex items-center gap-1.5 text-sm font-semibold text-acid hover:underline"
              >
                <Ruler className="size-4" /> Guía de talles
              </button>
            )}
          </div>
          <SizePicker
            talles={producto.talles}
            value={talle}
            size="lg"
            showStock
            onChange={(t) => {
              setTalle(t);
              setCantidad(1);
              setAviso(false);
            }}
          />
          {aviso && <p className="mt-2 text-sm font-medium text-orange-400">Elegí un talle para continuar</p>}
          {enCarrito > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              Ya tenés {enCarrito} en el carrito de este talle.
            </p>
          )}
        </div>

        {!agotado && (
          <div className="flex items-center gap-3">
            <div className="flex h-12 items-center rounded-xl border border-line bg-ink-3">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                disabled={cantidad <= 1}
                className="grid size-12 place-items-center text-zinc-300 disabled:text-zinc-700"
                aria-label="Restar una unidad"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">
                {cantidad}
              </span>
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.min(c + 1, Math.max(1, maxAgregable)))}
                disabled={!talle || cantidad >= maxAgregable}
                className="grid size-12 place-items-center text-zinc-300 disabled:text-zinc-700"
                aria-label="Sumar una unidad"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <m.button
              type="button"
              onClick={agregar}
              disabled={talle && maxAgregable === 0}
              whileTap={TAP}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-acid text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-acid-deep disabled:bg-ink-3 disabled:text-zinc-600"
            >
              <ShoppingBag className="size-4" strokeWidth={2.5} />
              {talle && maxAgregable === 0 ? 'Sin más stock' : 'Agregar al carrito'}
            </m.button>
          </div>
        )}

        <div className="space-y-2 border-t border-line pt-4 text-sm">
          <p className="flex items-center gap-2 text-zinc-400">
            <Truck className="size-4 text-acid" /> Envíos a todo el país · Retiro en el local
          </p>
          <a
            href={waLink(mensajeConsulta(producto))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-semibold text-zinc-300 hover:text-white"
          >
            <WhatsAppIcon className="size-4 text-wa" /> Consultar por esta prenda
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ProductModal({ producto, onClose, onOpenSizeGuide }) {
  // Durante la animación de salida "producto" ya es null: se sigue mostrando el último
  // para que el modal no se vacíe mientras se va
  const [ultimo, setUltimo] = useState(producto);
  if (producto && producto !== ultimo) setUltimo(producto);
  const visible = producto ?? ultimo;

  return (
    <AnimatedModal
      open={Boolean(producto)}
      onClose={onClose}
      title={visible?.nombre ?? ''}
      hideTitle
      size="lg"
      onExitComplete={() => setUltimo(null)}
    >
      {/* key: resetea talle/cantidad al cambiar de producto */}
      {visible && <Detalle key={visible.id} producto={visible} onClose={onClose} onOpenSizeGuide={onOpenSizeGuide} />}
    </AnimatedModal>
  );
}
