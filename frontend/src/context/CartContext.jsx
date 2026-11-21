import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'newroad-cart-v1';

function cargarCarrito() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(cargarCarrito);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const showToast = useCallback((mensaje) => {
    clearTimeout(toastTimer.current);
    setToast({ mensaje, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /** Agrega `cantidad` unidades respetando el stock disponible del talle. */
  const addItem = useCallback(
    (producto, talle, cantidad = 1) => {
      const stockMax = producto.talles.find((t) => t.talle === talle)?.stock ?? 0;
      const key = `${producto.id}-${talle}`;
      const actual = items.find((i) => i.key === key)?.cantidad ?? 0;
      const nueva = Math.min(actual + cantidad, stockMax);
      if (nueva <= actual) {
        showToast(actual > 0 ? 'Ya tenés en el carrito todo el stock de ese talle' : 'Sin stock en ese talle');
        return false;
      }
      setItems((prev) => {
        if (prev.some((i) => i.key === key)) {
          return prev.map((i) => (i.key === key ? { ...i, cantidad: nueva, stockMax, precio: producto.precio } : i));
        }
        return [
          ...prev,
          {
            key,
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen_url: producto.imagen_url,
            categoria: producto.categoria,
            talle,
            cantidad: nueva,
            stockMax,
          },
        ];
      });
      showToast(`Agregado: ${producto.nombre} · ${talle === 'U' ? 'Talle único' : `Talle ${talle}`}`);
      return true;
    },
    [items, showToast],
  );

  const setCantidad = useCallback((key, cantidad) => {
    setItems((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, cantidad: Math.max(0, Math.min(cantidad, i.stockMax)) } : i))
        .filter((i) => i.cantidad > 0),
    );
  }, []);

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((acc, i) => acc + i.cantidad, 0);
    const total = items.reduce((acc, i) => acc + i.cantidad * i.precio, 0);
    return {
      items,
      count,
      total,
      addItem,
      setCantidad,
      removeItem,
      clear,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toast,
      showToast,
    };
  }, [items, isOpen, toast, addItem, setCantidad, removeItem, clear, showToast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
