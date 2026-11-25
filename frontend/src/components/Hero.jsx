import { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, MapPin } from 'lucide-react';
import { WhatsAppIcon } from './BrandIcons';
import { STORE } from '../lib/constants';
import { waLink, mensajeConsulta } from '../lib/whatsapp';
import { PARALLAX, TAP, hero } from '../lib/motion';

// Ojo: index.html precarga estas mismas URLs (LCP). Si cambia la imagen, actualizar ahí también.
const HERO_IMG =
  'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=75';

/** Palabra del título que sube desde atrás de una máscara. El padding vertical deja aire para la tilde de "Í". */
function Mascara({ children, className = '' }) {
  return (
    <span className={`inline-block overflow-hidden pb-[0.04em] pt-[0.14em] align-bottom ${className}`}>
      <m.span className="inline-block" variants={hero.linea}>
        {children}
      </m.span>
    </span>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const reducir = useReducedMotion();
  // Parallax del fondo mientras el hero sale de pantalla. Solo transform: nunca toca la opacidad de la imagen (LCP).
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', PARALLAX.desplazamiento]);

  return (
    <section id="top" ref={ref} className="relative isolate overflow-hidden">
      <picture>
        <source media="(min-width: 768px)" srcSet={`${HERO_IMG}&w=1800`} />
        <m.img
          src={`${HERO_IMG}&w=900`}
          alt=""
          className="absolute inset-0 -z-20 size-full object-cover object-[60%_20%]"
          fetchPriority="high"
          // Con "reducir movimiento" no hay parallax (ni la escala que lo compensa)
          style={reducir ? undefined : { y, scale: PARALLAX.escala }}
        />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/20 md:bg-gradient-to-r md:from-ink md:via-ink/75 md:to-transparent" />
      <div className="grain absolute inset-0 -z-10 opacity-60" />

      <m.div
        className="mx-auto flex min-h-[72svh] max-w-7xl flex-col justify-end px-4 pb-10 pt-16 sm:px-6 md:min-h-[640px] md:justify-center md:pb-16"
        variants={hero.contenedor}
        initial="oculto"
        animate="visible"
      >
        <m.p
          variants={hero.item}
          className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur"
        >
          <MapPin className="size-3.5 text-acid" />
          {STORE.direccion} · {STORE.ciudad}
        </m.p>

        <m.h1 variants={hero.contenedor} className="font-display text-[3.6rem] leading-[0.88] text-white sm:text-7xl md:text-8xl">
          <span className="block">
            <Mascara>Vestí</Mascara>
          </span>
          {/* Espacio explícito: sin él, el texto (y los lectores de pantalla) leen "Vestíla calle." */}{' '}
          <span className="-mt-[0.18em] block">
            <Mascara>la</Mascara> <Mascara className="text-acid">calle.</Mascara>
          </span>
        </m.h1>

        <m.p variants={hero.item} className="mt-5 max-w-md text-base text-zinc-300 sm:text-lg">
          Ropa urbana con calce oversize, telas pesadas y precios reales. Elegí tu talle, armá el pedido y lo
          coordinamos por WhatsApp.
        </m.p>

        <m.div variants={hero.item} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <m.a
            href="#catalogo"
            whileTap={TAP}
            className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-acid px-7 text-sm font-extrabold uppercase tracking-wide text-ink transition-colors hover:bg-acid-deep"
          >
            Ver catálogo
            <ArrowRight className="size-4 transition group-hover:translate-x-1" strokeWidth={2.5} />
          </m.a>
          <m.a
            href={waLink(mensajeConsulta())}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={TAP}
            className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/10"
          >
            <WhatsAppIcon className="size-4 text-wa" />
            Escribinos
          </m.a>
        </m.div>
      </m.div>
    </section>
  );
}
