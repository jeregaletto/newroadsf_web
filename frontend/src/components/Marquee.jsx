const FRASES = [
  'Envíos a todo el país',
  'Todos los medios de pago',
  'Retiro en el local · Santa Fe',
  'Nueva temporada',
  'Pedí por WhatsApp',
];

export default function Marquee() {
  const fila = (ariaHidden) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {FRASES.map((f) => (
        <span key={f} className="flex items-center gap-6 px-6">
          {f}
          <span className="text-ink/40">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden bg-acid py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-ink">
      <div className="flex w-max animate-marquee">
        {fila(false)}
        {fila(true)}
      </div>
    </div>
  );
}
