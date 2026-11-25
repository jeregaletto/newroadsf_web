import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * La tienda se carga con lazy() (así /admin no descarga Motion ni Lenis), pero eso crea una cadena:
 * primero baja la entrada y recién al ejecutarse pide el chunk de la tienda.
 * Este plugin agrega al index.html un script mínimo que, fuera de /admin, precarga (modulepreload)
 * el chunk de la tienda y los que importa, en paralelo con la entrada.
 */
function precargarTienda() {
  return {
    name: 'newroad:precargar-tienda',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const chunks = Object.values(ctx.bundle ?? {}).filter((c) => c.type === 'chunk');
        const store = chunks.find((c) => c.isDynamicEntry && c.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/pages/Store.jsx'));
        if (!store) return [];
        const entrada = chunks.find((c) => c.isEntry)?.fileName;
        const js = [store.fileName, ...store.imports].filter((f) => f !== entrada);
        const css = [...(store.viteMetadata?.importedCss ?? [])];
        const links = [
          ...js.map((f) => `['modulepreload','/${f}']`),
          ...css.map((f) => `['preload','/${f}','style']`),
        ].join(',');
        return [
          {
            tag: 'script',
            injectTo: 'head',
            children:
              `if(!location.pathname.startsWith('/admin')){[${links}].forEach(function(p){` +
              `var l=document.createElement('link');l.rel=p[0];l.href=p[1];if(p[2])l.as=p[2];l.crossOrigin='';document.head.appendChild(l);});}`,
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), precargarTienda()],
  server: {
    port: 5173,
    // En desarrollo, /api se redirige al backend Express
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
