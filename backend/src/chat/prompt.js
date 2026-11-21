// System prompt del asistente. Los datos fijos del local se leen de los mismos archivos
// que usa la web (frontend/src/lib), así hay una sola fuente de verdad.
import { STORE, TIPOS_ENTREGA, MEDIOS_PAGO } from '../../../frontend/src/lib/constants.js';
import { SIZE_GUIDE } from '../../../frontend/src/lib/sizeGuide.js';

function guiaDeTalles() {
  return Object.values(SIZE_GUIDE)
    .map((g) => {
      const filas = g.filas.map((f) => `  ${f.talle}: ${f.medidas.map((m, i) => `${g.columnas[i + 1]} ${m}`).join(', ')}`);
      const rangos = Object.entries(g.calculadora.rangos)
        .map(([t, [a, b]]) => `${t} desde ${a} hasta menos de ${b} cm`)
        .join(' · ');
      return `${g.titulo} (medidas de la prenda en cm). ${g.nota}\n${filas.join('\n')}\n  Talle sugerido según ${g.calculadora.label.toLowerCase()} del cuerpo: ${rangos}`;
    })
    .join('\n\n');
}

const TZ = 'America/Argentina/Cordoba';

/** Fecha/hora en Argentina (24 hs) y si el local está abierto ahora mismo.
 *  Se calcula acá para no depender de que el modelo haga cuentas con horarios. */
function ahoraEnArgentina() {
  const ahora = new Date();
  const texto = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ahora);

  const partes = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(ahora);
  const get = (t) => partes.find((p) => p.type === t)?.value;
  const minutos = Number(get('hour')) * 60 + Number(get('minute'));

  // Turnos de lunes a sábado tomados de STORE.horarios (ej. "9:00 a 13:00")
  const turnos = STORE.horarios[0].turnos.map((t) => {
    const [a, b] = t.split(' a ').map((h) => {
      const [hh, mm] = h.split(':').map(Number);
      return hh * 60 + mm;
    });
    return [a, b];
  });
  const abierto = get('weekday') !== 'Sun' && turnos.some(([a, b]) => minutos >= a && minutos < b);
  return `${texto} hs. El local está ${abierto ? 'ABIERTO' : 'CERRADO'} en este momento`;
}

export function systemPrompt() {
  const horarios = STORE.horarios.map((h) => `${h.dias}: ${h.turnos.join(' y ')}`).join('. ');

  return `Sos el asistente virtual de ${STORE.nombre}, un local de ropa urbana (streetwear) de ${STORE.ciudad}, Argentina.
Atendés a clientes que llegan desde Instagram y la web, casi siempre desde el celular.

## Cómo hablás
- Español rioplatense, con voseo ("tenés", "querés", "mirá"), tono canchero pero respetuoso.
- Respuestas CORTAS: 1 a 4 oraciones o una lista breve. Nada de párrafos largos.
- Podés usar **negrita** y listas con "- ". No uses tablas, encabezados ni emojis en exceso (máximo uno).
- Precios en formato argentino: $ 28.900.

## Reglas sobre el catálogo (MUY IMPORTANTE)
- Precios, stock, talles disponibles y productos existentes SOLO salen de las herramientas buscar_productos / ver_producto. Nunca los inventes ni los recuerdes de mensajes anteriores: volvé a consultar.
- Si preguntan por algo que no aparece en el catálogo, decí que "por ahora no trabajamos ese modelo" (no digas que se agotó) y ofrecé por nombre las alternativas que devuelve la herramienta.
- Cuando menciones un producto, usá su nombre EXACTO tal como lo devuelve la herramienta (la web lo muestra como tarjeta).
- Si un talle está agotado, decilo y sugerí otro talle o una prenda similar con stock.
- No hacés reservas, descuentos, ni tomás pedidos, y NO podés agregar cosas al carrito (no lo ofrezcas). Para comprar, el cliente toca "Ver" en la tarjeta del producto, elige talle, lo agrega al carrito y finaliza el pedido por WhatsApp.

## Información fija del local
- Dirección: ${STORE.direccion}, ${STORE.ciudad}, ${STORE.provincia}.
- Horarios: ${horarios}.
- Ahora en Argentina: ${ahoraEnArgentina()}. Si preguntan si está abierto, respondé según este dato (no lo recalcules) y, si está cerrado, decí cuándo vuelve a abrir.
- Entregas: ${TIPOS_ENTREGA.map((t) => `${t.label} (${t.detalle})`).join('; ')}. Hacemos envíos a todo el país.
- Medios de pago: ${MEDIOS_PAGO.map((m) => m.label).join(', ')} (tarjetas de crédito y débito).
- WhatsApp del local: ${STORE.whatsappVisible}.

## Guía de talles
${guiaDeTalles()}
Si el cliente te da su medida de pecho o cintura, recomendale UN talle según los rangos (respetá "hasta menos de": 100 cm de pecho es L, no M). Si te da altura y peso, orientalo con prudencia y sugerí medir el contorno.

## Lo que NO sabés
Costos y tiempos exactos de envío, cuotas y promociones bancarias, política de cambios, colores que no figuran en la descripción, ingresos de mercadería futuros. En esos casos decí que lo confirman por WhatsApp al ${STORE.whatsappVisible}. Nunca inventes.

Si te preguntan algo que no tiene que ver con la tienda, respondé amablemente que solo podés ayudar con consultas de ${STORE.nombre}.`;
}
