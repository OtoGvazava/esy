// The design editor's overlays (the design's Z4, plus the preview a phone has
// no room to keep on screen). Publishing lists exactly what buyers will see
// change before anything goes live; deleting the draft is a danger action and
// confirms first. Each is a centred dialog on a wide screen and a bottom sheet
// on a phone. Copy comes from the `design` namespace, under `editor`.
import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Btn, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { track } from '../core/tokens';
import LookThumb from '../components/design/LookThumb';

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

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close.current(); }}
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
          width: 40, height: 40, flex: 'none', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: T.surface2, color: T.text, display: 'inline-grid', placeItems: 'center',
        }}
      ><Icons.x size={16} /></button>
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

const countLabel = (T) => ({ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.07em' });

/**
 * Z4: confirm before anything goes live, with the list of changes against
 * the published design. "Not yet" is focused first — the safe choice.
 */
export function PublishDialog({ T, isMobile, host, rows, busy, error, canPublish, onPublish, onClose }) {
  const { t } = useTranslation('design');
  const titleId = useId();
  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={onClose}>
      <Head T={T} titleId={titleId} title={t('editor.publishTitle')} onClose={onClose} />
      <p style={lead(T)}>{t('editor.publishBody', { host })}</p>
      <div style={countLabel(T)}>{t('editor.changes', { count: rows.length })}</div>
      <ChangeList T={T} rows={rows} />
      {error && <Note T={T} tone="danger">{error}</Note>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn T={T} kind="ghost" data-autofocus disabled={busy} onClick={onClose}>{t('editor.notYet')}</Btn>
        <Btn T={T} disabled={busy || !canPublish} onClick={onPublish} style={{ flex: 1 }}>
          {busy ? t('editor.publishing') : t('editor.publish')}
        </Btn>
      </div>
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

/** A phone keeps no preview beside the options, so it opens one here. */
export function PreviewDialog({ T, isMobile, design, brand, mode, draft, q, onClose }) {
  const { t } = useTranslation('design');
  const titleId = useId();
  const title = draft ? `${t('editor.livePreview')} · ${t('editor.draftTag')}` : t('editor.livePreview');
  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={onClose}>
      <Head T={T} titleId={titleId} title={title} onClose={onClose} />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 4px' }}>
        <LookThumb design={design} brand={brand} mode={mode} scale={1.15} />
      </div>
      <p style={{ ...lead(T), font: `400 12px/1.5 ${T.font}`, textAlign: 'center' }}>
        {t('editor.previewCaption')}{' '}
        <Link to={`/settings/brand${q}`} style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>
          {t('editor.changeColour')}
        </Link>
      </p>
    </Sheet>
  );
}
