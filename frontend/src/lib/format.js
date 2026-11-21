const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

/** 28900 -> "$ 28.900" */
export const formatARS = (n) => ars.format(Number(n) || 0).replace(/ /g, ' ');

const fecha = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
export const formatFecha = (iso) => fecha.format(new Date(iso));

/** Pide a Unsplash el ancho justo para cada uso (ahorra datos en mobile). */
export function imgUrl(url, width) {
  if (!url?.includes('images.unsplash.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('w', String(width));
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    if (!u.searchParams.has('q')) u.searchParams.set('q', '75');
    return u.toString();
  } catch {
    return url;
  }
}

/** Placeholder si la foto no carga (ej. URL mal pegada en el admin). */
export const IMG_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'%3E%3Crect width='400' height='500' fill='%231b1b1b'/%3E%3Ctext x='200' y='260' text-anchor='middle' font-family='Impact,sans-serif' font-size='56' fill='%23333'%3ENEW/ROAD%3C/text%3E%3C/svg%3E";

export function onImgError(e) {
  if (e.currentTarget.src !== IMG_FALLBACK) e.currentTarget.src = IMG_FALLBACK;
}
