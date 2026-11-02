// The category pills under the stories on the shop's home page (the design's
// A1): "All" and then the store's own categories, most products first, in a
// row that scrolls sideways and fades at the end while there is more of it to
// see. A pill opens that category's collection at /?category=<name>.
//
// `trailing` sits at the row's end, outside the scrolling part: the home page
// puts its sort control there, as the design does.
//
// Drawn only once the store has a category at all — a lone "All" pill would
// be a control with nothing to choose between. The caller passes the
// categories (useStoreCategories), so it can tell whether the row is drawn.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { pillStyle } from './CollectionFilters';

const FADE = 'linear-gradient(90deg, #000 calc(100% - 28px), transparent)';

export default function CategoryPills({ gutter = 16, categories = [], trailing = null }) {
  const { T } = useGlow();
  const { t } = useTranslation('storefront');
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
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: `14px ${gutter}px 0` }}>
      <nav
        ref={row} onScroll={measure} aria-label={t('categories.label')}
        style={{
          flex: 1, minWidth: 0, display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
          WebkitMaskImage: more ? FADE : 'none', maskImage: more ? FADE : 'none',
        }}
      >
        <Link to="/" aria-current="page" className="esy-press" style={pillStyle(T, true)}>{t('categories.all')}</Link>
        {categories.map((c) => (
          <Link key={c.name} to={`/?category=${encodeURIComponent(c.name)}`} className="esy-press" style={pillStyle(T, false)}>
            {c.name}
          </Link>
        ))}
      </nav>
      {trailing}
    </div>
  );
}
