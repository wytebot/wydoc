import * as cheerio from 'cheerio';

export function cleanUrl(raw) {
  const x = new URL(raw);
  if (!['http:', 'https:'].includes(x.protocol)) throw new Error('Only HTTP(S) URLs are supported.');
  x.hash = '';
  return x.toString().replace(/\/$/, '');
}

export function isBlockedHost(host) {
  const h = host.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1' ||
    h.endsWith('.localhost') ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h);
}

// Fetches a URL the way inspect-site.js always has: follows redirects but refuses
// to land on a private/local host or a different origin than requested.
export async function fetchSiteHtml(rawUrl) {
  const url = cleanUrl(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  const requested = new URL(url);
  if (isBlockedHost(requested.hostname)) throw new Error('Private or local addresses cannot be inspected.');
  const r = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'WyDocBot/1.0 (+content verification)', accept: 'text/html,application/xhtml+xml' }
  });
  if (!r.ok) throw new Error(`Site returned HTTP ${r.status}`);
  const final = new URL(r.url);
  if (final.origin !== requested.origin || isBlockedHost(final.hostname)) throw new Error('Redirected to a different or private host.');
  const html = await r.text();
  // finalUrl is the canonical string form (no trailing slash) — always use THIS,
  // never final.toString() directly, when computing/checking verification
  // tokens. A bare URL object stringifies a root path with a trailing slash
  // (new URL('https://x.com').toString() === 'https://x.com/'), which would
  // silently produce a different HMAC input than cleanUrl()'s stripped form
  // and make a valid tag look like it never matches.
  const finalUrl = final.toString().replace(/\/$/, '');
  return { final, finalUrl, html };
}

// Discovers likely article/post URLs from the page + sitemap, same heuristic inspect-site.js used.
export async function discoverArticles(final, html) {
  const $ = cheerio.load(html);
  const name = ($('meta[property="og:site_name"]').attr('content') || $('meta[name="application-name"]').attr('content') || $('title').text().trim() || final.hostname).slice(0, 120);
  const urls = new Set();
  const add = (u) => {
    try {
      const x = new URL(u, final);
      if (x.origin !== final.origin || x.hash || !/^https?:$/.test(x.protocol)) return;
      const p = x.pathname.toLowerCase();
      if (/(blog|news|article|post|story|\d{4}\/\d{2})/.test(p)) urls.add(x.toString().replace(/\/$/, ''));
    } catch {}
  };
  $('a[href]').each((_, el) => add($(el).attr('href')));
  for (const path of ['/sitemap.xml', '/sitemap_index.xml']) {
    try {
      const sr = await fetch(new URL(path, final), { headers: { 'user-agent': 'WyDocBot/1.0' } });
      if (sr.ok) {
        const txt = await sr.text();
        const sm = cheerio.load(txt, { xmlMode: true });
        sm('loc').each((_, el) => add(sm(el).text().trim()));
      }
    } catch {}
  }
  return { name, articleCount: Math.min(urls.size, 500), discovered: Array.from(urls).slice(0, 100) };
}

// Looks for our ownership meta tag in already-fetched HTML.
export function findVerificationTag(html) {
  const $ = cheerio.load(html);
  const content = $('meta[name="wydoc-site-verification"]').attr('content');
  return content ? content.trim() : null;
}
