import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';

// Tienda y panel se cargan por separado: el panel no descarga la tienda (ni Motion ni Lenis)
// y los clientes de la tienda no descargan el panel.
const cargarStore = () => import('./pages/Store');
// La tienda empieza a bajarse apenas arranca la app (salvo en /admin), sin esperar al primer render
if (!window.location.pathname.startsWith('/admin')) cargarStore();

const Store = lazy(cargarStore);
const Admin = lazy(() => import('./pages/Admin'));

const Cargando = () => <div className="min-h-dvh bg-ink" />;

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <CartProvider>
            <Suspense fallback={<Cargando />}>
              <Store />
            </Suspense>
          </CartProvider>
        }
      />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<Cargando />}>
            <Admin />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
