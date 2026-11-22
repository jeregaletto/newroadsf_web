import { useState } from 'react';
import { Tooltip, useAncho } from './base';
import { fechaLocal, formatARS, formatARSCompacto } from '../../lib/format';

// Más alto en pantallas anchas para aprovechar la tarjeta
const altoPlot = (ancho) => (ancho >= 640 ? 300 : 200);
const BANDA_X = 26; // espacio para las etiquetas del eje X (incluido en la altura del contenedor)
const MARGEN = { top: 22, right: 12, left: 58 };

const diaCorto = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'numeric' });
const diaSemana = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });
const diaLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Máximo "redondo" del eje y paso entre marcas (1, 2, 2.5 o 5 × 10^k). */
function escala(max, marcas = 4) {
  if (max <= 0) return { tope: 1, paso: 1 };
  const bruto = max / marcas;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto);
  return { tope: paso * Math.ceil(max / paso), paso };
}

/** Línea + área de una sola serie (ventas por día). `datos`: [{ fecha, ventas, pedidos }] */
export default function LineChart({ datos }) {
  const [ref, ancho] = useAncho();
  const [activo, setActivo] = useState(null);

  const ALTO_PLOT = altoPlot(ancho);
  const n = datos.length;
  const anchoPlot = Math.max(ancho - MARGEN.left - MARGEN.right, 10);
  const max = Math.max(...datos.map((d) => d.ventas), 0);
  const { tope, paso } = escala(max);
  const x = (i) => MARGEN.left + (n <= 1 ? anchoPlot / 2 : (i / (n - 1)) * anchoPlot);
  const y = (v) => MARGEN.top + ALTO_PLOT - (v / tope) * ALTO_PLOT;
  const base = MARGEN.top + ALTO_PLOT;

  const linea = datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.ventas).toFixed(1)}`).join('');
  const area = `${linea}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z`;
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);

  // Etiquetas del eje X: semana completa → días de la semana; si no, ~6 fechas repartidas
  const cadaCuanto = n <= 7 ? 1 : Math.ceil(n / 6);
  const etiquetasX = datos.map((d, i) => ({ i, d })).filter(({ i }) => (n - 1 - i) % cadaCuanto === 0);

  // Etiqueta selectiva: solo el pico del período
  const iMax = datos.reduce((m, d, i) => (d.ventas > datos[m].ventas ? i : m), 0);
  const hoy = n - 1;

  const elegir = (clientX, rect) => {
    const px = clientX - rect.left - MARGEN.left;
    setActivo(Math.min(n - 1, Math.max(0, Math.round((px / anchoPlot) * (n - 1)))));
  };

  const onKey = (e) => {
    if (e.key === 'ArrowRight') setActivo((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActivo((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === 'Home') setActivo(0);
    else if (e.key === 'End') setActivo(n - 1);
    else return;
    e.preventDefault();
  };

  const d = activo !== null ? datos[activo] : null;

  return (
    <div ref={ref} className="relative" style={{ height: ALTO_PLOT + MARGEN.top + BANDA_X }}>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={ALTO_PLOT + MARGEN.top + BANDA_X}
          className="block touch-pan-y outline-none focus-visible:outline-2 focus-visible:outline-acid"
          role="img"
          tabIndex={0}
          aria-label={`Ventas por día. Pico de ${formatARS(datos[iMax]?.ventas ?? 0)} el ${datos[iMax] ? diaLargo.format(fechaLocal(datos[iMax].fecha)) : ''}. Usá las flechas para recorrer los días.`}
          onPointerMove={(e) => elegir(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => elegir(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActivo(null)}
          onKeyDown={onKey}
          onBlur={() => setActivo(null)}
        >
          {/* Grilla (hairline, sólida, recesiva) y eje Y */}
          {marcas.map((v) => (
            <g key={v}>
              <line x1={MARGEN.left} x2={ancho - MARGEN.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--color-axis)' : 'var(--color-grid)'} strokeWidth="1" />
              <text x={MARGEN.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--color-muted)" className="tabular-nums">
                {formatARSCompacto(v)}
              </text>
            </g>
          ))}

          {/* Eje X */}
          {etiquetasX.map(({ i, d: p }) => (
            <text key={p.fecha} x={x(i)} y={base + 18} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--color-muted)">
              {n <= 7 ? diaSemana.format(fechaLocal(p.fecha)) : diaCorto.format(fechaLocal(p.fecha))}
            </text>
          ))}

          {/* Área (lavado ~10%) + línea de 2px */}
          <path d={area} fill="var(--color-viz)" fillOpacity="0.1" />
          <path d={linea} fill="none" stroke="var(--color-viz)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Pico: marcador con anillo de superficie + valor */}
          {datos[iMax]?.ventas > 0 && activo === null && (
            <g>
              <circle cx={x(iMax)} cy={y(datos[iMax].ventas)} r="4.5" fill="var(--color-viz)" stroke="var(--color-ink-2)" strokeWidth="2" />
              <text
                x={x(iMax)}
                y={y(datos[iMax].ventas) - 10}
                textAnchor={iMax < n * 0.15 ? 'start' : iMax > n * 0.85 ? 'end' : 'middle'}
                fontSize="11"
                fontWeight="600"
                fill="#f0efec"
              >
                Pico {formatARSCompacto(datos[iMax].ventas)}
              </text>
            </g>
          )}

          {/* Cursor: línea vertical que encuentra el día */}
          {d && (
            <g>
              <line x1={x(activo)} x2={x(activo)} y1={MARGEN.top} y2={base} stroke="var(--color-muted)" strokeWidth="1" />
              <circle cx={x(activo)} cy={y(d.ventas)} r="4.5" fill="var(--color-viz)" stroke="var(--color-ink-2)" strokeWidth="2" />
            </g>
          )}
        </svg>
      )}

      {d && (
        <Tooltip
          x={x(activo)}
          y={y(d.ventas)}
          ancho={ancho}
          titulo={`${diaLargo.format(fechaLocal(d.fecha))}${activo === hoy ? ' · hoy (parcial)' : ''}`}
          filas={[
            { valor: formatARS(d.ventas), etiqueta: 'ventas', color: 'var(--color-viz)' },
            { valor: d.pedidos, etiqueta: d.pedidos === 1 ? 'pedido' : 'pedidos' },
          ]}
        />
      )}
    </div>
  );
}
