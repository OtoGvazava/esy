// The category pills under the stories on the shop's home page (the design's
// A1): "All" and then the store's own categories, most products first, in a
// row that scrolls sideways and fades at the end while there is more of it to
// see. A pill opens that category's collection at /?category=<name>.
//
// Drawn only once the store has a category at all — a lone "All" pill would
// be a control with nothing to choose between.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { useStoreCategories } from '../../hooks/useStoreCategories';
import { pillStyle } from './CollectionFilters';

const FADE = 'linear-gradient(90deg, #000 calc(100% - 28px), transparent)';

export default function CategoryPills({ gutter = 16 }) {
  const { T } = useGlow();
  const { t } = useTranslation('storefront');
  const { categories } = useStoreCategories();
  const row = useRef(null);
  const [more, setMore] = useState(false);

  // The fade says "there is more this way", so it goes once the end is in view.
  const measure = useCallback(() => {
    const el = row.current;
    if (el) setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, categories]);

  if (categories.length === 0) return null;

  return (
    <nav aria-label={t('categories.label')} style={{ position: 'relative', padding: '14px 0 0' }}>
      <div
        ref={row} onScroll={measure}
        style={{
          display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: `0 ${gutter}px`,
          WebkitMaskImage: more ? FADE : 'none', maskImage: more ? FADE : 'none',
        }}
      >
        <Link to="/" aria-current="page" style={pillStyle(T, true)}>{t('categories.all')}</Link>
        {categories.map((c) => (
          <Link key={c.name} to={`/?category=${encodeURIComponent(c.name)}`} style={pillStyle(T, false)}>
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
