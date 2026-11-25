// Constantes de animación de la tienda: easings, duraciones y variants compartidos.
// Regla de la casa: solo se anima transform y opacity (y clipPath en reveals de texto),
// animaciones cortas y con intención. Nada que demore la compra.

/** Easing base: salida rápida y frenado suave (el mismo que usaban los keyframes CSS). */
export const EASE = [0.2, 0.8, 0.2, 1];
/** Para salidas: acelera hacia el final, así lo que se va no "se queda". */
export const EASE_SALIDA = [0.4, 0, 1, 1];

export const DURACION = {
  rapida: 0.15, // microinteracciones, salidas
  base: 0.28, // modales, drawer, toast
  reveal: 0.5, // entradas al viewport
};

/** Resorte corto para el "bump" de contadores y el indicador de talle. */
export const RESORTE = { type: 'spring', stiffness: 520, damping: 32, mass: 0.8 };

/** Feedback de tap compartido por los CTAs. */
export const TAP = { scale: 0.97 };

/** Opciones del viewport para reveals al hacer scroll: una sola vez, un poco antes de llegar. */
export const VIEWPORT = { once: true, margin: '-10%' };

// ---------------------------------------------------------------------
//  Variants
// ---------------------------------------------------------------------

/** Fade + slide corto hacia arriba (secciones y cards). */
export const revelar = {
  oculto: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: DURACION.reveal, ease: EASE, delay } }),
};

/** Backdrop de modales y drawer. */
export const fondo = {
  oculto: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURACION.base, ease: EASE } },
  salida: { opacity: 0, transition: { duration: DURACION.rapida, ease: EASE_SALIDA } },
};

/** Drawer lateral (carrito, asistente): entra desde la derecha. */
export const drawer = {
  oculto: { x: '100%' },
  visible: { x: 0, transition: { duration: DURACION.base, ease: EASE } },
  salida: { x: '100%', transition: { duration: 0.22, ease: EASE_SALIDA } },
};

/** Modal en mobile: sube como bottom-sheet. */
export const sheet = {
  oculto: { y: '100%' },
  visible: { y: 0, transition: { duration: DURACION.base, ease: EASE } },
  salida: { y: '100%', transition: { duration: 0.22, ease: EASE_SALIDA } },
};

/** Modal en desktop: scale + fade. */
export const dialogo = {
  oculto: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURACION.base, ease: EASE } },
  salida: { opacity: 0, scale: 0.97, transition: { duration: DURACION.rapida, ease: EASE_SALIDA } },
};

/** Toast: sube un poco al entrar, baja al salir. */
export const toast = {
  oculto: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: DURACION.base, ease: EASE } },
  salida: { opacity: 0, y: 8, transition: { duration: DURACION.rapida, ease: EASE_SALIDA } },
};

/** Cards del catálogo al filtrar (entrada/salida dentro del grid). */
export const cardFiltro = {
  oculto: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURACION.base, ease: EASE } },
  salida: { opacity: 0, scale: 0.96, transition: { duration: DURACION.rapida, ease: EASE_SALIDA } },
};

/** Reacomodo del grid al filtrar (FLIP con Web Animations API, ver lib/useFlip.js). */
export const FLIP = { duracionMs: 350, easing: `cubic-bezier(${EASE.join(', ')})` };

/** Indicador del talle elegido: aparece con scale + fade. */
export const indicadorTalle = {
  oculto: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: RESORTE },
};

// ---------------------------------------------------------------------
//  Hero: secuencia de entrada (total ≤ 0.8 s)
// ---------------------------------------------------------------------
export const hero = {
  contenedor: { visible: { transition: { staggerChildren: 0.07 } } },
  item: {
    oculto: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  },
  /** Cada línea del H1 sube desde atrás de una máscara (overflow hidden). */
  linea: {
    oculto: { y: '105%' },
    visible: { y: 0, transition: { duration: 0.5, ease: EASE } },
  },
};

/** Parallax del fondo del hero: desplazamiento máximo y escala para no dejar bordes al moverse. */
export const PARALLAX = { desplazamiento: '8%', escala: 1.18 };
