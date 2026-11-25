import { useEffect, useRef } from 'react';
import { m } from 'motion/react';
import { RESORTE } from '../lib/motion';

/**
 * Muestra un valor y hace un "bump" (escala breve) cada vez que sube, por ejemplo al agregar
 * al carrito. No anima en la primera carga ni cuando el valor baja.
 */
export default function ContadorBump({ valor, children, className = '' }) {
  const previo = useRef(valor);
  const subio = valor > previo.current;
  useEffect(() => {
    previo.current = valor;
  }, [valor]);

  return (
    <m.span
      key={valor}
      className={`inline-block ${className}`}
      initial={subio ? { scale: 1.35 } : false}
      animate={{ scale: 1 }}
      transition={RESORTE}
    >
      {children ?? valor}
    </m.span>
  );
}
