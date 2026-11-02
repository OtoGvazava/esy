// The skeleton kit: grey stand-ins sized like the content that is on its way,
// so a screen keeps its final shape while it loads and nothing moves when the
// real thing arrives. Photos sit in boxes of their final aspect ratio.
//
// Every piece is drawn at once but stays invisible for the first 150 ms
// (styles/motion.css, .esy-sk-wait): a load quicker than that never shows a
// skeleton at all, and a slower one fades it in rather than flashing it.
//
// A screen draws its skeleton inside <Skeleton>, which says "loading" once to
// assistive tech; the pieces inside are hidden from it.
import { useTranslation } from 'react-i18next';

/** One grey block. */
export function Sk({ w = '100%', h = 12, r = 8, style }) {
  return (
    <span
      aria-hidden="true"
      className="esy-sk"
      style={{ width: w, height: h, borderRadius: r, flex: 'none', ...style }}
    />
  );
}

/** The loading region: holds the layout from the first frame, shows after 150 ms. */
export function Skeleton({ children, style, className = '', label }) {
  const { t } = useTranslation('common');
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label || t('loading.default')}
      className={`esy-sk-wait ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** Lines of text: the last one shorter, as a paragraph's is. */
export function SkText({ lines = 1, h = 12, gap = 8, last = '60%', style }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Sk key={i} h={h} w={lines > 1 && i === lines - 1 ? last : '100%'} r={h / 2} />
      ))}
    </span>
  );
}

/** A page heading: the title, and the line under it. */
export function SkHeader({ title = 28, sub = true, w = '42%', style }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <Sk h={title} w={w} r={10} />
      {sub && <Sk h={12} w="28%" r={6} />}
    </span>
  );
}

/** A figure tile: its label, the figure, and a line of context. */
export function SkStat({ style, surface = true }) {
  return (
    <span aria-hidden="true" style={{
      display: 'flex', flexDirection: 'column', gap: 12, padding: 18, boxSizing: 'border-box', minWidth: 0,
      borderRadius: 16, ...(surface ? { background: 'var(--k-sf)', border: '1px solid var(--k-line)' } : null),
      ...style,
    }}>
      <Sk h={11} w="45%" r={6} />
      <Sk h={26} w="62%" r={8} />
      <Sk h={10} w="35%" r={5} />
    </span>
  );
}

/** A list row: a leading square or round mark, two lines, and a trailing value. */
export function SkRow({ lead = 40, round = false, trail = true, h = 64, style }) {
  return (
    <span aria-hidden="true" style={{
      display: 'flex', alignItems: 'center', gap: 12, minHeight: h, boxSizing: 'border-box', minWidth: 0, ...style,
    }}>
      {lead ? <Sk w={lead} h={lead} r={round ? lead / 2 : 12} /> : null}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Sk h={12} w="58%" r={6} />
        <Sk h={10} w="34%" r={5} />
      </span>
      {trail && <Sk h={12} w={56} r={6} />}
    </span>
  );
}

/** Rows one under another, separated the way a list's rows are. */
export function SkRows({ count = 5, divider = true, rowProps, style }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkRow
          key={i}
          {...rowProps}
          style={{ padding: '10px 0', borderTop: divider && i ? '1px solid var(--k-line)' : 'none', ...rowProps?.style }}
        />
      ))}
    </span>
  );
}

const RATIO = { square: '1 / 1', portrait: '4 / 5', landscape: '4 / 3' };

/**
 * A product card in the store's own layout (GlowProductCard's box for box):
 * the same ground, padding and corners, the photo at its ratio, two lines of
 * name, the price and the round add button.
 */
export function SkProductCard({ layout = 'grid2', look = {}, compact = false, price = true }) {
  const list = layout === 'list';
  const photoGrid = layout === 'grid3';
  const priceOnPhoto = !list && (photoGrid || look.price === 'photo');
  const showAdd = !photoGrid && look.addbtn !== 'none';
  const ratio = RATIO[look.ratio] || (layout === 'feed' ? '4 / 3' : '1 / 1');
  const size = compact ? 13 : 13.5;
  return (
    <span aria-hidden="true" style={{
      background: photoGrid ? 'transparent' : 'var(--k-pc-bg)', borderRadius: 'var(--k-r-card)',
      border: photoGrid ? 'none' : 'var(--k-pc-bd)', padding: photoGrid ? 0 : 'var(--k-pc-pad)',
      boxShadow: photoGrid ? 'none' : 'var(--k-pc-sh, none)',
      display: 'flex', flexDirection: list ? 'row' : 'column', alignItems: list ? 'center' : 'stretch',
      gap: list ? 12 : 8, minWidth: 0,
    }}>
      <Sk
        w={list ? 76 : '100%'} h="auto" r={photoGrid ? 4 : 'var(--k-r-img)'}
        style={{ aspectRatio: list ? '1 / 1' : ratio }}
      />
      {!photoGrid && (
        <span style={{
          display: 'flex', alignItems: list ? 'center' : 'flex-end', justifyContent: 'space-between', gap: 8,
          padding: list ? '0 4px 0 0' : '0 4px', flex: list ? 1 : undefined, minWidth: 0,
        }}>
          <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
              minHeight: list ? undefined : `${size * 2.6}px`, fontSize: size,
            }}>
              <Sk h={11} w="86%" r={6} />
              {!list && <Sk h={11} w="52%" r={6} />}
            </span>
            {!priceOnPhoto && price && <Sk h={13} w="38%" r={6} style={{ marginTop: list ? 8 : 6, marginBottom: 2 }} />}
          </span>
          {showAdd && <Sk w={40} h={40} r="var(--k-r-ibtn)" />}
        </span>
      )}
    </span>
  );
}

/** A grid of product cards: `count` of them in `cols` columns with the grid's own gap. */
export function SkProductGrid({ cols, count, gap, layout, look, compact, price, style }) {
  return (
    <span aria-hidden="true" style={{
      display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap, ...style,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkProductCard key={i} layout={layout} look={look} compact={compact} price={price} />
      ))}
    </span>
  );
}
