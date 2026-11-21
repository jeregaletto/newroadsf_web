import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, SearchX } from 'lucide-react';
import Header from '../components/Header';
import Marquee from '../components/Marquee';
import Hero from '../components/Hero';
import TrustBlock from '../components/TrustBlock';
import CatalogFilters from '../components/CatalogFilters';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import SizeGuideModal from '../components/SizeGuideModal';
import CartDrawer from '../components/CartDrawer';
import StoreInfo from '../components/StoreInfo';
import Footer from '../components/Footer';
import FloatingActions from '../components/FloatingActions';
import ChatAssistant from '../components/ChatAssistant';
import { api } from '../lib/api';

const normalizar = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function Skeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-line bg-ink-2">
      <div className="aspect-[4/5] bg-ink-3" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 rounded bg-ink-3" />
        <div className="h-4 w-4/5 rounded bg-ink-3" />
        <div className="h-6 w-1/2 rounded bg-ink-3" />
        <div className="h-11 rounded-xl bg-ink-3" />
      </div>
    </div>
  );
}

export default function Store() {
  const [productos, setProductos] = useState([]);
  const [estado, setEstado] = useState('cargando'); // cargando | ok | error
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({ q: '', categoria: '', talle: '' });
  const [detalle, setDetalle] = useState(null);
  const [guia, setGuia] = useState({ open: false, tipo: 'remeras' });
  const [chatAbierto, setChatAbierto] = useState(false);
  const [chatDisponible, setChatDisponible] = useState(false);

  // El asistente solo se muestra si el backend tiene configurada la API de Gemini
  useEffect(() => {
    api
      .chatEstado()
      .then((r) => setChatDisponible(Boolean(r?.disponible)))
      .catch(() => setChatDisponible(false));
  }, []);

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setEstado('cargando');
    try {
      const data = await api.getProductos();
      setProductos(data);
      setEstado('ok');
    } catch (err) {
      if (!silencioso) {
        setError(err.message);
        setEstado('error');
      }
    }
  }, []);

  useEffect(() => {
    cargar();
    // Al volver a la pestaña (ej. después de editar en /admin) refresca precios y stock
    const onVisible = () => document.visibilityState === 'visible' && cargar({ silencioso: true });
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [cargar]);

  // Mantiene el detalle abierto sincronizado con el stock más reciente
  const detalleActual = detalle ? (productos.find((p) => p.id === detalle.id) ?? detalle) : null;

  const filtrados = useMemo(() => {
    const q = normalizar(filtros.q.trim());
    return productos.filter((p) => {
      if (filtros.categoria && p.categoria !== filtros.categoria) return false;
      if (filtros.talle && !p.talles.some((t) => t.talle === filtros.talle && t.stock > 0)) return false;
      if (q && !normalizar(`${p.nombre} ${p.categoria} ${p.descripcion ?? ''}`).includes(q)) return false;
      return true;
    });
  }, [productos, filtros]);

  const abrirGuia = (tipo) => setGuia({ open: true, tipo: tipo ?? 'remeras' });

  return (
    <>
      <Marquee />
      <Header onOpenSizeGuide={() => abrirGuia()} />

      <main>
        <Hero />

        <section id="catalogo" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 md:pt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-acid">Temporada 2026</p>
              <h2 className="mt-1 font-display text-5xl leading-none text-white sm:text-6xl">Catálogo</h2>
            </div>
          </div>

          <CatalogFilters filtros={filtros} setFiltros={setFiltros} total={filtrados.length} />

          <div className="mt-6">
            {estado === 'cargando' && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} />
                ))}
              </div>
            )}

            {estado === 'error' && (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-ink-2 p-10 text-center">
                <p className="text-zinc-300">{error}</p>
                <button
                  type="button"
                  onClick={() => cargar()}
                  className="flex h-11 items-center gap-2 rounded-full bg-acid px-6 text-sm font-bold text-ink"
                >
                  <RefreshCw className="size-4" /> Reintentar
                </button>
              </div>
            )}

            {estado === 'ok' && filtrados.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line p-10 text-center">
                <SearchX className="size-10 text-zinc-600" />
                <p className="font-semibold text-white">No encontramos prendas con esos filtros</p>
                <button
                  type="button"
                  onClick={() => setFiltros({ q: '', categoria: '', talle: '' })}
                  className="text-sm font-semibold text-acid hover:underline"
                >
                  Ver todo el catálogo
                </button>
              </div>
            )}

            {estado === 'ok' && filtrados.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filtrados.map((p) => (
                  <ProductCard
                    // El key incluye el filtro de talle para preseleccionarlo al filtrar
                    key={`${p.id}-${filtros.talle}`}
                    producto={p}
                    talleFiltro={filtros.talle}
                    onOpen={setDetalle}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <TrustBlock />
        <StoreInfo />
      </main>

      <Footer />
      <FloatingActions chatDisponible={chatDisponible} onOpenChat={() => setChatAbierto(true)} />

      <ProductModal producto={detalleActual} onClose={() => setDetalle(null)} onOpenSizeGuide={abrirGuia} />
      <SizeGuideModal open={guia.open} tipo={guia.tipo} onClose={() => setGuia((g) => ({ ...g, open: false }))} />
      {chatDisponible && (
        <ChatAssistant
          open={chatAbierto}
          onClose={() => setChatAbierto(false)}
          productos={productos}
          onOpenProduct={setDetalle}
        />
      )}
      <CartDrawer onPedidoCreado={() => cargar({ silencioso: true })} />
    </>
  );
}
