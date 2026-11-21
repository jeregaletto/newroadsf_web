import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { Logo, InstagramIcon, WhatsAppIcon } from './BrandIcons';
import { STORE } from '../lib/constants';
import { waLink } from '../lib/whatsapp';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-28 pt-12 sm:px-6 md:pb-12">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-zinc-500">
            {STORE.direccion}, {STORE.ciudad}. Envíos a todo el país.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={STORE.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-zinc-300 hover:text-white"
          >
            <InstagramIcon className="size-4" /> Instagram
          </a>
          <a
            href={waLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-zinc-300 hover:text-white"
          >
            <WhatsAppIcon className="size-4" /> {STORE.whatsappVisible}
          </a>
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-xs text-zinc-600 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {STORE.nombre}. Todos los derechos reservados.</p>
        <Link to="/admin" className="inline-flex items-center gap-1.5 hover:text-zinc-400">
          <LayoutDashboard className="size-3.5" /> Panel del local (demo)
        </Link>
      </div>
    </footer>
  );
}
