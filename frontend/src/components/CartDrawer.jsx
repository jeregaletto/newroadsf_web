import { useState } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Truck, Store, CircleCheck, CircleAlert, LoaderCircle } from 'lucide-react';
import Modal from './Modal';
import { WhatsAppIcon } from './BrandIcons';
import { useCart } from '../context/CartContext';
import { api } from '../lib/api';
import { formatARS, imgUrl, onImgError } from '../lib/format';
import { MEDIOS_PAGO, TIPOS_ENTREGA, talleLabel } from '../lib/constants';
import { waLink, mensajePedido } from '../lib/whatsapp';

const DATOS_KEY = 'newroad-cliente';

function cargarDatos() {
  try {
    return JSON.parse(localStorage.getItem(DATOS_KEY)) ?? {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------
//  Paso 1: listado del carrito
// ---------------------------------------------------------------------
function PasoCarrito({ onCheckout }) {
  const { items, total, count, setCantidad, removeItem, close } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-ink-3">
          <ShoppingBag className="size-8 text-zinc-500" />
        </div>
        <p className="text-lg font-bold text-white">Tu carrito está vacío</p>
        <p className="text-sm text-zinc-400">Elegí tus prendas y armá tu pedido en segundos.</p>
        <button type="button" onClick={close} className="mt-2 h-12 rounded-full bg-acid px-8 text-sm font-extrabold uppercase text-ink">
          Ver catálogo
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5">
        {items.map((it) => (
          <li key={it.key} className="flex gap-3 py-4">
            <img src={imgUrl(it.imagen_url, 200)} onError={onImgError} alt="" className="size-20 shrink-0 rounded-xl object-cover" loading="lazy" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{it.nombre}</p>
                  <p className="text-xs text-zinc-500">
                    Talle <span className="font-bold text-zinc-300">{talleLabel(it.talle)}</span> · {formatARS(it.precio)} c/u
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(it.key)}
                  className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-white/5 hover:text-red-400"
                  aria-label={`Eliminar ${it.nombre} talle ${it.talle}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex h-9 items-center rounded-lg border border-line bg-ink-3">
                  <button
                    type="button"
                    onClick={() => setCantidad(it.key, it.cantidad - 1)}
                    className="grid size-9 place-items-center text-zinc-300"
                    aria-label="Restar una unidad"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums">{it.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => setCantidad(it.key, it.cantidad + 1)}
                    disabled={it.cantidad >= it.stockMax}
                    className="grid size-9 place-items-center text-zinc-300 disabled:text-zinc-700"
                    aria-label="Sumar una unidad"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <p className="font-bold tabular-nums text-white">{formatARS(it.precio * it.cantidad)}</p>
              </div>
              {it.cantidad >= it.stockMax && <p className="mt-1 text-[0.7rem] text-orange-400">Máximo disponible en este talle</p>}
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-line bg-ink p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Truck className="size-4 text-acid" /> Hacemos envíos a todo el país
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm text-zinc-400">
            Total ({count} {count === 1 ? 'prenda' : 'prendas'})
          </span>
          <span className="font-display text-3xl text-white">{formatARS(total)}</span>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-acid text-base font-extrabold uppercase tracking-wide text-ink transition hover:bg-acid-deep active:scale-[0.98]"
        >
          Finalizar pedido
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
//  Paso 2: formulario corto
// ---------------------------------------------------------------------
function OpcionRadio({ name, value, checked, onChange, children }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acid ${
        checked ? 'border-acid bg-acid/10' : 'border-line bg-ink-3 hover:border-zinc-600'
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-acid' : 'border-zinc-600'}`}>
        {checked && <span className="size-2.5 rounded-full bg-acid" />}
      </span>
      <span className="min-w-0">{children}</span>
    </label>
  );
}

function PasoCheckout({ onBack, onDone }) {
  const { items, total, clear } = useCart();
  const [form, setForm] = useState(() => ({
    cliente_nombre: '',
    localidad: '',
    ...cargarDatos(),
    tipo_entrega: 'envio',
    medio_pago: 'transferencia',
  }));
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorApi, setErrorApi] = useState('');

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrores((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.cliente_nombre.trim()) er.cliente_nombre = 'Contanos tu nombre';
    if (!form.localidad.trim()) er.localidad = 'Indicá tu ciudad y provincia';
    setErrores(er);
    if (Object.keys(er).length) return;

    setErrorApi('');
    setEnviando(true);

    // Abrimos la pestaña YA (dentro del click) para que el navegador no la bloquee
    // como popup; cuando el pedido se guarda, la mandamos a WhatsApp.
    const win = window.open('', '_blank');
    if (win) {
      win.opener = null;
      win.document.title = 'Abriendo WhatsApp…';
      win.document.body.style.cssText = 'background:#0a0a0a;color:#d4ff3a;font:600 18px system-ui;display:grid;place-items:center;height:100vh;margin:0';
      win.document.body.textContent = 'Abriendo WhatsApp…';
    }

    try {
      const pedido = await api.crearPedido({
        ...form,
        items: items.map((i) => ({ producto_id: i.producto_id, talle: i.talle, cantidad: i.cantidad })),
      });
      localStorage.setItem(DATOS_KEY, JSON.stringify({ cliente_nombre: form.cliente_nombre, localidad: form.localidad }));
      const url = waLink(mensajePedido(pedido));
      if (win && !win.closed) win.location.href = url;
      else window.location.href = url;
      clear();
      onDone(pedido, url);
    } catch (err) {
      win?.close();
      setErrorApi(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const inputCls = (k) =>
    `h-12 w-full rounded-xl border bg-ink-3 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none ${
      errores[k] ? 'border-red-500' : 'border-line focus:border-acid'
    }`;

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
        <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-white">
          <ArrowLeft className="size-4" /> Volver al carrito
        </button>

        <div>
          <label htmlFor="ck-nombre" className="mb-1.5 block text-sm font-semibold text-white">
            Nombre y apellido
          </label>
          <input
            id="ck-nombre"
            autoComplete="name"
            value={form.cliente_nombre}
            onChange={set('cliente_nombre')}
            placeholder="Ej: Juan Pérez"
            className={inputCls('cliente_nombre')}
            aria-invalid={Boolean(errores.cliente_nombre)}
            aria-describedby={errores.cliente_nombre ? 'ck-nombre-err' : undefined}
          />
          {errores.cliente_nombre && <p id="ck-nombre-err" className="mt-1 text-xs text-red-400">{errores.cliente_nombre}</p>}
        </div>

        <div>
          <label htmlFor="ck-localidad" className="mb-1.5 block text-sm font-semibold text-white">
            Ciudad / Provincia
          </label>
          <input
            id="ck-localidad"
            autoComplete="address-level2"
            value={form.localidad}
            onChange={set('localidad')}
            placeholder="Ej: Rosario, Santa Fe"
            className={inputCls('localidad')}
            aria-invalid={Boolean(errores.localidad)}
            aria-describedby={errores.localidad ? 'ck-localidad-err' : 'ck-localidad-help'}
          />
          {errores.localidad ? (
            <p id="ck-localidad-err" className="mt-1 text-xs text-red-400">{errores.localidad}</p>
          ) : (
            <p id="ck-localidad-help" className="mt-2 flex items-center gap-2 rounded-lg bg-acid/10 px-3 py-2 text-xs font-semibold text-acid">
              <Truck className="size-4 shrink-0" /> ¡Enviamos a todo el país!
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-white">Tipo de entrega</legend>
          <div className="grid gap-2">
            {TIPOS_ENTREGA.map((t) => (
              <OpcionRadio key={t.value} name="tipo_entrega" value={t.value} checked={form.tipo_entrega === t.value} onChange={set('tipo_entrega')}>
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  {t.value === 'retiro' ? <Store className="size-4" /> : <Truck className="size-4" />}
                  {t.label}
                </span>
                <span className="block text-xs text-zinc-400">{t.detalle}</span>
              </OpcionRadio>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-white">Medio de pago</legend>
          <div className="grid grid-cols-3 gap-2">
            {MEDIOS_PAGO.map((m) => (
              <label
                key={m.value}
                className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border text-xs font-bold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acid sm:text-sm ${
                  form.medio_pago === m.value ? 'border-acid bg-acid text-ink' : 'border-line bg-ink-3 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <input type="radio" name="medio_pago" value={m.value} checked={form.medio_pago === m.value} onChange={set('medio_pago')} className="sr-only" />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>

        {errorApi && (
          <div role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{errorApi}</span>
          </div>
        )}
      </div>

      <div className="border-t border-line bg-ink p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-end justify-between">
          <span className="text-sm text-zinc-400">Total a pagar</span>
          <span className="font-display text-3xl text-white">{formatARS(total)}</span>
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-wa text-base font-extrabold text-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {enviando ? <LoaderCircle className="size-5 animate-spin" /> : <WhatsAppIcon className="size-5" />}
          {enviando ? 'Guardando pedido…' : 'Confirmar y enviar por WhatsApp'}
        </button>
        <p className="mt-2 text-center text-[0.7rem] text-zinc-500">Coordinamos el pago y la entrega por WhatsApp</p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
//  Paso 3: confirmación
// ---------------------------------------------------------------------
function PasoListo({ pedido, url, onClose }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <CircleCheck className="size-16 text-acid" strokeWidth={1.5} />
      <p className="font-display text-4xl text-white">¡Pedido #{pedido.id}!</p>
      <p className="max-w-xs text-sm text-zinc-400">
        Lo registramos y te abrimos WhatsApp con el detalle. Enviá el mensaje y te respondemos para coordinar pago y entrega.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex h-12 items-center gap-2 rounded-full bg-wa px-6 text-sm font-extrabold text-ink"
      >
        <WhatsAppIcon className="size-5" /> ¿No se abrió? Abrir WhatsApp
      </a>
      <button type="button" onClick={onClose} className="text-sm font-semibold text-zinc-400 hover:text-white">
        Seguir comprando
      </button>
    </div>
  );
}

export default function CartDrawer({ onPedidoCreado }) {
  const { isOpen, close } = useCart();
  const [paso, setPaso] = useState('carrito');
  const [resultado, setResultado] = useState(null);

  const cerrar = () => {
    close();
    // La próxima vez que se abra, arranca desde el listado
    setPaso('carrito');
    setResultado(null);
  };

  const titulos = { carrito: 'Tu carrito', checkout: 'Finalizar pedido', listo: 'Pedido enviado' };

  return (
    <Modal open={isOpen} onClose={cerrar} title={titulos[paso]} variant="drawer">
      {paso === 'carrito' && <PasoCarrito onCheckout={() => setPaso('checkout')} />}
      {paso === 'checkout' && (
        <PasoCheckout
          onBack={() => setPaso('carrito')}
          onDone={(pedido, url) => {
            setResultado({ pedido, url });
            setPaso('listo');
            onPedidoCreado?.();
          }}
        />
      )}
      {paso === 'listo' && resultado && <PasoListo pedido={resultado.pedido} url={resultado.url} onClose={cerrar} />}
    </Modal>
  );
}
