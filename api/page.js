// Sirve index.html con etiquetas de vista previa (título, descripción, imagen)
// para /obra/:slug y /historias/:slug. Los datos salen de index.html: no hay catálogo paralelo.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = 'https://www.hechoconelalma.shop';
let cache;

function leerArray(html, nombre) {
  const ini = html.indexOf('const ' + nombre + ' = [');
  if (ini < 0) return [];
  const fin = html.indexOf('\n];', ini);
  const texto = html.slice(html.indexOf('[', ini), fin + 2);
  return vm.runInNewContext('(' + texto + ')', {}, { timeout: 1000 });
}

const slugify = t => (t || 'obra').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'obra';

function cargar() {
  if (cache) return cache;
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const obras = leerArray(html, 'artworkData');
  const historias = leerArray(html, 'storiesData');
  const usados = {};
  obras.forEach(o => {
    const base = slugify(o.title);
    usados[base] = (usados[base] || 0) + 1;
    o.slug = usados[base] === 1 ? base : base + '-' + usados[base];
  });
  cache = { html, obras, historias };
  return cache;
}

const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const abs = src => /^https?:/.test(src) ? src : SITE + '/' + String(src).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
const corto = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };

function datos(tipo, slug, c) {
  if (tipo === 'historia') {
    const h = c.historias.find(x => x.slug === slug);
    if (!h) return null;
    return { title: h.title + ' — Hecho con el Alma', desc: corto(h.lead, 200), image: abs('images/og/historia-' + h.slug + '.jpg'), url: SITE + '/historias/' + h.slug, type: 'article' };
  }
  const o = c.obras.find(x => x.slug === slug);
  if (!o) return null;
  return { title: o.title + ' — ' + o.artist + ' · Hecho con el Alma', desc: corto(o.desc, 200), image: abs((o.images && o.images[0]) || 'images/og/home.jpg'), url: SITE + '/obra/' + o.slug, type: 'website' };
}

module.exports = (req, res) => {
  const { type, slug } = req.query || {};
  let html;
  try {
    const c = cargar();
    html = c.html;
    const d = datos(type, decodeURIComponent(slug || ''), c);
    if (d) {
      html = html
        .replace(/<meta (?:property="og:|name="twitter:|name="description")[^>]*>\s*/g, '')
        .replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(d.title) + '</title>\n' +
          '<meta name="description" content="' + esc(d.desc) + '">\n' +
          '<link rel="canonical" href="' + esc(d.url) + '">\n' +
          '<meta property="og:site_name" content="Hecho con el Alma">\n' +
          '<meta property="og:type" content="' + d.type + '">\n' +
          '<meta property="og:title" content="' + esc(d.title) + '">\n' +
          '<meta property="og:description" content="' + esc(d.desc) + '">\n' +
          '<meta property="og:url" content="' + esc(d.url) + '">\n' +
          '<meta property="og:image" content="' + esc(d.image) + '">\n' +
          '<meta name="twitter:card" content="summary_large_image">');
    }
  } catch (e) {
    html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
};
