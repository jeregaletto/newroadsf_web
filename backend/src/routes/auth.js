import { Router } from 'express';
import { COOKIE, authConfigurada, crearToken, leerCookie, leerToken, opcionesCookie, verificarCredenciales } from '../auth.js';
import { HttpError } from '../constants.js';

const router = Router();

// Freno a fuerza bruta: máximo de intentos fallidos por IP en una ventana de tiempo
const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const fallos = new Map();

function chequearBloqueo(ip) {
  const ahora = Date.now();
  const recientes = (fallos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  fallos.set(ip, recientes);
  if (recientes.length >= MAX_FALLOS) {
    const minutos = Math.ceil((VENTANA_MS - (ahora - recientes[0])) / 60000);
    throw new HttpError(429, `Demasiados intentos fallidos. Probá de nuevo en ${minutos} min.`);
  }
}

// POST /api/auth/login   body: { usuario, password }
router.post('/login', (req, res) => {
  if (!authConfigurada()) {
    throw new HttpError(503, 'El acceso al panel no está configurado. Corré "npm run admin:crear" en backend/.');
  }
  chequearBloqueo(req.ip);

  const { usuario, password } = req.body ?? {};
  if (typeof usuario !== 'string' || typeof password !== 'string' || !usuario || !password) {
    throw new HttpError(400, 'Ingresá usuario y contraseña');
  }

  if (!verificarCredenciales(usuario.trim(), password)) {
    fallos.get(req.ip).push(Date.now());
    throw new HttpError(401, 'Usuario o contraseña incorrectos');
  }

  fallos.delete(req.ip);
  res.cookie(COOKIE, crearToken(usuario.trim()), opcionesCookie());
  res.json({ usuario: usuario.trim() });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  const { maxAge, ...opts } = opcionesCookie();
  res.clearCookie(COOKIE, opts);
  res.status(204).end();
});

// GET /api/auth/me  -> 200 con el usuario si hay sesión válida, 401 si no
router.get('/me', (req, res) => {
  const datos = leerToken(leerCookie(req, COOKIE));
  if (!datos) throw new HttpError(401, 'No hay sesión iniciada');
  res.json({ usuario: datos.u, vence: datos.exp });
});

export default router;
