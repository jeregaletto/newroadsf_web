export const CATEGORIAS = ['Remeras', 'Buzos', 'Pantalones', 'Camperas', 'Accesorios'];
export const TALLES = ['S', 'M', 'L', 'XL', 'XXL', 'U'];
export const TIPOS_ENTREGA = ['retiro', 'envio'];
export const MEDIOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'];
export const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];

/** Error con código HTTP para devolver mensajes claros al frontend. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
