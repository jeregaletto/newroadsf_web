// Autenticación del panel admin: contraseña con scrypt + sesión firmada (HMAC) en cookie HttpOnly.
// Sin dependencias externas: todo con node:crypto.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { HttpError } from './constants.js';

export const COOKIE = 'nr_admin';
const DURACION_MS = 8 * 60 * 60 * 1000; // 8 horas

// ---------------------------------------------------------------------
//  Contraseñas  (formato: scrypt:<salt hex>:<hash hex>)
// ---------------------------------------------------------------------
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verificarPassword(password, almacenado) {
  const [algo, saltHex, hashHex] = String(almacenado ?? '').split(':');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, 'hex');
  const calculado = scryptSync(String(password), Buffer.from(saltHex, 'hex'), esperado.length);
  return timingSafeEqual(calculado, esperado);
}

/** Compara strings sin filtrar información por tiempo de respuesta. */
function igualSeguro(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function verificarCredenciales(usuario, password) {
  const { ADMIN_USER, ADMIN_PASSWORD_HASH } = process.env;
  if (!ADMIN_USER || !ADMIN_PASSWORD_HASH) return false;
  // Se verifica la contraseña siempre (aunque el usuario no coincida) para no revelar cuál falló
  const passOk = verificarPassword(password, ADMIN_PASSWORD_HASH);
  return igualSeguro(usuario, ADMIN_USER) && passOk;
}

export const authConfigurada = () => Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_SESSION_SECRET);

// ---------------------------------------------------------------------
//  Tokens de sesión  (base64url(payload).firma)
// ---------------------------------------------------------------------
const firmar = (datos) => createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(datos).digest('base64url');

export function crearToken(usuario) {
  const payload = Buffer.from(JSON.stringify({ u: usuario, exp: Date.now() + DURACION_MS })).toString('base64url');
  return `${payload}.${firmar(payload)}`;
}

export function leerToken(token) {
  if (!token || !process.env.ADMIN_SESSION_SECRET) return null;
  const [payload, firma] = token.split('.');
  if (!payload || !firma || !igualSeguro(firma, firmar(payload))) return null;
  try {
    const datos = JSON.parse(Buffer.from(payload, 'base64url').toString());
    // El token también se invalida si cambia el usuario del .env
    if (datos.exp < Date.now() || datos.u !== process.env.ADMIN_USER) return null;
    return datos;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
//  Cookies
// ---------------------------------------------------------------------
export function leerCookie(req, nombre) {
  for (const parte of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function opcionesCookie() {
  return {
    httpOnly: true, // no accesible desde JavaScript (protege ante XSS)
    sameSite: 'strict', // no se envía desde otros sitios (protege ante CSRF)
    secure: process.env.NODE_ENV === 'production',
    path: '/api',
    maxAge: DURACION_MS,
  };
}

// ---------------------------------------------------------------------
//  Middleware
// ---------------------------------------------------------------------
export function esAdmin(req) {
  return leerToken(leerCookie(req, COOKIE)) !== null;
}

export function requireAdmin(req, _res, next) {
  if (!esAdmin(req)) return next(new HttpError(401, 'Sesión vencida o no iniciada. Ingresá de nuevo.'));
  next();
}
