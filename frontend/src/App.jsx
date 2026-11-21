import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Store from './pages/Store';

// El panel se carga aparte: los clientes de la tienda no descargan ese código
const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <CartProvider>
            <Store />
          </CartProvider>
        }
      />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<div className="min-h-dvh bg-ink" />}>
            <Admin />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
