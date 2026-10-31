// The design editor's show/hide switches, banner fields and cover photo (the
// design's Z3: the "რა ჩანს მაღაზიაში" card and the note under the header
// choice), kept out of ManagerDesign so that screen only places them.
//
//   DesignShowRows      every switch after the stories one ManagerDesign draws,
//                       with the banner's fields under its switch while it is on
//   DesignCoverSection  the cover photo, while the header is "cover"
//
// The switches and the banner are part of the design, so they change the
// draft like every other option and reach buyers only when it is published.
// The cover photo is not: like the logo it is the store's own picture, saved
// the moment it is chosen, and the section says so.
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../contexts/TenantContext';
import { useDevice } from '../contexts/DeviceContext';
import { Btn, Card, Toggle } from '../core/primitives';
import { Icons } from '../core/icons';
import { money } from '../core/money';
import schema from '../core/design/schema.json';
import { productApi, tenantApi } from '../utils/api';

// Every switch but stories, which ManagerDesign draws first: the board's
// (Z3) after it in its order, then the three it does not draw. Anything the
// schema adds later lands at the end rather than going missing.
const ORDER = ['banner', 'badge', 'socials', 'labels', 'price', 'tick'];
const SWITCHES = schema.show
  .filter((k) => k !== 'stories')
  .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
const { bannerTitle: TITLE_MAX, bannerSubtitle: SUBTITLE_MAX } = schema.limits;
// ImageUpload's rules on the server (5 MB, these four); checked here first so
// a wrong file is refused before it is sent.
const COVER_MAX = 5 * 1024 * 1024;
const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const sectionLabel = (T) => ({ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.07em' });
const hintStyle = (T) => ({ font: `400 12px/1.45 ${T.font}`, color: T.textMute });

function InfoIcon({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" aria-hidden="true" style={{ flex: 'none', marginTop: 1, color }}>
      <circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

/**
 * One switch, drawn like ManagerDesign's stories row: the row is the switch,
 * the Toggle only draws it, and a hint under it is the switch's description.
 */
function ShowRow({ T, label, hint, on, onClick }) {
  const hintId = useId();
  return (
    <div>
      <button
        type="button" role="switch" aria-checked={on} onClick={onClick}
        aria-describedby={hint ? hintId : undefined}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          width: '100%', minHeight: 44, padding: 0, border: 'none', background: 'transparent',
          cursor: 'pointer', color: T.text, font: `500 13px ${T.font}`, textAlign: 'left',
        }}
      >
        <span>{label}</span>
        <span aria-hidden="true" style={{ display: 'inline-flex' }}><Toggle T={T} on={on} /></span>
      </button>
      {hint && <div id={hintId} style={{ ...hintStyle(T), margin: '-4px 58px 6px 0' }}>{hint}</div>}
    </div>
  );
}

/**
 * A banner text field. What is typed stays on screen as typed: the design
 * keeps text trimmed, and writing the trimmed value back would swallow the
 * space before the next word. The field follows the design again whenever it
 * changes from elsewhere (undo, a look, cancelling changes).
 */
function BannerText({ T, label, value = '', max, tall, onCommit }) {
  const { t } = useTranslation('design');
  const id = useId();
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (text.trim().slice(0, max) !== value) setText(value);
  }
  const Control = tall ? 'textarea' : 'input';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <label htmlFor={id} style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{label}</label>
        <span aria-hidden="true" style={{ ...hintStyle(T), fontVariantNumeric: 'tabular-nums' }}>
          {t('editor.banner.count', { n: text.length, max })}
        </span>
      </div>
      <Control
        id={id} value={text} maxLength={max} rows={tall ? 3 : undefined}
        onChange={(e) => { setText(e.target.value); onCommit(e.target.value); }}
        style={{
          width: '100%', boxSizing: 'border-box', minHeight: tall ? 84 : 48, height: tall ? undefined : 48,
          padding: tall ? '12px 14px' : '0 14px', borderRadius: 'var(--k-r-in)',
          background: 'var(--k-in-bg)', border: '1.5px solid var(--k-in-bd)', color: T.text,
          font: `500 15px/1.45 ${T.font}`, outline: 'none', resize: tall ? 'vertical' : undefined,
        }}
      />
    </div>
  );
}

function Thumb({ T, src, size = 40 }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, flex: 'none', borderRadius: 10, overflow: 'hidden',
      background: T.surface2, display: 'block',
    }}>
      {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </span>
  );
}

/**
 * Which of the store's products the banner shows: the one picked, or a search
 * over the store's own products to pick one. The storefront asks for it by id,
 * so a product from another store never shows even if its id were typed in.
 */
function ProductPick({ T, productId, onPick }) {
  const { t } = useTranslation('design');
  const { isMobile } = useDevice();
  const searchId = useId();
  const [known, setKnown] = useState({}); // id → product; null when gone, false when it failed to load
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState({ phase: 'idle', items: [] }); // idle | loading | ready | failed
  const opener = useRef(null);
  const size = isMobile ? 'md' : 'sm';

  // Closing the search puts focus back on the button that opened it.
  const close = () => {
    setOpen(false);
    setQ('');
    requestAnimationFrame(() => opener.current?.focus());
  };

  // The picked product's name and photo.
  useEffect(() => {
    if (!productId || productId in known) return undefined;
    const ac = new AbortController();
    productApi.get(productId, { signal: ac.signal })
      .then((p) => { if (!ac.signal.aborted) setKnown((k) => ({ ...k, [productId]: p })); })
      .catch((e) => {
        if (ac.signal.aborted || e?.name === 'AbortError') return;
        // Gone (deleted, or not this store's) is said as such; anything else
        // is a load that failed, which says nothing about the product.
        setKnown((k) => ({ ...k, [productId]: e?.status === 404 ? null : false }));
      });
    return () => ac.abort();
  }, [productId, known]);

  // The search, a moment after typing stops.
  useEffect(() => {
    if (!open) return undefined;
    const ac = new AbortController();
    const timer = setTimeout(() => {
      setFound((f) => ({ ...f, phase: 'loading' }));
      productApi.list({ page: 0, size: 8, q: q.trim(), signal: ac.signal })
        .then((res) => { if (!ac.signal.aborted) setFound({ phase: 'ready', items: res.products }); })
        .catch((e) => { if (!ac.signal.aborted && e?.name !== 'AbortError') setFound({ phase: 'failed', items: [] }); });
    }, 250);
    return () => { clearTimeout(timer); ac.abort(); };
  }, [open, q]);

  const pick = (p) => {
    setKnown((k) => ({ ...k, [p.id]: p }));
    onPick(p.id);
    close();
  };

  const picked = productId ? known[productId] : undefined;
  const label = <div style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('editor.banner.product')}</div>;
  const hint = <div style={hintStyle(T)}>{t('editor.banner.productHint')}</div>;

  if (!open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {label}
        {productId ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 10,
            borderRadius: 'var(--k-r-in)', border: `1px solid ${T.border}`,
          }}>
            <Thumb T={T} src={picked ? picked.thumbnail || picked.images?.[0] : null} />
            <span style={{ flex: '1 1 140px', minWidth: 0, font: `600 13.5px/1.35 ${T.font}`, color: picked ? T.text : T.textMute }}>
              {picked === undefined ? t('editor.banner.loading')
                : picked === null ? t('editor.banner.missing')
                  : picked === false ? t('editor.banner.failed') : picked.title}
            </span>
            <span style={{ display: 'flex', gap: 8 }}>
              <Btn T={T} ref={opener} kind="ghost" size={size} onClick={() => setOpen(true)}>{t('editor.banner.change')}</Btn>
              <Btn T={T} kind="quiet" size={size} onClick={() => onPick(null)}>{t('editor.banner.remove')}</Btn>
            </span>
          </div>
        ) : (
          <Btn T={T} ref={opener} kind="ghost" size={size} style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>
            <Icons.plus size={14} />{t('editor.banner.pick')}
          </Btn>
        )}
        {hint}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label htmlFor={searchId} style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('editor.banner.product')}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 14px',
          boxSizing: 'border-box', borderRadius: 'var(--k-r-in)', background: 'var(--k-in-bg)',
          border: '1.5px solid var(--k-in-bd)', color: T.textMute,
        }}>
          <Icons.search size={16} />
          <input
            id={searchId} type="search" value={q} autoFocus placeholder={t('editor.banner.search')}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              color: T.text, font: `500 15px ${T.font}`, padding: 0,
            }}
          />
        </span>
        <Btn T={T} kind="ghost" size="md" onClick={close}>{t('editor.banner.cancel')}</Btn>
      </div>
      <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {found.phase === 'loading' && !found.items.length && <div style={hintStyle(T)}>{t('editor.banner.loading')}</div>}
        {found.phase === 'failed' && <div style={{ ...hintStyle(T), color: T.dangerFg }}>{t('editor.banner.failed')}</div>}
        {found.phase === 'ready' && !found.items.length && <div style={hintStyle(T)}>{t('editor.banner.noResults')}</div>}
        {found.items.map((p) => {
          const on = p.id === productId;
          return (
            <button
              key={p.id} type="button" aria-pressed={on} onClick={() => pick(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '6px 8px',
                border: 'none', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                background: on ? T.accentBg : 'transparent', color: T.text,
              }}
            >
              <Thumb T={T} src={p.thumbnail} />
              <span style={{ flex: 1, minWidth: 0, font: `600 13.5px/1.35 ${T.font}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
              <span style={{ flex: 'none', font: `500 12.5px ${T.font}`, color: T.textMute, fontVariantNumeric: 'tabular-nums' }}>{money(p.price)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The banner's heading, subtitle and product, under its switch while it is on. */
function BannerFields({ T, design, onChange }) {
  const { t } = useTranslation('design');
  const banner = design.banner || {};
  const set = (patch) => onChange({ ...design, banner: { ...banner, ...patch } });
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 14, margin: '2px 0 10px', padding: 14,
      borderRadius: 14, background: T.surface2,
    }}>
      <BannerText T={T} label={t('editor.banner.title')} value={banner.title} max={TITLE_MAX} onCommit={(v) => set({ title: v })} />
      <BannerText T={T} tall label={t('editor.banner.subtitle')} value={banner.subtitle} max={SUBTITLE_MAX} onCommit={(v) => set({ subtitle: v })} />
      <ProductPick T={T} productId={banner.productId} onPick={(id) => set({ productId: id || undefined })} />
      {!banner.title && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <InfoIcon color={T.warn} />
          <span style={{ ...hintStyle(T), color: T.textDim }}>{t('editor.banner.needsTitle')}</span>
        </div>
      )}
    </div>
  );
}

/**
 * The switches after "stories", as rows of the same card. `onChange` takes
 * the whole next design, as ManagerDesign's `change`.
 */
export function DesignShowRows({ T, design, onChange }) {
  const { t } = useTranslation('design');
  const { tenant } = useTenant();
  const verified = !!tenant?.verifiedAt;
  const hint = {
    labels: t('editor.show.labelsHint'),
    price: t('editor.show.priceHint'),
    badge: t('editor.show.badgeHint'),
    tick: verified ? null : t('editor.show.tickHint'),
    socials: t('editor.show.socialsHint'),
  };
  return (
    <>
      {SWITCHES.map((k) => (
        <div key={k}>
          <ShowRow
            T={T} label={t(`editor.show.${k}`)} hint={hint[k]} on={design.show[k]}
            onClick={() => onChange({ ...design, show: { ...design.show, [k]: !design.show[k] } })}
          />
          {k === 'banner' && design.show.banner && <BannerFields T={T} design={design} onChange={onChange} />}
        </div>
      ))}
    </>
  );
}

/**
 * The cover photo, shown while the draft's header is "cover". Without a photo
 * the design's note says what buyers see instead (Z3); with one, its preview
 * and the logo's two actions (Z2's Brand tab).
 */
export function DesignCoverSection({ T, design, sub }) {
  const { t } = useTranslation('design');
  const { isMobile } = useDevice();
  const { tenant, refresh } = useTenant();
  const input = useRef(null);
  const [busy, setBusy] = useState(''); // '' | upload | remove
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState(undefined); // the last upload's or removal's coverUrl
  const [drag, setDrag] = useState(false);
  const [focused, setFocused] = useState(false);
  if (design.header !== 'cover') return null;

  const url = answer !== undefined ? answer : tenant?.coverUrl || null;
  const size = isMobile ? 'md' : 'sm';

  const fail = (e, fallback) => {
    if (e?.status === 413) return t('editor.cover.tooLarge');
    if (e?.status === 415) return t('editor.cover.badType');
    if (e?.status === 403) return t('editor.err.forbidden');
    if (!e?.status) return t('editor.err.network');
    return t(fallback);
  };

  const upload = async (file) => {
    if (!file || busy) return;
    if (file.type && !COVER_TYPES.includes(file.type)) { setError(t('editor.cover.badType')); return; }
    if (file.size > COVER_MAX) { setError(t('editor.cover.tooLarge')); return; }
    setBusy('upload');
    setError('');
    try {
      const store = await tenantApi.uploadCover(file, sub);
      setAnswer(store?.coverUrl || null);
      // The storefront chrome and the rest of the back office read it here.
      Promise.resolve().then(refresh).catch(() => {});
    } catch (e) {
      setError(fail(e, 'editor.cover.failed'));
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy('remove');
    setError('');
    try {
      await tenantApi.deleteCover(sub);
      setAnswer(null);
      Promise.resolve().then(refresh).catch(() => {});
    } catch (e) {
      setError(fail(e, 'editor.cover.removeFailed'));
    } finally {
      setBusy('');
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again
    upload(file);
  };

  const fileInput = (
    <input
      ref={input} type="file" accept={COVER_TYPES.join(',')} aria-label={t('editor.cover.title')}
      onChange={onFile} disabled={!!busy}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden' }}
    />
  );

  return (
    <Card T={T} pad={18}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={sectionLabel(T)}>{t('editor.cover.title')}</div>

        {url ? (
          <>
            <div style={{
              position: 'relative', overflow: 'hidden', borderRadius: 14, background: T.surface2,
              aspectRatio: '16 / 5', minHeight: 90,
            }}>
              <img src={url} alt={t('editor.cover.current')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {fileInput}
              <Btn T={T} kind="ghost" size={size} disabled={!!busy} onClick={() => input.current?.click()}>
                <Icons.upload size={15} />{busy === 'upload' ? t('editor.cover.uploading') : t('editor.cover.change')}
              </Btn>
              <Btn T={T} kind="danger" size={size} disabled={!!busy} onClick={remove}>
                {busy === 'remove' ? t('editor.cover.removing') : t('editor.cover.remove')}
              </Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <InfoIcon color={T.warn} />
              <span style={{ ...hintStyle(T), color: T.textDim }}>{t('editor.cover.none')}</span>
            </div>
            {/* The kit's drop zone: a whole-card target, a file dropped on it
                or chosen through it. */}
            <label
              onDragOver={(e) => { e.preventDefault(); if (!drag) setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer?.files?.[0]); }}
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: isMobile ? 20 : 24, borderRadius: 16, textAlign: 'center', cursor: busy ? 'default' : 'pointer',
                border: `2px dashed ${drag || focused ? T.accent : T.border}`,
                background: drag ? T.accentBg : T.surface, color: T.textDim,
                outline: focused ? `2px solid ${T.accent}` : 'none', outlineOffset: 2,
              }}
            >
              {fileInput}
              <PhotoIcon />
              <b style={{ font: `600 14px ${T.font}`, color: T.text }}>
                {busy === 'upload' ? t('editor.cover.uploading') : isMobile ? t('editor.cover.choose') : t('editor.cover.drop')}
              </b>
              <span style={hintStyle(T)}>{t('editor.cover.types')}</span>
            </label>
          </>
        )}

        <div style={hintStyle(T)}>{t('editor.cover.live')}</div>
        {error && <div role="alert" style={{ font: `500 12.5px/1.45 ${T.font}`, color: T.dangerFg }}>{error}</div>}
      </div>
    </Card>
  );
}
