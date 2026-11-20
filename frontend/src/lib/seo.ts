// Per-route document metadata for a client-rendered SPA.
//
// There is one static index.html for every route (see frontend/index.html), so
// without this every marketing page shares the home page's <title>, description
// and — worse — its hardcoded <link rel="canonical" href=".../">. A canonical
// pointing at "/" from /privacy tells Google that /privacy is a duplicate of the
// home page and should be dropped from the index, which is how a site ends up
// with exactly one indexable URL.
//
// Googlebot renders JavaScript, so mutating the head at runtime works; it is not
// as strong as SSR-emitted markup, but it is the correct fix available to a Vite
// SPA and it is what most non-crawler consumers (link unfurlers that execute JS,
// browser tabs, bookmark titles) read too.
//
// Social scrapers (Slack, WhatsApp, LinkedIn, X) do NOT execute JavaScript. They
// read the static og:* tags in index.html, so those stay meaningful as a
// site-wide default and this module only sharpens what crawlers and browsers see.

const SITE_NAME = 'TestFlow';
const ORIGIN = 'https://optimustesting.com';

export interface SeoMeta {
  /** Full <title>. Keep under ~60 characters so it is not truncated in results. */
  title: string;
  /** Meta description. Aim for 140–160 characters. */
  description: string;
  /** Path only, e.g. "/privacy". Combined with the marketing origin. */
  path: string;
  /** Absolute URL of the share image. Defaults to the site-wide card. */
  image?: string;
  /** og:type — "website" for pages, "article" for blog posts. */
  type?: 'website' | 'article';
  /** ISO date, only meaningful for type=article. */
  publishedTime?: string;
  /** Extra JSON-LD to inject for this route, removed on unmount. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const MANAGED_ATTR = 'data-seo-managed';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED_ATTR, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Apply metadata for the current route. Returns a cleanup function that removes
 * only the JSON-LD this call injected — title/description/canonical are always
 * overwritten by the next route rather than reset, so there is never a frame
 * where the head is empty.
 */
export function applySeo(meta: SeoMeta): () => void {
  const url = `${ORIGIN}${meta.path}`;
  const image = meta.image ?? `${ORIGIN}/og-image.png`;
  const type = meta.type ?? 'website';

  document.title = meta.title;
  setMeta('meta[name="description"]', 'name', 'description', meta.description);
  setCanonical(url);

  setMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
  setMeta('meta[property="og:url"]', 'property', 'og:url', url);
  setMeta('meta[property="og:type"]', 'property', 'og:type', type);
  setMeta('meta[property="og:image"]', 'property', 'og:image', image);
  setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);

  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
  setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');

  if (meta.publishedTime) {
    setMeta('meta[property="article:published_time"]', 'property', 'article:published_time', meta.publishedTime);
  } else {
    document.head.querySelector('meta[property="article:published_time"]')?.remove();
  }

  if (!meta.jsonLd) return () => undefined;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(MANAGED_ATTR, 'route');
  script.textContent = JSON.stringify(meta.jsonLd);
  document.head.appendChild(script);
  return () => script.remove();
}
