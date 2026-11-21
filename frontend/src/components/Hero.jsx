import { ArrowRight, MapPin } from 'lucide-react';
import { WhatsAppIcon } from './BrandIcons';
import { STORE } from '../lib/constants';
import { waLink, mensajeConsulta } from '../lib/whatsapp';

const HERO_IMG =
  'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=75';

export default function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <picture>
        <source media="(min-width: 768px)" srcSet={`${HERO_IMG}&w=1800`} />
        <img
          src={`${HERO_IMG}&w=900`}
          alt=""
          className="absolute inset-0 -z-20 size-full object-cover object-[60%_20%]"
          fetchPriority="high"
        />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/20 md:bg-gradient-to-r md:from-ink md:via-ink/75 md:to-transparent" />
      <div className="grain absolute inset-0 -z-10 opacity-60" />

      <div className="mx-auto flex min-h-[72svh] max-w-7xl flex-col justify-end px-4 pb-10 pt-16 sm:px-6 md:min-h-[640px] md:justify-center md:pb-16">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
          <MapPin className="size-3.5 text-acid" />
          {STORE.direccion} · {STORE.ciudad}
        </p>

        <h1 className="font-display text-[3.6rem] leading-[0.88] text-white sm:text-7xl md:text-8xl">
          Vestí
          <br />
          la <span className="text-acid">calle.</span>
        </h1>

        <p className="mt-5 max-w-md text-base text-zinc-300 sm:text-lg">
          Ropa urbana con calce oversize, telas pesadas y precios reales. Elegí tu talle, armá el pedido y lo
          coordinamos por WhatsApp.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#catalogo"
            className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-acid px-7 text-sm font-extrabold uppercase tracking-wide text-ink transition hover:bg-acid-deep active:scale-[0.98]"
          >
            Ver catálogo
            <ArrowRight className="size-4 transition group-hover:translate-x-1" strokeWidth={2.5} />
          </a>
          <a
            href={waLink(mensajeConsulta())}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
          >
            <WhatsAppIcon className="size-4 text-wa" />
            Escribinos
          </a>
        </div>
      </div>
    </section>
  );
}
