import { useEffect } from 'react';
import { LazyMotion, MotionConfig, domAnimation, useReducedMotion } from 'motion/react';
import { ReactLenis, useLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';

/**
 * Lleva las anclas internas (href="#...") a través de Lenis.
 * La opción `anchors` de Lenis no frena el salto nativo del navegador, por eso se maneja acá.
 * El espacio para el header sticky lo da scroll-margin-top en index.css: Lenis lo respeta, y
 * también el salto nativo (con "reducir movimiento"), así hay una sola fuente de verdad.
 */
function AnclasConLenis() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target.closest?.('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      const destino = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      if (!destino) return;
      e.preventDefault();
      lenis.scrollTo(destino, {
        // Al llegar, el foco pasa a la sección (como el ancla nativa): el próximo Tab sigue desde ahí
        onComplete: () => {
          if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
          destino.focus({ preventScroll: true });
        },
      });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [lenis]);

  return null;
}

/**
 * Proveedores de animación de la tienda (no se cargan en /admin):
 * - Motion con LazyMotion + domAnimation y el componente `m` (strict: falla si alguien usa motion.*).
 *   No se usa domMax: en motion 14 suma ~18 KB gzip solo por layout/layoutId. El reacomodo del
 *   grid se hace con FLIP propio (lib/useFlip.js).
 * - MotionConfig reducedMotion="user": con "reducir movimiento" se apagan los desplazamientos.
 * - Lenis (scroll suave) solo si el usuario no pidió reducir movimiento. Sin syncTouch:
 *   en mobile queda el scroll nativo.
 */
export default function StoreProviders({ children }) {
  const reducir = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {reducir ? (
          children
        ) : (
          <ReactLenis root options={{ lerp: 0.09 }}>
            <AnclasConLenis />
            {children}
          </ReactLenis>
        )}
      </MotionConfig>
    </LazyMotion>
  );
}
