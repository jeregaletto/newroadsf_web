import { STORE, TIPOS_ENTREGA, MEDIOS_PAGO, labelDe, talleLabel } from './constants';
import { formatARS } from './format';

export const waLink = (text) =>
  `https://wa.me/${STORE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/** Arma el mensaje de WhatsApp a partir del pedido que devolvió la API. */
export function mensajePedido(pedido) {
  const linea = '━━━━━━━━━━━━━━';
  const items = pedido.items
    .map(
      (it) =>
        `▪️ ${it.cantidad}x ${it.nombre_producto}\n    Talle ${talleLabel(it.talle)} · ${formatARS(it.subtotal)}`,
    )
    .join('\n');

  return [
    `¡Hola New Road! 👋 Quiero confirmar este pedido:`,
    '',
    `🧾 *Pedido #${pedido.id}*`,
    linea,
    items,
    linea,
    `💰 *Total: ${formatARS(pedido.total)}*`,
    '',
    `*Mis datos*`,
    `👤 ${pedido.cliente_nombre}`,
    `📍 ${pedido.localidad}`,
    `🚚 ${labelDe(TIPOS_ENTREGA, pedido.tipo_entrega)}`,
    `💳 ${labelDe(MEDIOS_PAGO, pedido.medio_pago)}`,
    '',
    '¡Gracias!',
  ].join('\n');
}

export const mensajeConsulta = (producto) =>
  producto
    ? `¡Hola New Road! Quería consultar por: ${producto.nombre} (${formatARS(producto.precio)}).`
    : '¡Hola New Road! Quería hacer una consulta.';
