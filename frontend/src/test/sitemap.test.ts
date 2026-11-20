import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Plain .mjs build script — no type declarations by design.
import { generate } from '../../scripts/generate-sitemap.mjs';
import { posts } from '@/pages/blog/posts';

const ROOT = resolve(__dirname, '../..');

/**
 * The committed sitemap is generated, not hand-written (see
 * scripts/generate-sitemap.mjs). This asserts the two have not drifted — which
 * is the only thing standing between "someone added a blog post" and "the blog
 * post is invisible to search", since nothing else in the build fails when the
 * sitemap goes stale.
 *
 * It also pins the two properties that were wrong before the file was
 * generated: it listed fragment URLs (which a crawler folds into the page they
 * hang off, so the sitemap effectively contained one URL) and it omitted every
 * real route.
 */
describe('sitemap.xml', () => {
  const committed = readFileSync(resolve(ROOT, 'public/sitemap.xml'), 'utf8');

  it('matches what the generator produces', () => {
    expect(committed).toBe(generate());
  });

  it('lists every blog post', () => {
    for (const post of posts) {
      expect(committed).toContain(`https://optimustesting.com/blog/${post.slug}`);
    }
  });

  it('lists every marketing route registered in App.tsx', () => {
    for (const path of ['/', '/blog', '/contact', '/cookies', '/terms', '/privacy', '/refund-policy']) {
      expect(committed).toContain(`<loc>https://optimustesting.com${path}</loc>`);
    }
  });

  it('contains no fragment URLs', () => {
    // A "#features" entry is not a separate document to a crawler; it is the
    // page it hangs off, so six such entries were six duplicates of "/".
    expect(committed).not.toMatch(/<loc>[^<]*#/);
  });

  it('does not advertise routes that only exist on the app host', () => {
    // These are served where X-Robots-Tag is noindex; listing them would ask
    // Google to crawl URLs we then tell it to drop.
    expect(committed).not.toContain('/start-trial');
    expect(committed).not.toContain('/auth');
  });
});
