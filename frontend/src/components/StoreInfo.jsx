import { m } from 'motion/react';
import { Clock, MapPin, Navigation } from 'lucide-react';
import { revelar, VIEWPORT } from '../lib/motion';
import { WhatsAppIcon } from './BrandIcons';
import { STORE, MAPS_EMBED_URL, MAPS_DIRECTIONS_URL } from '../lib/constants';
import { waLink, mensajeConsulta } from '../lib/whatsapp';

/** Abierto según el horario de Argentina (lun–sáb 9–13 y 16–20). */
function estadoActual() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Cordoba',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t) => partes.find((p) => p.type === t)?.value;
  const dia = get('weekday');
  const minutos = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
  if (dia === 'Sun') return false;
  return (minutos >= 540 && minutos < 780) || (minutos >= 960 && minutos < 1200);
}

export default function StoreInfo() {
  const abierto = estadoActual();

  return (
    // La sección (destino del ancla #local) no se mueve; se revela su contenido
    <section id="local" className="border-y border-line bg-ink-2">
      <m.div variants={revelar} initial="oculto" whileInView="visible" viewport={VIEWPORT}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-5 md:py-16">
        <div className="md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-acid">Visitanos</p>
          <h2 className="mt-2 font-display text-5xl leading-none text-white">El local</h2>
          <p className="mt-4 text-zinc-400">
            Vení a probarte las prendas o retirá tu pedido sin cargo. Te asesoramos con el talle y el calce.
          </p>

          <div className="mt-8 space-y-6">
            <div className="flex gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-3">
                <MapPin className="size-5 text-acid" />
              </div>
              <div>
                <p className="font-bold text-white">{STORE.direccion}</p>
                <p className="text-sm text-zinc-400">
                  {STORE.ciudad}, {STORE.provincia}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-3">
                <Clock className="size-5 text-acid" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-white">Horarios</p>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
                      abierto ? 'bg-acid/15 text-acid' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${abierto ? 'bg-acid animate-pulse' : 'bg-zinc-500'}`} />
                    {abierto ? 'Abierto ahora' : 'Cerrado ahora'}
                  </span>
                </div>
                <dl className="mt-2 space-y-2 text-sm">
                  {STORE.horarios.map((h) => (
                    <div key={h.dias} className="flex justify-between gap-4 border-b border-line/60 pb-2 last:border-0">
                      <dt className="text-zinc-400">{h.dias}</dt>
                      <dd className="text-right font-semibold text-zinc-200">
                        {h.turnos.map((t) => (
                          <span key={t} className="block">
                            {t}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <a
              href={MAPS_DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-ink transition hover:bg-zinc-200"
            >
              <Navigation className="size-4" /> Cómo llegar
            </a>
            <a
              href={waLink(mensajeConsulta())}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line text-sm font-bold text-white transition hover:bg-white/5"
            >
              <WhatsAppIcon className="size-4 text-wa" /> WhatsApp
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-line md:col-span-3">
          <iframe
            title={`Mapa: ${STORE.nombre}, ${STORE.direccion}`}
            src={MAPS_EMBED_URL}
            className="h-80 w-full grayscale-[0.4] invert-[0.9] hue-rotate-180 md:h-full md:min-h-[460px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
      </m.div>
    </section>
  );
}
