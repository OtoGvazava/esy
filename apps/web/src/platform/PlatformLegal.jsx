// The rules (the design's L3): terms, privacy, returns and the seller terms as
// one page with a pill per document. Each opens with a short plain-language
// summary ("in short:"), then numbered sections; a desktop keeps the contents
// beside the text and marks the section you are reading, a phone and a tablet
// fold them into one row above it.
//
// The text lives in the locale files (platform.json → legalDocs), a section
// per key in reading order, so a section is added in translation alone. A
// sentence may link to another document with <returns> or <seller>.
//
// The design leaves the operator's registered name, number and address for
// the lawyer ("[full legal text…]"); the page says what the platform actually
// does in plain words until that text exists, rather than print a placeholder.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { usePlatform, PTopBar, PFooter } from './PlatformShared';
import { Alert, Glyph, Lbl, Pill, cardStyle, miStyle, type, usePDevice } from './PlatformKit';

/** The documents, in the pills' order, and where each one lives. */
const DOCS = [
  { kind: 'terms', path: '/terms' },
  { kind: 'privacy', path: '/privacy' },
  { kind: 'returns', path: '/returns' },
  { kind: 'seller', path: '/seller-terms' },
];

/** kind: 'terms' | 'privacy' | 'returns' | 'seller' */
export default function PlatformLegal({ kind = 'terms' }) {
  const { T } = usePlatform();
  const { ph, desk, gut } = usePDevice();
  const { t } = useTranslation('platform');
  const ty = type(T, desk);
  const [tocOpen, setTocOpen] = useState(false);

  // returnObjects gives the sections in reading order: { key: { h, p } }.
  const raw = t(`legalDocs.${kind}.sections`, { returnObjects: true });
  const keys = raw && typeof raw === 'object' ? Object.keys(raw).join('|') : '';
  const sections = useMemo(() => (keys ? keys.split('|') : []), [keys]);
  const idOf = (key) => `${kind}-${key}`;
  const [current, setCurrent] = useState(sections[0]);

  // The contents mark the section at the top of the window.
  useEffect(() => {
    setCurrent(sections[0]);
    setTocOpen(false);
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const els = sections.map((k) => document.getElementById(`${kind}-${k}`)).filter(Boolean);
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
      const top = els.find((el) => seen.get(el.id));
      if (top) setCurrent(top.id.slice(kind.length + 1));
    }, { rootMargin: '0px 0px -60% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [kind, sections]);

  const go = (key) => (e) => {
    e.preventDefault();
    document.getElementById(idOf(key))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrent(key);
    setTocOpen(false);
  };
  const link = { color: T.accentFg, fontWeight: 600, textDecoration: 'none' };
  const components = { returns: <Link to="/returns" style={link} />, seller: <Link to="/seller-terms" style={link} /> };

  const toc = sections.map((key) => (
    <a
      key={key}
      href={`#${idOf(key)}`}
      onClick={go(key)}
      aria-current={current === key ? 'location' : undefined}
      style={miStyle(T, current === key)}
    >
      {t(`legalDocs.${kind}.sections.${key}.h`)}
    </a>
  ));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}` }}>
      <PTopBar />
      <main style={{ flex: '1 0 auto', paddingBottom: 48 }}>
        <div style={desk
          ? { display: 'flex', gap: 48, padding: '36px 0 0', maxWidth: 1080, margin: '0 auto', alignItems: 'flex-start' }
          : { display: 'flex', padding: ph ? `10px ${gut}px 0` : `30px ${gut}px 0` }}
        >
          {desk && (
            <nav aria-label={t('legalDocs.tocLabel')} style={{ width: 240, flex: 'none', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 16 }}>
              <Lbl T={T} style={{ padding: '0 12px 8px' }}>{t('legalDocs.toc')}</Lbl>
              {toc}
            </nav>
          )}

          <article style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minWidth: 0, maxWidth: 720 }}>
            <div
              role="tablist"
              aria-label={t('legalDocs.tabsLabel')}
              style={{
                display: 'flex', gap: 8, flex: 'none', flexWrap: 'nowrap',
                ...(ph ? {
                  overflowX: 'auto', scrollbarWidth: 'none', margin: `0 -${gut}px`, padding: `0 ${gut}px`,
                  maskImage: 'linear-gradient(90deg, #000 calc(100% - 44px), transparent)',
                  WebkitMaskImage: 'linear-gradient(90deg, #000 calc(100% - 44px), transparent)',
                } : { overflow: 'hidden' }),
              }}
            >
              {DOCS.map((d) => (
                <Pill key={d.kind} T={T} to={d.path} on={d.kind === kind} role="tab" aria-selected={d.kind === kind}>
                  {t(`legalDocs.tab.${d.kind}`)}
                </Pill>
              ))}
            </div>

            <div>
              <h1 style={ty.h1}>{t(`legalDocs.${kind}.title`)}</h1>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: T.textDim }}>{t('legalDocs.updated')}</p>
            </div>

            {!desk && (
              <div style={{ ...cardStyle(T), overflow: 'hidden' }}>
                <button
                  type="button"
                  aria-expanded={tocOpen}
                  aria-controls={`${kind}-toc`}
                  onClick={() => setTocOpen((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 52, padding: '0 16px',
                    border: 0, background: 'transparent', color: T.text, cursor: 'pointer', textAlign: 'left', font: 'inherit',
                  }}
                >
                  <Lbl T={T} style={{ color: T.text }}>{t('legalDocs.toc')}</Lbl>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.textDim }}>
                    {t('legalDocs.parts', { count: sections.length, n: sections.length })}
                  </span>
                  <Glyph name={tocOpen ? 'chevU' : 'chevD'} size={16} />
                </button>
                {tocOpen && (
                  <nav id={`${kind}-toc`} aria-label={t('legalDocs.tocLabel')} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px 8px' }}>
                    {toc}
                  </nav>
                )}
              </div>
            )}

            <Alert T={T}>
              <b>{t('legalDocs.short')}</b>{' '}{t(`legalDocs.${kind}.summary`)}
            </Alert>

            {sections.map((key) => (
              <section key={key} id={idOf(key)} style={{ display: 'flex', flexDirection: 'column', gap: 8, scrollMarginTop: 16 }}>
                <h2 style={ty.h3}>{t(`legalDocs.${kind}.sections.${key}.h`)}</h2>
                <p style={{ ...ty.body, color: T.textDim }}>
                  <Trans t={t} i18nKey={`legalDocs.${kind}.sections.${key}.p`} components={components} />
                </p>
              </section>
            ))}
          </article>
        </div>
      </main>
      <PFooter />
    </div>
  );
}
