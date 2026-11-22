import { useCallback, useEffect, useState } from 'react';
import {
  Boxes, CircleAlert, CircleCheck, CircleX, Hash, LoaderCircle, PackageX, Receipt, RefreshCw, Shirt, TrendingDown,
  TriangleAlert, Wallet,
} from 'lucide-react';
import { api } from '../../lib/api';
import { fechaLocal, formatARS } from '../../lib/format';
import { MEDIOS_PAGO, TIPOS_ENTREGA, labelDe, talleLabel } from '../../lib/constants';
import { ChartCard, StatTile } from '../charts/base';
import LineChart from '../charts/LineChart';
import { BarList, ColumnChart, SegmentedBar } from '../charts/Bars';

const PERIODOS = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
];

// Estados reservados: color + ícono + texto (nunca color solo)
const NIVEL = {
  agotado: { label: 'Agotado', icono: CircleX, color: 'var(--color-st-critical)' },
  critico: { label: 'Crítico', icono: TriangleAlert, color: 'var(--color-st-serious)' },
  bajo: { label: 'Bajo', icono: TrendingDown, color: 'var(--color-st-warning)' },
};

const fechaCorta = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' });
const num = (n) => n.toLocaleString('es-AR');

function Seccion({ titulo, descripcion, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-2xl text-white">{titulo}</h2>
        {descripcion && <p className="text-sm text-muted">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

function AlertasStock({ alertas, diasVelocidad }) {
  if (!alertas.length) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-line p-4 text-sm text-zinc-300">
        <CircleCheck className="size-5 text-st-good" aria-hidden="true" /> Sin alertas: todo el stock cubre más de 3 semanas de ventas.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">Alertas de reposición por producto y talle</caption>
        <thead className="text-left text-xs text-muted">
          <tr>
            <th scope="col" className="pb-2 font-semibold">Estado</th>
            <th scope="col" className="pb-2 font-semibold">Producto</th>
            <th scope="col" className="pb-2 text-right font-semibold">Stock</th>
            <th scope="col" className="pb-2 text-right font-semibold" title={`Unidades vendidas en los últimos ${diasVelocidad} días`}>
              Vendidas {diasVelocidad}d
            </th>
            <th scope="col" className="pb-2 text-right font-semibold" title="Días que alcanza el stock al ritmo de venta actual">
              Cobertura
            </th>
            <th scope="col" className="pb-2 text-right font-semibold">Reponer</th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((a) => {
            const n = NIVEL[a.nivel];
            return (
              <tr key={`${a.producto_id}-${a.talle}`} className="border-t border-line text-zinc-300">
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-zinc-200">
                    <n.icono className="size-4" style={{ color: n.color }} aria-hidden="true" />
                    {n.label}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="text-white">{a.nombre}</span>
                  <span className="ml-1.5 rounded bg-ink-3 px-1.5 py-0.5 text-xs font-bold text-zinc-300">{talleLabel(a.talle)}</span>
                </td>
                <td className="py-2.5 text-right tabular-nums">{a.stock}</td>
                <td className="py-2.5 text-right tabular-nums">{a.vendidas_30d}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {a.cobertura_dias === null ? <span className="text-muted">sin ventas</span> : `${a.cobertura_dias} días`}
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-white">
                  {a.reponer_sugerido > 0 ? `+${a.reponer_sugerido}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">
        Cobertura = días que dura el stock al ritmo de venta de los últimos {diasVelocidad} días. Reponer = unidades para cubrir 30
        días. Crítico: 10 días o menos · Bajo: 21 días o menos.
      </p>
    </div>
  );
}

export default function MetricasPanel() {
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async (d) => {
    setCargando(true);
    setError('');
    try {
      setDatos(await api.getMetricas(d));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(dias);
  }, [dias, cargar]);

  if (!datos) {
    return error ? (
      <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-300">{error}</p>
    ) : (
      <div className="flex justify-center py-20">
        <LoaderCircle className="size-8 animate-spin text-acid" aria-label="Cargando métricas" />
      </div>
    );
  }

  const { resumen: r, stock: s } = datos;
  const totalCategorias = datos.por_categoria.reduce((a, c) => a + c.ingresos, 0);
  const alertasCriticas = s.alertas.filter((a) => a.nivel !== 'bajo').length;

  return (
    <div className="space-y-8">
      {/* Filtro: una fila arriba de todo lo que afecta */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-line bg-ink-2 p-1" role="radiogroup" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              role="radio"
              aria-checked={dias === p.dias}
              onClick={() => setDias(p.dias)}
              className={`h-9 rounded-lg px-4 text-sm font-bold transition ${dias === p.dias ? 'bg-acid text-ink' : 'text-zinc-400 hover:text-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          Últimos {dias} días, comparado con los {dias} anteriores
        </p>
        <button
          type="button"
          onClick={() => cargar(dias)}
          className="ml-auto flex h-9 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold text-zinc-300 hover:text-white"
        >
          <RefreshCw className={`size-4 ${cargando ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-400">
          <CircleAlert className="size-4" /> {error}
        </p>
      )}

      {/* Al recargar se mantiene el gráfico anterior atenuado (sin parpadeo) */}
      <div className={`space-y-8 transition-opacity ${cargando ? 'opacity-50' : ''}`} aria-busy={cargando}>
        <Seccion titulo="Ventas" descripcion="Excluye pedidos cancelados.">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icono={Wallet} etiqueta="Ventas" valor={formatARS(r.ventas)} variacion={r.variacion_pct.ventas} />
            <StatTile icono={Receipt} etiqueta="Pedidos" valor={num(r.pedidos)} variacion={r.variacion_pct.pedidos} />
            <StatTile icono={Hash} etiqueta="Ticket promedio" valor={formatARS(r.ticket_promedio)} variacion={r.variacion_pct.ticket_promedio} />
            <StatTile icono={Shirt} etiqueta="Prendas vendidas" valor={num(r.unidades)} variacion={r.variacion_pct.unidades} />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              titulo="Ventas por día"
              subtitulo={`${r.pendientes_a_confirmar} pedidos pendientes de confirmar`}
              tabla={{
                columnas: ['Día', 'Ventas', 'Pedidos'],
                alinear: ['left', 'right', 'right'],
                filas: [...datos.ventas_por_dia].reverse().map((d) => [fechaCorta.format(fechaLocal(d.fecha)), formatARS(d.ventas), d.pedidos]),
              }}
            >
              <LineChart datos={datos.ventas_por_dia} />
            </ChartCard>

            <ChartCard
              titulo="Más vendidos"
              subtitulo="Unidades en el período"
              tabla={{
                columnas: ['Producto', 'Unidades', 'Ingresos'],
                alinear: ['left', 'right', 'right'],
                filas: datos.mas_vendidos.map((p) => [p.nombre, p.unidades, formatARS(p.ingresos)]),
              }}
            >
              <BarList
                nombreValor="unidades"
                items={datos.mas_vendidos.map((p) => ({
                  id: p.producto_id,
                  etiqueta: p.nombre,
                  valor: p.unidades,
                  texto: num(p.unidades),
                  detalle: [{ valor: formatARS(p.ingresos), etiqueta: 'ingresos' }],
                }))}
              />
            </ChartCard>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <ChartCard
              titulo="Ventas por categoría"
              subtitulo="Ingresos en el período"
              tabla={{
                columnas: ['Categoría', 'Ingresos', 'Unidades', '% ingresos'],
                alinear: ['left', 'right', 'right', 'right'],
                filas: datos.por_categoria.map((c) => [
                  c.categoria,
                  formatARS(c.ingresos),
                  c.unidades,
                  `${totalCategorias ? Math.round((c.ingresos / totalCategorias) * 100) : 0}%`,
                ]),
              }}
            >
              <BarList
                nombreValor="ingresos"
                items={datos.por_categoria.map((c) => ({
                  id: c.categoria,
                  etiqueta: c.categoria,
                  valor: c.ingresos,
                  texto: formatARS(c.ingresos),
                  detalle: [
                    { valor: num(c.unidades), etiqueta: 'unidades' },
                    { valor: `${totalCategorias ? Math.round((c.ingresos / totalCategorias) * 100) : 0}%`, etiqueta: 'de los ingresos' },
                  ],
                }))}
              />
            </ChartCard>

            <ChartCard
              titulo="Talles más vendidos"
              subtitulo="Unidades en el período"
              tabla={{
                columnas: ['Talle', 'Unidades'],
                alinear: ['left', 'right'],
                filas: datos.por_talle.map((t) => [talleLabel(t.talle), t.unidades]),
              }}
            >
              <ColumnChart
                nombreValor="unidades"
                items={datos.por_talle.map((t) => ({ etiqueta: talleLabel(t.talle), valor: t.unidades, texto: num(t.unidades) }))}
              />
            </ChartCard>

            <ChartCard
              titulo="Cómo compran"
              subtitulo="Pedidos por medio de pago y entrega"
              className="md:col-span-2 lg:col-span-1"
              tabla={{
                columnas: ['Tipo', 'Opción', 'Pedidos', 'Monto'],
                alinear: ['left', 'left', 'right', 'right'],
                filas: [
                  ...datos.medios_pago.map((m) => ['Pago', labelDe(MEDIOS_PAGO, m.valor), m.pedidos, formatARS(m.total)]),
                  ...datos.tipos_entrega.map((m) => ['Entrega', labelDe(TIPOS_ENTREGA, m.valor), m.pedidos, formatARS(m.total)]),
                ],
              }}
            >
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-xs font-semibold text-zinc-400">Medio de pago</p>
                  <SegmentedBar
                    titulo="Medio de pago"
                    orden={MEDIOS_PAGO.map((m) => m.value)}
                    partes={datos.medios_pago.map((m) => ({
                      clave: m.valor,
                      etiqueta: labelDe(MEDIOS_PAGO, m.valor),
                      valor: m.pedidos,
                      texto: `${m.pedidos} pedidos`,
                    }))}
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-zinc-400">Entrega</p>
                  <SegmentedBar
                    titulo="Tipo de entrega"
                    orden={TIPOS_ENTREGA.map((t) => t.value)}
                    partes={datos.tipos_entrega.map((m) => ({
                      clave: m.valor,
                      etiqueta: labelDe(TIPOS_ENTREGA, m.valor),
                      valor: m.pedidos,
                      texto: `${m.pedidos} pedidos`,
                    }))}
                  />
                </div>
              </div>
            </ChartCard>
          </div>
        </Seccion>

        <Seccion titulo="Control de stock" descripcion="Stock actual. Las alertas usan el ritmo de venta de los últimos 30 días.">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icono={Boxes} etiqueta="Prendas en stock" valor={num(s.unidades)} ayuda="Unidades en el depósito y el local" />
            <StatTile icono={Wallet} etiqueta="Valor del inventario" valor={formatARS(s.valor_a_precio_venta)} ayuda="A precio de venta" />
            <StatTile icono={PackageX} etiqueta="Talles agotados" valor={`${s.talles_agotados} de ${s.talles_total}`} ayuda="Combinaciones producto + talle" />
            <StatTile
              icono={TriangleAlert}
              etiqueta="Alertas de reposición"
              valor={num(s.alertas.length)}
              ayuda={`${alertasCriticas} agotadas o críticas`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <ChartCard className="lg:col-span-2" titulo="Qué reponer" subtitulo="Ordenado por urgencia y ventas">
              <AlertasStock alertas={s.alertas} diasVelocidad={s.dias_velocidad} />
            </ChartCard>

            <div className="grid gap-3">
              <ChartCard
                titulo="Stock por categoría"
                subtitulo="Unidades disponibles"
                tabla={{
                  columnas: ['Categoría', 'Unidades', 'Valor'],
                  alinear: ['left', 'right', 'right'],
                  filas: s.por_categoria.map((c) => [c.categoria, c.unidades, formatARS(c.valor)]),
                }}
              >
                <BarList
                  nombreValor="unidades"
                  items={s.por_categoria.map((c) => ({
                    id: c.categoria,
                    etiqueta: c.categoria,
                    valor: c.unidades,
                    texto: num(c.unidades),
                    detalle: [{ valor: formatARS(c.valor), etiqueta: 'a precio de venta' }],
                  }))}
                />
              </ChartCard>

              <ChartCard titulo="Sin ventas en el período" subtitulo="Mercadería inmovilizada">
                {s.sin_movimiento.length ? (
                  <ul className="divide-y divide-line text-sm">
                    {s.sin_movimiento.map((p) => (
                      <li key={p.producto_id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 truncate text-zinc-300">{p.nombre}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {p.stock} u. · {formatARS(p.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-zinc-300">
                    <CircleCheck className="size-5 shrink-0 text-st-good" aria-hidden="true" />
                    Todos los productos tuvieron ventas en los últimos {dias} días.
                  </p>
                )}
              </ChartCard>
            </div>
          </div>
        </Seccion>
      </div>
    </div>
  );
}
