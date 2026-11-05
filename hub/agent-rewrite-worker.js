/**
 * ENESMA Agent Hub — Cloudflare Worker draft
 *
 * Serves https://agent.enesmarealty.com from the existing GitHub Pages
 * Hub at https://app.enesmarealty.com/hub/ without changing the Pages
 * custom domain (app.enesmarealty.com) or any other DNS record.
 *
 * This file is a draft to paste into a Cloudflare Worker. It is not
 * active until Enrique attaches it to agent.enesmarealty.com in the
 * Cloudflare dashboard. See hub/CUTOVER.md.
 *
 * Mapping:
 *   /                    → https://app.enesmarealty.com/hub/
 *   /app.js, /assets/…   → https://app.enesmarealty.com/hub/app.js (etc.)
 *   /hub/…               → https://app.enesmarealty.com/hub/… (passthrough)
 *   /compliance, /refer  → 302 https://agent.enesmarealty.com/#/compliance
 *                          (old Google Sites pretty URLs → hash SPA)
 *
 * Fetch uses the app.enesmarealty.com URL so GitHub Pages sees the Host
 * it already serves. Do not forward the incoming Host header.
 */
const ORIGIN = 'https://app.enesmarealty.com';
const HUB = '/hub';

const STATIC_EXT = /\.(?:js|css|mjs|map|png|jpe?g|gif|webp|svg|ico|bmp|woff2?|ttf|otf|eot|json|webmanifest|txt|md|html|xml|pdf)$/i;

function isStaticPath(pathname) {
  if (pathname === '/' || pathname === '') return true;
  if (pathname === '/index.html' || pathname === '/hub' || pathname === '/hub/') return true;
  if (pathname.startsWith('/hub/')) return true;
  if (pathname.startsWith('/assets/')) return true;
  const base = pathname.split('/').pop() || '';
  return STATIC_EXT.test(base);
}

function originPath(pathname) {
  if (pathname === '/' || pathname === '' || pathname === '/index.html') return HUB + '/';
  if (pathname === '/hub') return HUB + '/';
  if (pathname.startsWith('/hub/')) return pathname;
  return HUB + pathname;
}

function hashRedirect(url) {
  let path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/home') path = '/';
  const dest = new URL('/', url.origin);
  dest.hash = '#' + path;
  dest.search = url.search;
  return Response.redirect(dest.toString(), 302);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (!isStaticPath(url.pathname)) {
      return hashRedirect(url);
    }

    const target = new URL(ORIGIN);
    target.pathname = originPath(url.pathname);
    target.search = url.search;

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    headers.delete('x-forwarded-for');
    headers.delete('x-real-ip');

    const init = {
      method: request.method,
      headers,
      redirect: 'follow',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }

    const upstream = await fetch(target.toString(), init);
    const out = new Headers(upstream.headers);
    out.set('X-ENESMA-Hub-Origin', 'app.enesmarealty.com/hub');
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: out,
    });
  },
};
