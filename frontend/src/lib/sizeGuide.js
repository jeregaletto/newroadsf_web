// Medidas de prenda en cm (tomadas con la prenda apoyada en plano)
// + rango de medida corporal usado por la calculadora de talle sugerido.
export const SIZE_GUIDE = {
  remeras: {
    titulo: 'Remeras',
    nota: 'Calce oversize: si preferís un calce más justo, elegí un talle menos.',
    columnas: ['Talle', 'Ancho pecho', 'Largo total', 'Manga'],
    filas: [
      { talle: 'S', medidas: [52, 70, 21] },
      { talle: 'M', medidas: [55, 72, 22] },
      { talle: 'L', medidas: [58, 74, 23] },
      { talle: 'XL', medidas: [61, 76, 24] },
      { talle: 'XXL', medidas: [64, 78, 25] },
    ],
    calculadora: {
      label: 'Contorno de pecho',
      ayuda: 'Medí alrededor del pecho, a la altura de las axilas.',
      rangos: { S: [84, 94], M: [94, 100], L: [100, 106], XL: [106, 112], XXL: [112, 120] },
    },
  },
  buzos: {
    titulo: 'Buzos y camperas',
    nota: 'Buzos de frisa con calce amplio. Pensados para usar con una remera abajo.',
    columnas: ['Talle', 'Ancho pecho', 'Largo total', 'Largo manga'],
    filas: [
      { talle: 'S', medidas: [56, 68, 60] },
      { talle: 'M', medidas: [59, 70, 61] },
      { talle: 'L', medidas: [62, 72, 62] },
      { talle: 'XL', medidas: [65, 74, 63] },
      { talle: 'XXL', medidas: [68, 76, 64] },
    ],
    calculadora: {
      label: 'Contorno de pecho',
      ayuda: 'Medí alrededor del pecho, a la altura de las axilas.',
      rangos: { S: [84, 94], M: [94, 100], L: [100, 106], XL: [106, 112], XXL: [112, 120] },
    },
  },
  pantalones: {
    titulo: 'Pantalones',
    nota: 'Incluimos la equivalencia con el talle numérico argentino.',
    columnas: ['Talle', 'Equiv.', 'Cintura', 'Cadera', 'Largo'],
    filas: [
      { talle: 'S', medidas: [38, 76, 96, 102] },
      { talle: 'M', medidas: [40, 82, 102, 104] },
      { talle: 'L', medidas: [42, 88, 108, 106] },
      { talle: 'XL', medidas: [44, 94, 114, 108] },
      { talle: 'XXL', medidas: [46, 100, 120, 110] },
    ],
    calculadora: {
      label: 'Contorno de cintura',
      ayuda: 'Medí a la altura donde usás el pantalón, sin ajustar la cinta.',
      rangos: { S: [70, 79], M: [79, 85], L: [85, 91], XL: [91, 97], XXL: [97, 104] },
    },
  },
};

/** Devuelve el talle sugerido para una medida corporal, o null si está fuera de rango. */
export function sugerirTalle(tipo, cm) {
  const n = Number(cm);
  if (!n) return null;
  const { rangos } = SIZE_GUIDE[tipo].calculadora;
  const entradas = Object.entries(rangos);
  const [minTalle, [min]] = entradas[0];
  const [maxTalle, [, max]] = entradas.at(-1);
  if (n < min) return { talle: minTalle, aviso: 'Te recomendamos el talle más chico.' };
  if (n >= max) return { talle: maxTalle, aviso: 'Puede quedarte justo: consultanos por WhatsApp.' };
  const hit = entradas.find(([, [a, b]]) => n >= a && n < b);
  return hit ? { talle: hit[0] } : null;
}
