// The design editor's overlays (the design's Z4, plus the preview a phone has
// no room to keep on screen). Publishing lists exactly what buyers will see
// change before anything goes live; deleting the draft is a danger action and
// confirms first. Each is a centred dialog on a wide screen and a bottom sheet
// on a phone. Copy comes from the `design` namespace, under `editor`.
//
// Publishing also checks the store colour the design will go live with: the
// storefront writes white or black on it by its lightness (themes.css,
// --k-on-pri), and a mid-tone fails 4.5:1 either way. Then the dialog says
// so, shows the buy button before and after, and offers the colour's darker
// shade — "fix" saves that shade into the draft and publishes.
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../contexts/TenantContext';
import { Btn, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { mixHex, safeAccent, track } from '../core/tokens';
import StorePreview from '../components/design/StorePreview';

// ---- The colour check ------------------------------------------------------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toHex = (rgb) => `#${rgb.match(/\d+/g).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
/** WCAG relative luminance. */
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** OKLab lightness, as the stylesheet's `oklch(from …)` reads it. */
const okL = (hex) => {
  const [r, g, b] = channels(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
};
/** The text the storefront writes on a button of this colour (themes.css --k-on-pri). */
const textOn = (hex) => (okL(hex) < 0.596 ? '#ffffff' : '#000000');
// WCAG AA for the buttons' text, and the fix's aim: a little over the line,
// as the board's own fix (5,1:1), so the shade is not left on the edge.
const PASS = 4.5;
const AIM = 5;

/**
 * The check for the colour a design goes live with: the button text's
 * contrast, and when it fails, the first darker shade on which white reads.
 */
function colourCheck(hex) {
  const colour = safeAccent(hex, null);
  if (!colour) return null;
  const text = textOn(colour);
  const contrast = ratio(colour, text);
  if (contrast >= PASS) return { ok: true, colour, text, contrast };
  for (let i = 1; i <= 100; i++) {
    const shade = toHex(mixHex(colour, '#000000', i / 100));
    if (textOn(shade) === '#ffffff' && ratio(shade, '#ffffff') >= AIM) {
      return { ok: false, colour, text, contrast, fixed: shade, fixedContrast: ratio(shade, '#ffffff') };
    }
  }
  return { ok: false, colour, text, contrast, fixed: null };
}

/** A ratio as the board writes it: one place, the Georgian decimal comma. */
const ratioText = (n, lang) => String(Math.floor(n * 10) / 10).replace('.', String(lang || '').startsWith('ka') ? ',' : '.');

function Sheet({ T, isMobile, titleId, onClose, children }) {
  const box = useRef(null);
  // The latest close handler, so the listeners below are set up once and the
  // focus is not pulled back to the dialog on every render.
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  useEffect(() => {
    const before = document.activeElement;
    (box.current?.querySelector('[data-autofocus]:not([disabled])') || box.current)?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (before && typeof before.focus === 'function') before.focus();
    };
  }, []);

  // It opens over a fading scrim, rising from the bottom on a phone and
  // growing in elsewhere (styles/motion.css).
  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close.current(); }}
      className="esy-scrim" data-state="open"
      style={{
        position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(8,8,12,0.44)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={isMobile ? 'esy-sheet' : 'esy-pop-in'} data-state="open"
        style={{
          width: '100%', maxWidth: isMobile ? 'none' : 520, boxSizing: 'border-box',
          maxHeight: isMobile ? '88vh' : 'calc(100vh - 48px)', overflowY: 'auto', outline: 'none',
          display: 'flex', flexDirection: 'column', gap: 16,
          padding: isMobile ? '10px 16px 22px' : 26,
          borderRadius: isMobile ? '24px 24px 0 0' : 24,
          background: T.surface, color: T.text, boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)',
        }}
      >
        {isMobile && (
          <span aria-hidden="true" style={{
            width: 42, height: 5, borderRadius: 3, background: T.border, alignSelf: 'center', flex: 'none',
          }} />
        )}
        {children}
      </div>
    </div>
  );
}

function Head({ T, titleId, title, onClose }) {
  const { t, i18n } = useTranslation('design');
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <h2 id={titleId} style={{
        margin: 0, font: `700 20px/1.22 ${T.font}`, color: T.text,
        letterSpacing: track(i18n.language, '-0.015em'),
      }}>{title}</h2>
      <button
        type="button" onClick={onClose} aria-label={t('editor.close')}
        style={{
          width: 44, height: 44, flex: 'none', borderRadius: 'var(--k-r-ibtn, 12px)', border: 'none', cursor: 'pointer',
          background: T.surface2, color: T.text, display: 'inline-grid', placeItems: 'center',
        }}
      ><Icons.x size={18} /></button>
    </div>
  );
}

const lead = (T) => ({ margin: 0, font: `400 13px/1.55 ${T.font}`, color: T.textDim });

function Swatch({ hex, size = 14 }) {
  return (
    <i aria-hidden="true" style={{
      display: 'inline-block', width: size, height: size, borderRadius: 4, flex: 'none',
      background: hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
    }} />
  );
}

const ROW_ICON = {
  look: 'star', theme: 'spark', menu: 'menu', productLayout: 'grid', header: 'card', stories: 'eye', details: 'gear',
};

// The switches after stories are `show.<key>` rows and the banner's text is
// `bannerText` (designDraft.designChanges); their names live with their
// controls (DesignSections).
const isSwitch = (key) => key.startsWith('show.');
const rowIcon = (key) => Icons[ROW_ICON[key] || (isSwitch(key) ? 'eye' : key === 'bannerText' ? 'card' : '')];
const rowLabel = (t, key) => {
  if (isSwitch(key)) return t(`editor.show.${key.slice(5)}`);
  if (key === 'bannerText') return t('editor.banner.row');
  return t(`editor.change.${key}`);
};

/** One side of a change, as the owner reads it. */
function valueLabel(t, key, v) {
  if (isSwitch(key)) return t(v ? 'editor.switchOn' : 'editor.switchOff');
  switch (key) {
    case 'bannerText': return v ? t('editor.banner.quoted', { title: v }) : t('editor.banner.noTitle');
    case 'look': return t(`names.${v}`);
    case 'theme': return t(`theme.${v}`);
    case 'menu': return t(`menu.${v}`);
    case 'productLayout': return t(`layout.${v}`);
    case 'header': return t(`editor.headerOpt.${v}`);
    case 'stories': return t(v ? 'editor.switchOn' : 'editor.switchOff');
    default: return String(v).toUpperCase();
  }
}

/** The Z4 list: what changes, from what, to what ("მენიუ: ქვედა მენიუ → კაფსულა"). */
function ChangeList({ T, rows }) {
  const { t } = useTranslation('design');
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.surface, overflow: 'hidden' }}>
      {rows.map((row, i) => {
        const colour = row.key === 'primary' || row.key === 'second';
        const Ic = rowIcon(row.key);
        const side = (v) => (colour
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: T.mono }}><Swatch hex={v} />{valueLabel(t, row.key, v)}</span>
          : <span>{valueLabel(t, row.key, v)}</span>);
        return (
          <div key={row.key} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', minHeight: 56,
            boxSizing: 'border-box', borderTop: i ? `1px solid ${T.border}` : 'none',
          }}>
            <span aria-hidden="true" style={{
              width: 34, height: 34, borderRadius: 10, flex: 'none', background: T.surface2, color: T.text,
              display: 'grid', placeItems: 'center',
            }}>
              {colour ? <Swatch hex={row.to} size={16} /> : Ic && <Ic size={17} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', font: `500 12px ${T.font}`, color: T.textDim }}>
                {rowLabel(t, row.key)}
              </span>
              <span style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2,
                font: `700 13px/1.4 ${T.font}`, color: T.text,
              }}>
                {row.key === 'details' ? (
                  <span>{t('editor.changes', { count: row.count })}</span>
                ) : (
                  <>
                    {row.from !== null && row.from !== undefined && (
                      <>{side(row.from)}<span style={{ color: T.textMute }}>{'→'}</span></>
                    )}
                    {side(row.to)}
                  </>
                )}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

const countLabel = (T) => ({ font: `600 11.5px/1.2 ${T.font}`, color: T.textMute, letterSpacing: '0.06em' });

// The kit's alert (ok and warn), with its icon.
const ALERT_ICON = {
  ok: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  warn: <><path d="M12 4 2.5 20h19z" /><path d="M12 10v4M12 17v.5" /></>,
};
function Alert({ T, tone, children }) {
  return (
    <div role={tone === 'warn' ? 'alert' : undefined} style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 'var(--k-r-card, 16px)',
      background: tone === 'ok' ? T.successBg : T.warnBg, color: T.text,
    }}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flex: 'none', strokeWidth: 'var(--k-ic-w, 1.8)', color: tone === 'ok' ? T.successFg : T.warnFg }}>
        {ALERT_ICON[tone]}
      </svg>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, font: `400 12.5px/1.5 ${T.font}` }}>
        {children}
      </div>
    </div>
  );
}

/** The buy button as a shopper would see it in a colour (a sample, not a control). */
function BuySample({ T, colour, text, label }) {
  return (
    <span aria-hidden="true" style={{
      display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 15px', borderRadius: 'var(--k-r-btn, 12px)',
      background: colour, color: text, font: `600 13.5px/1 ${T.font}`, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

/**
 * Z4: confirm before anything goes live, with the list of changes against
 * the published design and the colour check. "Not yet" is focused first —
 * the safe choice. `onPublish()` publishes the saved draft; `onPublish(hex)`
 * first puts that store colour into it (the check's darker shade).
 */
export function PublishDialog({ T, isMobile, host, rows, busy, error, canPublish, onPublish, onClose }) {
  const { t, i18n } = useTranslation('design');
  const { tenant } = useTenant();
  const titleId = useId();
  // The colour buyers will see: the draft's new one, or the store's own.
  const next = rows.find((r) => r.key === 'primary')?.to || tenant?.primaryColor;
  const check = colourCheck(next);
  const warn = check && !check.ok && check.fixed;
  const lang = i18n.language;
  const notYet = <Btn T={T} kind="ghost" data-autofocus disabled={busy} onClick={onClose}>{t('editor.notYet')}</Btn>;

  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={onClose}>
      <Head T={T} titleId={titleId} title={t('editor.publishTitle')} onClose={onClose} />
      <p style={lead(T)}>{t('editor.publishBody', { host })}</p>
      <div style={countLabel(T)}>{t('editor.changes', { count: rows.length })}</div>
      <ChangeList T={T} rows={rows} />
      {check?.ok && <Alert T={T} tone="ok"><span>{t('publishCheck.ok')}</span></Alert>}
      {warn && (
        <Alert T={T} tone="warn">
          <span>
            <b>{t(check.text === '#ffffff' ? 'publishCheck.leadWhite' : 'publishCheck.leadBlack', { colour: check.colour.toUpperCase() })}</b>{' '}
            {t('publishCheck.body', {
              ratio: ratioText(check.contrast, lang), fixed: check.fixed.toUpperCase(), fixedRatio: ratioText(check.fixedContrast, lang),
            })}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <BuySample T={T} colour={check.colour} text={check.text} label={t('publishCheck.buy')} />
            <span aria-hidden="true" style={{ color: T.textDim }}>{'→'}</span>
            <BuySample T={T} colour={check.fixed} text="#ffffff" label={t('publishCheck.buy')} />
          </span>
        </Alert>
      )}
      {error && <Note T={T} tone="danger">{error}</Note>}
      {warn ? (
        // A phone puts the fix on a row of its own, first; a wide screen keeps
        // the three in one row, the fix last and widest.
        <div style={{ display: 'flex', gap: 10, flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'flex-end' }}>
          {notYet}
          <Btn T={T} kind="quiet" disabled={busy || !canPublish} onClick={() => onPublish()} style={{ flex: isMobile ? '1 1 auto' : 'none' }}>
            {t('publishCheck.anyway')}
          </Btn>
          <Btn
            T={T} disabled={busy || !canPublish} onClick={() => onPublish(check.fixed)}
            style={isMobile ? { order: -1, flex: '1 0 100%' } : { flex: '1 1 auto' }}
          >
            {busy ? t('editor.publishing') : t('publishCheck.fix')}
          </Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          {notYet}
          <Btn T={T} disabled={busy || !canPublish} onClick={() => onPublish()} style={{ flex: 1 }}>
            {busy ? t('editor.publishing') : t('editor.publish')}
          </Btn>
        </div>
      )}
    </Sheet>
  );
}

/** Deleting the draft throws the changes away, so it says how many and asks. */
export function DiscardDialog({ T, isMobile, count, busy, error, onDiscard, onClose }) {
  const { t } = useTranslation('design');
  const titleId = useId();
  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={onClose}>
      <Head T={T} titleId={titleId} title={t('editor.deleteTitle')} onClose={onClose} />
      <p style={lead(T)}>{count ? t('editor.deleteBody', { count }) : t('editor.deleteBodySame')}</p>
      {error && <Note T={T} tone="danger">{error}</Note>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn T={T} kind="ghost" data-autofocus disabled={busy} onClick={onClose}>{t('editor.notYet')}</Btn>
        <Btn T={T} kind="danger" disabled={busy} onClick={onDiscard} style={{ flex: 1 }}>
          {busy ? t('editor.deleting') : t('editor.deleteDraft')}
        </Btn>
      </div>
    </Sheet>
  );
}

/**
 * A phone keeps no preview beside the options, so it opens one here.
 * `catalogue` is the store's first page of products ({ items, total }), or
 * null while it loads.
 */
export function PreviewDialog({ T, isMobile, design, tenant, catalogue, brand, mode, draft, q, onClose }) {
  const { t } = useTranslation('design');
  const titleId = useId();
  const title = draft ? `${t('editor.livePreview')} · ${t('editor.draftTag')}` : t('editor.livePreview');
  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={onClose}>
      <Head T={T} titleId={titleId} title={title} onClose={onClose} />
      {/* The padding is the room the phone's bezel draws in. */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 6px' }}>
        <StorePreview
          design={design} tenant={tenant} brand={brand} mode={mode} width={isMobile ? 260 : 300}
          products={catalogue ? catalogue.items : null} total={catalogue?.total}
        />
      </div>
      <p style={{ ...lead(T), font: `400 12px/1.5 ${T.font}`, textAlign: 'center' }}>
        {catalogue && !catalogue.items.length ? t('editor.previewSample') : t('editor.previewCaption')}{' '}
        <Link to={`/settings/brand${q}`} style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>
          {t('editor.changeColour')}
        </Link>
      </p>
    </Sheet>
  );
}
