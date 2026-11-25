import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { RefreshCw, SearchX } from 'lucide-react';
import StoreProviders from '../components/StoreProviders';
import AnimatedModal from '../components/AnimatedModal';
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
import { VIEWPORT, cardFiltro, revelar } from '../lib/motion';
import { useFlip } from '../lib/useFlip';

// Cards del grid: reveal al entrar al viewport y salida corta al filtrar
const variantesCard = { ...revelar, salida: cardFiltro.salida };

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

  // Reacomodo animado del grid al filtrar (FLIP: solo transform, sin el paquete de layout de Motion)
  const gridRef = useRef(null);
  const reducir = useReducedMotion();
  useFlip(gridRef, `${estado}|${filtrados.map((p) => p.id).join(',')}`, { reducir });

  return (
    <StoreProviders>
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
              // relative: lo necesita AnimatePresence en modo popLayout para sacar del flujo las cards que se van
              <div ref={gridRef} className="relative grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {filtrados.map((p, i) => (
                    // Externo: lo mueve el FLIP al reacomodar. Interno: reveal y salida con Motion.
                    // Separados para que las dos animaciones de transform no se pisen.
                    <div key={p.id} data-flip={p.id} className="grid">
                      <m.div
                        className="grid"
                        variants={variantesCard}
                        // Stagger corto por columna (como mucho 4 por fila)
                        custom={(i % 4) * 0.06}
                        initial="oculto"
                        whileInView="visible"
                        viewport={VIEWPORT}
                        exit="salida"
                      >
                        <ProductCard
                          // La key interna resetea el talle elegido al cambiar el filtro de talle
                          // (la externa, el id, se mantiene para que la card se reacomode en vez de recrearse)
                          key={filtros.talle}
                          producto={p}
                          talleFiltro={filtros.talle}
                          onOpen={setDetalle}
                        />
                      </m.div>
                    </div>
                  ))}
                </AnimatePresence>
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
          Contenedor={AnimatedModal}
          open={chatAbierto}
          onClose={() => setChatAbierto(false)}
          productos={productos}
          onOpenProduct={setDetalle}
        />
      )}
      <CartDrawer onPedidoCreado={() => cargar({ silencioso: true })} />
    </StoreProviders>
  );
}
