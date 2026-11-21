/* Pedalz on Cloudflare Workers — serves the app files with the same headers the old .htaccess set. */
export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    if (url.hostname.startsWith('www.')) return Response.redirect(`https://${url.hostname.slice(4)}${p}${url.search}`, 301);
    if (p.startsWith('/worker/') || p.startsWith('/supabase/') || /^\/(wrangler\.jsonc|\.assetsignore|README\.md|STORE_LISTING\.md|twa-manifest\.json)$/.test(p)) return new Response('Not found', { status: 404 });
    const res = await env.ASSETS.fetch(req);
    const h = new Headers(res.headers);
    if (p === '/manifest.json') h.set('Content-Type', 'application/manifest+json');
    if (p === '/.well-known/assetlinks.json') h.set('Content-Type', 'application/json');
    if (/^\/(sw\.js|index\.html|manifest\.json|config\.js)?$/.test(p)) h.set('Cache-Control', 'no-cache');
    else if (/\.(png|svg)$/.test(p)) h.set('Cache-Control', 'public, max-age=2592000');
    h.set('X-Content-Type-Options', 'nosniff');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  },
};
