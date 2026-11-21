// Crea o cambia el usuario del panel admin y lo guarda en backend/.env
// Uso:  npm run admin:crear -- <usuario> <contraseña>
//       npm run admin:crear -- <usuario>              (genera una contraseña segura)
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hashPassword } from '../src/auth.js';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
const [usuario, passwordArg] = process.argv.slice(2);

if (!usuario) {
  console.error('Uso: npm run admin:crear -- <usuario> [contraseña]');
  process.exit(1);
}
if (passwordArg && passwordArg.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

// Sin caracteres ambiguos (0/O, 1/l) para que sea fácil de dictar
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generada = !passwordArg;
const password = passwordArg ?? [...randomBytes(14)].map((b) => ALFABETO[b % ALFABETO.length]).join('');

let env = await readFile(envPath, 'utf8').catch(() => '');
const setVar = (clave, valor) => {
  const linea = `${clave}=${valor}`;
  const re = new RegExp(`^${clave}=.*$`, 'm');
  env = re.test(env) ? env.replace(re, linea) : `${env.replace(/\s*$/, '')}\n${linea}\n`;
};

if (!/^# Panel admin/m.test(env)) env = `${env.replace(/\s*$/, '')}\n\n# Panel admin\n`;
setVar('ADMIN_USER', usuario);
setVar('ADMIN_PASSWORD_HASH', hashPassword(password));
// El secreto de sesión se conserva si ya existe (cambiarlo cierra todas las sesiones)
if (!/^ADMIN_SESSION_SECRET=.+$/m.test(env)) setVar('ADMIN_SESSION_SECRET', randomBytes(32).toString('hex'));

await writeFile(envPath, env);
console.log(`✔ Usuario del panel guardado en .env: ${usuario}`);
if (generada) console.log(`  Contraseña generada: ${password}   (guardala: no se puede recuperar)`);
console.log('  Reiniciá el backend para que tome los cambios.');
