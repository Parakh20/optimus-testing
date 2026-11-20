import { useEffect } from 'react';
import { applySeo, type SeoMeta } from '@/lib/seo';

/**
 * Declarative wrapper around applySeo. Render once near the top of a marketing
 * route; the effect re-runs whenever the metadata changes (e.g. navigating
 * between two blog posts, which mounts the same component with new props).
 *
 * Renders nothing.
 */
export function Seo(props: SeoMeta) {
  const { title, description, path, image, type, publishedTime, jsonLd } = props;
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    return applySeo({
      title,
      description,
      path,
      image,
      type,
      publishedTime,
      jsonLd: jsonLdKey ? (JSON.parse(jsonLdKey) as SeoMeta['jsonLd']) : undefined,
    });
    // jsonLdKey is the serialized form so an inline object literal does not
    // retrigger the effect on every render.
  }, [title, description, path, image, type, publishedTime, jsonLdKey]);

  return null;
}
