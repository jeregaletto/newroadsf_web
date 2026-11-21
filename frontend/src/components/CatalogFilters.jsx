import { Search, X } from 'lucide-react';
import { CATEGORIAS, TALLES_FILTRO } from '../lib/constants';

function Chip({ active, onClick, children, size = 'md' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border font-semibold transition active:scale-95 ${
        size === 'sm' ? 'h-9 min-w-11 px-3 text-xs' : 'h-10 px-4 text-sm'
      } ${
        active
          ? 'border-acid bg-acid text-ink'
          : 'border-line bg-ink-2 text-zinc-300 hover:border-zinc-600 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function CatalogFilters({ filtros, setFiltros, total }) {
  const { q, categoria, talle } = filtros;
  const set = (patch) => setFiltros((f) => ({ ...f, ...patch }));
  const hayFiltros = q || categoria || talle;

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Buscar prendas</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Buscá remeras, jeans, hoodies…"
          enterKeyHint="search"
          className="h-12 w-full rounded-2xl border border-line bg-ink-2 pl-12 pr-11 text-base text-white placeholder:text-zinc-500 focus:border-acid focus:outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => set({ q: '' })}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-zinc-400 hover:text-white"
            aria-label="Borrar búsqueda"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      {/* Categorías: scroll horizontal en mobile */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Categorías">
        <Chip active={!categoria} onClick={() => set({ categoria: '' })}>
          Todo
        </Chip>
        {CATEGORIAS.map((c) => (
          <Chip key={c} active={categoria === c} onClick={() => set({ categoria: categoria === c ? '' : c })}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-500">Talle</span>
        <div className="-mr-4 flex gap-2 overflow-x-auto pr-4 no-scrollbar sm:mr-0 sm:pr-0" role="group" aria-label="Filtrar por talle con stock">
          {TALLES_FILTRO.map((t) => (
            <Chip key={t} size="sm" active={talle === t} onClick={() => set({ talle: talle === t ? '' : t })}>
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 text-sm text-zinc-500">
        <p aria-live="polite">
          {total} {total === 1 ? 'prenda' : 'prendas'}
          {talle && <> con stock en talle {talle}</>}
        </p>
        {hayFiltros && (
          <button type="button" onClick={() => setFiltros({ q: '', categoria: '', talle: '' })} className="font-semibold text-acid hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
