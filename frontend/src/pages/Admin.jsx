import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, CircleAlert, Eye, EyeOff, LoaderCircle, Package, Plus, Receipt, RefreshCw, Save, Search,
  Store as StoreIcon, Truck, Wallet, Check, LogOut,
} from 'lucide-react';
import { Logo, WhatsAppIcon } from '../components/BrandIcons';
import AdminLogin from '../components/AdminLogin';
import { api, EVENTO_SESION_VENCIDA } from '../lib/api';
import { formatARS, formatFecha, imgUrl, onImgError } from '../lib/format';
import { CATEGORIAS, ESTADOS_PEDIDO, MEDIOS_PAGO, TIPOS_ENTREGA, labelDe, talleLabel } from '../lib/constants';

const POLL_MS = 8000;

const ESTADO_CLS = {
  pendiente: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  confirmado: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
  enviado: 'bg-violet-400/15 text-violet-300 border-violet-400/30',
  entregado: 'bg-acid/15 text-acid border-acid/30',
  cancelado: 'bg-zinc-700/40 text-zinc-400 border-zinc-600',
};

const tallesDeCategoria = (categoria) => (categoria === 'Accesorios' ? ['U'] : ['S', 'M', 'L', 'XL', 'XXL']);

// =====================================================================
//  Pedidos
// =====================================================================
function PedidoCard({ pedido, onEstado }) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const unidades = pedido.items.reduce((a, i) => a + i.cantidad, 0);

  const cambiarEstado = async (e) => {
    const estado = e.target.value;
    if (estado === 'cancelado' && !confirm(`¿Cancelar el pedido #${pedido.id}? El stock vuelve a estar disponible.`)) return;
    setGuardando(true);
    await onEstado(pedido.id, estado);
    setGuardando(false);
  };

  return (
    <li className={`rounded-2xl border border-line bg-ink-2 ${pedido.estado === 'cancelado' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={abierto}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-3 font-display text-lg text-white">
            #{pedido.id}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-white">{pedido.cliente_nombre}</span>
            <span className="block truncate text-xs text-zinc-500">
              {formatFecha(pedido.created_at)} · {pedido.localidad}
            </span>
          </span>
          <ChevronDown className={`ml-auto size-4 shrink-0 text-zinc-500 transition ${abierto ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <span className="hidden items-center gap-1 rounded-full bg-ink-3 px-2.5 py-1 text-xs text-zinc-300 lg:flex">
            {pedido.tipo_entrega === 'envio' ? <Truck className="size-3.5" /> : <StoreIcon className="size-3.5" />}
            {labelDe(TIPOS_ENTREGA, pedido.tipo_entrega)}
          </span>
          <span className="hidden rounded-full bg-ink-3 px-2.5 py-1 text-xs text-zinc-300 lg:inline">
            {labelDe(MEDIOS_PAGO, pedido.medio_pago)}
          </span>
          <span className="font-display text-xl text-white">{formatARS(pedido.total)}</span>
          <div className="relative ml-auto sm:ml-2">
            <select
              value={pedido.estado}
              onChange={cambiarEstado}
              disabled={guardando || pedido.estado === 'cancelado'}
              aria-label={`Estado del pedido #${pedido.id}`}
              className={`h-9 appearance-none rounded-full border py-0 pl-3 pr-8 text-xs font-bold capitalize ${ESTADO_CLS[pedido.estado]} disabled:cursor-not-allowed`}
            >
              {ESTADOS_PEDIDO.map((e) => (
                <option key={e} value={e} className="bg-ink-2 text-white">
                  {e}
                </option>
              ))}
            </select>
            {guardando ? (
              <LoaderCircle className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin" />
            ) : (
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-60" />
            )}
          </div>
        </div>
      </div>

      {abierto && (
        <div className="border-t border-line px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap gap-2 text-xs lg:hidden">
            <span className="rounded-full bg-ink-3 px-2.5 py-1 text-zinc-300">{labelDe(TIPOS_ENTREGA, pedido.tipo_entrega)}</span>
            <span className="rounded-full bg-ink-3 px-2.5 py-1 text-zinc-300">{labelDe(MEDIOS_PAGO, pedido.medio_pago)}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="pb-2 font-semibold">Prenda</th>
                <th className="pb-2 font-semibold">Talle</th>
                <th className="pb-2 text-right font-semibold">Cant.</th>
                <th className="pb-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.items.map((it) => (
                <tr key={it.id} className="border-t border-line/60 text-zinc-300">
                  <td className="py-2 pr-2">{it.nombre_producto}</td>
                  <td className="py-2 font-bold">{talleLabel(it.talle)}</td>
                  <td className="py-2 text-right tabular-nums">{it.cantidad}</td>
                  <td className="py-2 text-right tabular-nums">{formatARS(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line text-white">
                <td colSpan={2} className="pt-2 text-xs text-zinc-500">
                  {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
                </td>
                <td colSpan={2} className="pt-2 text-right font-bold">
                  {formatARS(pedido.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </li>
  );
}

function PedidosPanel({ pedidos, onEstado }) {
  const [filtro, setFiltro] = useState('');
  const lista = filtro ? pedidos.filter((p) => p.estado === filtro) : pedidos;

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {['', ...ESTADOS_PEDIDO].map((e) => (
          <button
            key={e || 'todos'}
            type="button"
            onClick={() => setFiltro(e)}
            className={`h-9 shrink-0 rounded-full border px-4 text-xs font-bold capitalize transition ${
              filtro === e ? 'border-acid bg-acid text-ink' : 'border-line text-zinc-400 hover:text-white'
            }`}
          >
            {e || 'Todos'} ({e ? pedidos.filter((p) => p.estado === e).length : pedidos.length})
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-zinc-500">
          No hay pedidos {filtro && `en estado “${filtro}”`}. Hacé uno desde la tienda y aparece acá en segundos.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((p) => (
            <PedidoCard key={p.id} pedido={p} onEstado={onEstado} />
          ))}
        </ul>
      )}
    </div>
  );
}

// =====================================================================
//  Productos
// =====================================================================
function stockMap(producto) {
  const base = Object.fromEntries(tallesDeCategoria(producto.categoria).map((t) => [t, 0]));
  for (const t of producto.talles) base[t.talle] = t.stock;
  return base;
}

function ProductoRow({ producto, onSaved, notify }) {
  const [precio, setPrecio] = useState(String(producto.precio));
  const [stock, setStock] = useState(() => stockMap(producto));
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  // Si el producto cambia desde afuera (ej. una venta), sincroniza el formulario
  useEffect(() => {
    setPrecio(String(producto.precio));
    setStock(stockMap(producto));
  }, [producto]);

  const original = stockMap(producto);
  const tallesCambiados = Object.keys(stock).filter((t) => Number(stock[t]) !== (original[t] ?? 0));
  const precioCambiado = Number(precio) !== producto.precio;
  const dirty = precioCambiado || tallesCambiados.length > 0;
  const precioInvalido = precio === '' || Number(precio) < 0 || Number.isNaN(Number(precio));
  const stockInvalido = Object.values(stock).some((v) => v === '' || !Number.isInteger(Number(v)) || Number(v) < 0);
  const total = Object.values(stock).reduce((a, v) => a + (Number(v) || 0), 0);

  const guardar = async () => {
    setGuardando(true);
    try {
      let actualizado = producto;
      if (precioCambiado) actualizado = await api.actualizarProducto(producto.id, { precio: Number(precio) });
      if (tallesCambiados.length) {
        actualizado = await api.actualizarTalles(
          producto.id,
          tallesCambiados.map((t) => ({ talle: t, stock: Number(stock[t]) })),
        );
      }
      onSaved(actualizado);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async () => {
    try {
      onSaved(await api.actualizarProducto(producto.id, { activo: !producto.activo }));
      notify(producto.activo ? 'Producto oculto de la tienda' : 'Producto visible en la tienda');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <li className={`rounded-2xl border bg-ink-2 p-3 sm:p-4 ${dirty ? 'border-acid/50' : 'border-line'} ${producto.activo ? '' : 'opacity-60'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3 lg:w-72 lg:shrink-0">
          <img src={imgUrl(producto.imagen_url, 160)} onError={onImgError} alt="" className="size-14 shrink-0 rounded-xl object-cover" loading="lazy" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{producto.nombre}</p>
            <p className="text-xs text-zinc-500">
              {producto.categoria} · <span className={total === 0 ? 'text-red-400' : total <= 4 ? 'text-orange-400' : ''}>{total} u. en stock</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 lg:flex-1">
          <label className="w-32">
            <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">Precio ARS</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="100"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className={`h-10 w-full rounded-lg border bg-ink-3 pl-7 pr-2 text-sm font-semibold tabular-nums text-white focus:outline-none ${
                  precioInvalido ? 'border-red-500' : precioCambiado ? 'border-acid' : 'border-line focus:border-acid'
                }`}
              />
            </span>
          </label>

          <div className="flex flex-wrap gap-1.5">
            {Object.keys(stock).map((t) => (
              <label key={t} className="w-14">
                <span className="mb-1 block text-center text-[0.65rem] font-bold uppercase text-zinc-500">{talleLabel(t)}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={stock[t]}
                  onChange={(e) => setStock((s) => ({ ...s, [t]: e.target.value }))}
                  aria-label={`Stock talle ${t}`}
                  className={`h-10 w-full rounded-lg border bg-ink-3 text-center text-sm font-semibold tabular-nums focus:outline-none ${
                    Number(stock[t]) !== (original[t] ?? 0)
                      ? 'border-acid text-white'
                      : Number(stock[t]) === 0
                        ? 'border-line text-red-400'
                        : 'border-line text-white focus:border-acid'
                  }`}
                />
              </label>
            ))}
          </div>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={toggleActivo}
              className="grid size-10 place-items-center rounded-lg border border-line text-zinc-400 hover:text-white"
              title={producto.activo ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}
              aria-label={producto.activo ? `Ocultar ${producto.nombre} de la tienda` : `Mostrar ${producto.nombre} en la tienda`}
            >
              {producto.activo ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={!dirty || guardando || precioInvalido || stockInvalido}
              className={`flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed ${
                ok ? 'bg-white text-ink' : 'bg-acid text-ink hover:bg-acid-deep disabled:bg-ink-3 disabled:text-zinc-600'
              }`}
            >
              {guardando ? <LoaderCircle className="size-4 animate-spin" /> : ok ? <Check className="size-4" /> : <Save className="size-4" />}
              {ok ? 'Guardado' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

const PRODUCTO_VACIO = {
  nombre: '',
  categoria: 'Remeras',
  precio: '',
  imagen_url: '',
  descripcion: '',
  destacado: false,
};

function NuevoProducto({ onCreated, notify }) {
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(PRODUCTO_VACIO);
  const [stock, setStock] = useState({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const cambiarCategoria = (e) => {
    const categoria = e.target.value;
    setForm((f) => ({ ...f, categoria }));
    setStock(Object.fromEntries(tallesDeCategoria(categoria).map((t) => [t, 0])));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const creado = await api.crearProducto({
        ...form,
        precio: Number(form.precio),
        talles: Object.entries(stock).map(([talle, s]) => ({ talle, stock: Number(s) || 0 })),
      });
      onCreated(creado);
      notify(`“${creado.nombre}” ya está publicado en la tienda`);
      setForm(PRODUCTO_VACIO);
      setStock({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
      setAbierto(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const inputCls =
    'h-11 w-full rounded-lg border border-line bg-ink-3 px-3 text-sm text-white placeholder:text-zinc-600 focus:border-acid focus:outline-none';

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-sm font-bold text-zinc-300 transition hover:border-acid hover:text-acid"
      >
        <Plus className="size-5" /> Agregar producto nuevo
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-acid/40 bg-ink-2 p-4 sm:p-5">
      <p className="mb-4 font-display text-2xl text-white">Nuevo producto</p>
      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Nombre *</span>
            <input required value={form.nombre} onChange={set('nombre')} placeholder="Ej: Remera Oversize Lavada Gris" className={inputCls} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Categoría *</span>
            <select value={form.categoria} onChange={cambiarCategoria} className={inputCls}>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Precio (ARS) *</span>
            <input required type="number" min="0" step="100" inputMode="numeric" value={form.precio} onChange={set('precio')} placeholder="29900" className={inputCls} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">URL de la foto *</span>
            <input required type="url" value={form.imagen_url} onChange={set('imagen_url')} placeholder="https://…" className={inputCls} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Descripción</span>
            <textarea
              rows={2}
              value={form.descripcion}
              onChange={set('descripcion')}
              placeholder="Tela, calce, detalles…"
              className={`${inputCls} h-auto py-2.5`}
            />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Stock por talle</span>
            <div className="flex flex-wrap gap-2">
              {Object.keys(stock).map((t) => (
                <label key={t} className="w-16">
                  <span className="mb-1 block text-center text-[0.65rem] font-bold uppercase text-zinc-500">{talleLabel(t)}</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={stock[t]}
                    onChange={(e) => setStock((s) => ({ ...s, [t]: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-line bg-ink-3 text-center text-sm font-semibold text-white focus:border-acid focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
            <input type="checkbox" checked={form.destacado} onChange={set('destacado')} className="size-4 accent-[#d4ff3a]" />
            Mostrar como destacado
          </label>
        </div>

        <div className="aspect-[4/5] overflow-hidden rounded-xl border border-line bg-ink-3">
          {form.imagen_url ? (
            <img src={form.imagen_url} alt="Vista previa" className="size-full object-cover" onError={(e) => (e.currentTarget.style.opacity = 0.15)} />
          ) : (
            <div className="grid size-full place-items-center p-4 text-center text-xs text-zinc-600">Vista previa de la foto</div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-red-400">
          <CircleAlert className="size-4" /> {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="h-11 rounded-lg px-4 text-sm font-semibold text-zinc-400 hover:text-white">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="flex h-11 items-center gap-2 rounded-lg bg-acid px-5 text-sm font-bold text-ink hover:bg-acid-deep disabled:opacity-60">
          {guardando ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Publicar producto
        </button>
      </div>
    </form>
  );
}

function ProductosPanel({ productos, setProductos, notify }) {
  const [q, setQ] = useState('');
  const lista = q ? productos.filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase())) : productos;
  const reemplazar = (p) => setProductos((prev) => prev.map((x) => (x.id === p.id ? p : x)));

  return (
    <div className="space-y-3">
      <NuevoProducto onCreated={(p) => setProductos((prev) => [p, ...prev])} notify={notify} />
      <label className="relative block">
        <span className="sr-only">Buscar producto</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto…"
          className="h-11 w-full rounded-xl border border-line bg-ink-2 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-acid focus:outline-none"
        />
      </label>
      <ul className="space-y-2">
        {lista.map((p) => (
          <ProductoRow key={p.id} producto={p} onSaved={reemplazar} notify={notify} />
        ))}
      </ul>
    </div>
  );
}

// =====================================================================
//  Página
// =====================================================================
function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-2 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <Icon className="size-4 text-acid" /> {label}
      </div>
      <p className="mt-2 font-display text-2xl text-white sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Panel({ usuario, onLogout }) {
  const [tab, setTab] = useState('pedidos');
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(null);
  const [ultimaSync, setUltimaSync] = useState(null);

  const notify = useCallback((mensaje, tipo = 'ok') => {
    setAviso({ mensaje, tipo, id: Date.now() });
    setTimeout(() => setAviso((a) => (a?.mensaje === mensaje ? null : a)), 3000);
  }, []);

  const cargarPedidos = useCallback(async () => {
    const data = await api.getPedidos();
    setPedidos(data);
    setUltimaSync(new Date());
  }, []);

  const cargarTodo = useCallback(async () => {
    setError('');
    try {
      const [ped, prod] = await Promise.all([api.getPedidos(), api.getProductos({ todos: '1' })]);
      setPedidos(ped);
      setProductos(prod);
      setUltimaSync(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Panel · New Road';
    cargarTodo();
    // "Tiempo real": los pedidos nuevos aparecen solos
    const id = setInterval(() => cargarPedidos().catch(() => {}), POLL_MS);
    return () => clearInterval(id);
  }, [cargarTodo, cargarPedidos]);

  const cambiarEstado = async (id, estado) => {
    try {
      const actualizado = await api.actualizarEstadoPedido(id, estado);
      setPedidos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
      // Si se canceló, el stock cambió: refrescamos productos
      if (estado === 'cancelado') setProductos(await api.getProductos({ todos: '1' }));
      notify(`Pedido #${id} → ${estado}`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const stats = useMemo(() => {
    const validos = pedidos.filter((p) => p.estado !== 'cancelado');
    return {
      ventas: validos.reduce((a, p) => a + p.total, 0),
      pendientes: pedidos.filter((p) => p.estado === 'pendiente').length,
      sinStock: productos.filter((p) => p.activo && p.talles.some((t) => t.stock === 0)).length,
      total: validos.length,
    };
  }, [pedidos, productos]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <span className="rounded-md bg-acid px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wider text-ink">Panel</span>
          <Link to="/" className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-zinc-400 hover:bg-white/5 hover:text-white">
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Ver tienda</span>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
            title={`Sesión iniciada como ${usuario}`}
          >
            <LogOut className="size-4" /> <span className="hidden sm:inline">Salir</span>
            <span className="sr-only sm:hidden">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl text-white">Hola, New Road 👋</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-acid opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-acid" />
              </span>
              En vivo · {ultimaSync ? `actualizado ${ultimaSync.toLocaleTimeString('es-AR')}` : 'conectando…'}
            </p>
          </div>
          <button
            type="button"
            onClick={cargarTodo}
            className="flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-zinc-300 hover:text-white"
          >
            <RefreshCw className="size-4" /> Actualizar
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Wallet} label="Ventas" value={formatARS(stats.ventas)} hint="Sin contar cancelados" />
          <Stat icon={Receipt} label="Pedidos" value={stats.total} />
          <Stat icon={WhatsAppIcon} label="Pendientes" value={stats.pendientes} hint="A confirmar por WhatsApp" />
          <Stat icon={Package} label="Con talles agotados" value={stats.sinStock} hint="Productos para reponer" />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-ink-2 p-1 sm:inline-grid sm:w-auto" role="tablist">
          {[
            { id: 'pedidos', label: `Pedidos (${pedidos.length})`, icon: Receipt },
            { id: 'productos', label: `Productos (${productos.length})`, icon: Package },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                tab === t.id ? 'bg-acid text-ink' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="flex justify-center py-20">
            <LoaderCircle className="size-8 animate-spin text-acid" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-300">
            <p>{error}</p>
            <p className="mt-1 text-xs text-red-300/70">¿Está corriendo el backend en el puerto 3001?</p>
          </div>
        ) : tab === 'pedidos' ? (
          <PedidosPanel pedidos={pedidos} onEstado={cambiarEstado} />
        ) : (
          <ProductosPanel productos={productos} setProductos={setProductos} notify={notify} />
        )}
      </main>

      {aviso && (
        <div
          key={aviso.id}
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-2xl animate-toast ${
            aviso.tipo === 'error' ? 'bg-red-500 text-white' : 'bg-white text-ink'
          }`}
        >
          {aviso.mensaje}
        </div>
      )}
    </div>
  );
}

// =====================================================================
//  Acceso: verifica la sesión antes de mostrar el panel
// =====================================================================
export default function Admin() {
  const [estado, setEstado] = useState('verificando'); // verificando | login | ok
  const [usuario, setUsuario] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    document.title = 'Panel · New Road';
    api
      .sesion()
      .then((r) => {
        setUsuario(r.usuario);
        setEstado('ok');
      })
      .catch(() => setEstado('login'));

    // Si cualquier llamada del panel devuelve 401, se vuelve al login
    const onVencida = () => {
      setAviso('Tu sesión venció. Ingresá de nuevo.');
      setEstado('login');
    };
    window.addEventListener(EVENTO_SESION_VENCIDA, onVencida);
    return () => window.removeEventListener(EVENTO_SESION_VENCIDA, onVencida);
  }, []);

  const salir = async () => {
    await api.logout().catch(() => {});
    setAviso('');
    setUsuario('');
    setEstado('login');
  };

  if (estado === 'verificando') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoaderCircle className="size-8 animate-spin text-acid" aria-label="Verificando sesión" />
      </div>
    );
  }

  if (estado === 'login') {
    return (
      <AdminLogin
        aviso={aviso}
        onLogin={(u) => {
          setUsuario(u);
          setAviso('');
          setEstado('ok');
        }}
      />
    );
  }

  return <Panel usuario={usuario} onLogout={salir} />;
}
