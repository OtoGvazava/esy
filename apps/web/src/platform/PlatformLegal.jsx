// Terms · Privacy · Cancellations-and-returns (the design's annex LegalPage).
//
// These were the last dead links on the platform: the footer has always listed
// them, and every one led nowhere. They are also the pages a marketplace is
// obliged to have — the thing a merchant or a buyer asks for at exactly the
// moment something has gone wrong.
//
// One component serves all three because they share a shape: a title, a date,
// and a list of sections where each has a plain-language summary above the
// full text. The summary is the point — it is what someone reads when they do
// not want to read terms, and it carries the same meaning as the paragraph
// under it rather than being a teaser for it.
import { useTranslation } from 'react-i18next';
import { usePlatform, PTopBar, PFooter } from './PlatformShared';

/** kind: 'terms' | 'privacy' | 'returns' */
export default function PlatformLegal({ kind = 'terms' }) {
  const { T, isDesktop } = usePlatform();
  const { t } = useTranslation('platform');
  const mob = !isDesktop;
  // returnObjects gives the array of [heading, summary, body] triples the
  // locale files hold, so a section can be added in translation alone.
  const sections = t(`legal.${kind}.s`, { returnObjects: true });
  const rows = Array.isArray(sections) ? sections : [];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <PTopBar />
      <div style={{ padding: mob ? '24px 20px 12px' : '40px 48px 16px', maxWidth: mob ? undefined : 760 }}>
        <h1 style={{ margin: 0, font: `700 ${mob ? 26 : 34}px ${T.font}`, letterSpacing: '-0.035em', color: T.text }}>
          {t(`legal.${kind}.title`)}
        </h1>
        <div style={{ marginTop: 8, font: `500 12.5px ${T.font}`, color: T.textMute }}>{t('legal.updated')}</div>
      </div>

      <div style={{
        padding: mob ? '0 20px 40px' : '0 48px 56px', maxWidth: mob ? undefined : 760,
        display: 'flex', flexDirection: 'column', gap: mob ? 16 : 20,
      }}>
        {rows.map(([heading, summary, body]) => (
          <div key={heading} style={{
            borderRadius: 18, background: T.surface, border: `1px solid ${T.border}`,
            padding: mob ? 18 : 24,
          }}>
            <div style={{ font: `700 16px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{heading}</div>
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 12,
              background: T.accentBg, font: `600 13px/1.5 ${T.font}`, color: T.accentFg,
            }}>{summary}</div>
            <div style={{ marginTop: 12, font: `400 13.5px/1.75 ${T.font}`, color: T.textDim }}>{body}</div>
          </div>
        ))}
      </div>

      <PFooter />
    </div>
  );
}
