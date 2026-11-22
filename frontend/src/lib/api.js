// En dev, Vite redirige /api al backend (ver vite.config.js).
// Para otro host, definir VITE_API_URL (ej: https://api.newroad.com.ar)
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Se dispara cuando una llamada del panel responde 401 (sesión vencida). */
export const EVENTO_SESION_VENCIDA = 'newroad:sesion-vencida';

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      // La sesión del admin viaja en una cookie HttpOnly
      credentials: BASE ? 'include' : 'same-origin',
    });
  } catch {
    throw new Error('No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error ?? `Error ${res.status}`);
    err.status = res.status;
    err.details = data?.details;
    err.data = data;
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event(EVENTO_SESION_VENCIDA));
    }
    throw err;
  }
  return data;
}

export const api = {
  getProductos: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/productos${qs ? `?${qs}` : ''}`);
  },
  crearProducto: (data) => request('/productos', { method: 'POST', body: data }),
  actualizarProducto: (id, data) => request(`/productos/${id}`, { method: 'PATCH', body: data }),
  actualizarTalles: (id, talles) => request(`/productos/${id}/talles`, { method: 'PUT', body: { talles } }),

  getPedidos: () => request('/pedidos'),
  crearPedido: (data) => request('/pedidos', { method: 'POST', body: data }),
  actualizarEstadoPedido: (id, estado) => request(`/pedidos/${id}/estado`, { method: 'PATCH', body: { estado } }),

  login: (usuario, password) => request('/auth/login', { method: 'POST', body: { usuario, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  sesion: () => request('/auth/me'),

  getMetricas: (dias) => request(`/metricas?dias=${dias}`),
  adminIAEstado: () => request('/admin/ia/estado'),
  adminChat: (mensajes) => request('/admin/ia/chat', { method: 'POST', body: { mensajes } }),
  generarDescripcion: (data) => request('/admin/ia/descripcion', { method: 'POST', body: data }),

  chatEstado: () => request('/chat/estado'),
  chat: (mensajes) => request('/chat', { method: 'POST', body: { mensajes } }),
};
