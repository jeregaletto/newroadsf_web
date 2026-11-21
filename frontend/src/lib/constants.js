// Datos del local — editar acá para cambiar en toda la web
export const STORE = {
  nombre: 'New Road Indumentaria',
  direccion: 'Av. Aristóbulo del Valle 6127',
  ciudad: 'Santa Fe Capital',
  provincia: 'Santa Fe, Argentina',
  whatsapp: '5493425255619',
  whatsappVisible: '+54 9 342 525-5619',
  // TODO: reemplazar por la cuenta real del local
  instagramUrl: 'https://www.instagram.com/newroadsf/',
  horarios: [
    { dias: 'Lunes a sábados', turnos: ['9:00 a 13:00', '16:00 a 20:00'] },
    { dias: 'Domingos y feriados', turnos: ['Cerrado'] },
  ],
};

const DIRECCION_COMPLETA = `${STORE.direccion}, ${STORE.ciudad}, ${STORE.provincia}`;
export const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(DIRECCION_COMPLETA)}&z=16&output=embed`;
export const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(DIRECCION_COMPLETA)}`;

export const CATEGORIAS = ['Remeras', 'Buzos', 'Pantalones', 'Camperas', 'Accesorios'];
export const TALLES_FILTRO = ['S', 'M', 'L', 'XL', 'XXL'];
export const TALLES_TODOS = ['S', 'M', 'L', 'XL', 'XXL', 'U'];

export const talleLabel = (t) => (t === 'U' ? 'Único' : t);

export const TIPOS_ENTREGA = [
  { value: 'retiro', label: 'Retiro en el local', detalle: 'Av. Aristóbulo del Valle 6127' },
  { value: 'envio', label: 'Envío nacional', detalle: 'A cualquier punto del país' },
];

export const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

export const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

export const labelDe = (lista, value) => lista.find((x) => x.value === value)?.label ?? value;

/** Las categorías que muestran la guía de talles */
export const CATEGORIA_A_GUIA = {
  Remeras: 'remeras',
  Buzos: 'buzos',
  Camperas: 'buzos',
  Pantalones: 'pantalones',
};
