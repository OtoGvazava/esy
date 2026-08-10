// The help centre (the design's annex HelpCentre).
//
// Four categories, the questions people actually ask, and a way to reach a
// human. The last block matters most: a marketplace where something has gone
// wrong with someone's money or parcel needs a phone number on the page, not a
// contact form that returns a ticket id.
//
// The search field is presentational for now — there is nothing to search yet,
// since the answers below are the whole corpus. It is rendered because the
// design leads with it and because it is where a person looks first; when
// there are enough articles to justify an index it becomes real. Note that it
// is NOT an input: a box you can type into and get nothing back is worse than
// a labelled affordance that clearly is not ready.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlatform, PTopBar, PFooter } from './PlatformShared';
import { Icons } from '../core/icons';

const CATS = [
  ['orders', 'truck'],
  ['pay', 'card'],
  ['sell', 'box'],
  ['acc', 'user'],
];

export default function PlatformHelp() {
  const { T, isDesktop } = usePlatform();
  const { t } = useTranslation('platform');
  const mob = !isDesktop;
  const [open, setOpen] = useState(0);

  const qa = t('help.qa', { returnObjects: true });
  const rows = Array.isArray(qa) ? qa : [];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <PTopBar current="help" />

      <div style={{ padding: mob ? '26px 20px 18px' : '48px 48px 24px', textAlign: mob ? 'left' : 'center' }}>
        <h1 style={{ margin: 0, font: `700 ${mob ? 26 : 36}px ${T.font}`, letterSpacing: '-0.035em', color: T.text }}>
          {t('help.title')}
        </h1>
        <div style={{
          margin: mob ? '16px 0 0' : '20px auto 0', maxWidth: 520,
          display: 'flex', alignItems: 'center', gap: 10, height: 54, padding: '0 18px',
          borderRadius: 15, background: T.surface, border: `1px solid ${T.border}`,
          color: T.textMute, font: `500 14px ${T.font}`,
        }}>
          <Icons.search size={17} /> {t('help.searchPlaceholder')}
        </div>
      </div>

      <div style={{ padding: mob ? '6px 20px 20px' : '12px 48px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: mob ? '1fr' : 'repeat(4, 1fr)',
          gap: 12, maxWidth: mob ? undefined : 1000, margin: '0 auto',
        }}>
          {CATS.map(([id, icon]) => {
            const Ic = Icons[icon];
            return (
              <div key={id} style={{ borderRadius: 18, background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
                <span style={{
                  width: 38, height: 38, borderRadius: 12, background: T.accentBg, color: T.accentFg,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}>{Ic && <Ic size={17} />}</span>
                <div style={{ font: `700 14.5px ${T.font}`, color: T.text }}>{t(`help.cats.${id}.k`)}</div>
                <div style={{ marginTop: 5, font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>{t(`help.cats.${id}.s`)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: mob ? '8px 20px 24px' : '16px 48px 32px', maxWidth: mob ? undefined : 760, margin: '0 auto' }}>
        <div style={{ font: `700 18px ${T.font}`, color: T.text, letterSpacing: '-0.02em', marginBottom: 12 }}>
          {t('help.commonQuestions')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(([q, a], i) => (
            <button
              key={q}
              type="button"
              onClick={() => setOpen(open === i ? -1 : i)}
              style={{
                textAlign: 'left', width: '100%', cursor: 'pointer',
                borderRadius: 18, background: T.surface, border: `1px solid ${T.border}`,
                padding: mob ? 16 : 20, color: T.text, font: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, font: `700 14px ${T.font}`, color: T.text }}>{q}</span>
                <span style={{ color: T.textMute, display: 'flex', transform: open === i ? 'rotate(180deg)' : 'none' }}>
                  <Icons.chevD size={14} />
                </span>
              </div>
              {open === i && (
                <div style={{ marginTop: 10, font: `400 13px/1.7 ${T.font}`, color: T.textDim }}>{a}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: mob ? '0 20px 36px' : '0 48px 48px', maxWidth: mob ? undefined : 760, margin: '0 auto' }}>
        <div style={{
          borderRadius: 18, background: T.surface, border: `1px solid ${T.border}`, padding: mob ? 18 : 24,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{
            width: 46, height: 46, borderRadius: 15, background: T.accentBg, color: T.accentFg,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><Icons.phone size={20} /></span>
          <span style={{ flex: 1, minWidth: 200 }}>
            <span style={{ display: 'block', font: `700 15px ${T.font}`, color: T.text }}>{t('help.talkTitle')}</span>
            <span style={{ display: 'block', marginTop: 4, font: `400 12.5px/1.55 ${T.font}`, color: T.textDim }}>
              {t('help.talkBody')}
            </span>
          </span>
          <a
            href="tel:+995322401200"
            style={{
              height: 46, padding: '0 20px', borderRadius: 14, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', background: T.grad, color: '#fff',
              font: `700 13.5px ${T.font}`, boxShadow: `0 10px 24px ${T.accent}55`,
            }}
          >{t('help.call')}</a>
        </div>
      </div>

      <PFooter />
    </div>
  );
}
