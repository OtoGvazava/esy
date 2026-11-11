// The end of opening a store: the review with the seller terms (the design's
// O8), the creating screen with its showreel and counter (O9), and the store
// live with what to do next (O10).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LookThumb from '../../components/design/LookThumb';
import StorePreview from '../../components/design/StorePreview';
import { LOOKS } from '../../core/design/looks';
import { normalizeDesign } from '../../core/design/normalize';
import { WAYS_TO_LOOK, groupDigits } from '../../core/design/variety';
import { FEE_PERCENT } from '../../core/money';
import { onColor } from '../../core/tokens';
import { managerUrl } from '../../utils/hosts';
import { Btn, Ic, SellScreen, Wrap } from './kit';
import { colourName } from './setup';

/** A store's avatar: its logo, or its initials on its colour. */
function Avatar({ own, colour, className = 'sm', style }) {
  return (
    <span className={`sl-av ${className}`} style={{ background: colour, color: onColor(colour), ...style }} aria-hidden="true">
      {own.logo ? <img src={own.logo} alt="" /> : own.initials}
    </span>
  );
}

/** O8 — everything at once, each with a way back to change it, and the seller terms. */
export function SellCheck({ dev, top, name, host, group, groupLabel, lookId, design, colour, fromLogo, logoName, own, agreed, onAgree, onEdit, onPublish, error }) {
  const { t } = useTranslation('platform');
  const { t: td } = useTranslation('design');
  const colourText = t(`open.colours.${colourName(colour)}`);
  const cta = <Btn off={!agreed} onClick={onPublish}>{t('open.check.publish')}</Btn>;
  const row = (icon, label, value, sub, step) => (
    <div className="sl-li" key={step}>
      {icon}
      <div className="sl-grow">
        <span className="sl-xs sl-dim">{label}</span>
        <b className="sl-sm" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</b>
        {sub}
      </div>
      <button type="button" className="sl-link sl-sm" onClick={() => onEdit(step)} aria-label={t('open.check.changeWhat', { what: label })}>{t('open.change')}</button>
    </div>
  );

  return (
    <SellScreen {...top} bar={dev === 'ph' ? cta : null}>
      <Wrap
        dev={dev} side gap={{ ph: 18, tab: 30 }} top={{ ph: 18 }}
        aside={dev !== 'ph' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div role="img" aria-label={t('open.check.preview')}><LookThumb design={design} brand={colour} scale={dev === 'desk' ? 1.2 : 1} group={group} {...own} /></div>
          </div>
        )}
      >
        <div className="sl-stk" style={{ gap: dev === 'ph' ? 16 : 18 }}>
          <div className="sl-row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <div className="sl-stk sl-grow" style={{ gap: 6 }}>
              <h1 className="sl-h1">{t('open.check.title')}</h1>
              <p className="sl-p">{t('open.check.body')}</p>
            </div>
            {dev === 'ph' && <div role="img" aria-label={t('open.check.preview')}><LookThumb design={design} brand={colour} scale={0.4} group={group} {...own} /></div>}
          </div>

          <div className="sl-list">
            {row(<span className="sl-li-ic"><Ic name="link" /></span>, t('open.steps.name'), name, <div className="sl-xs sl-dim">{host}</div>, 'name')}
            {row(<span className="sl-li-ic"><Ic name={group || 'other'} /></span>, t('open.steps.category'), groupLabel, null, 'category')}
            {lookId && row(
              <span className="sl-li-ic"><Ic name="palette" /></span>, t('open.steps.look'),
              `${td(`names.${lookId}`)} · ${td(`theme.${design.theme}`)} · ${td(`menu.${design.menu}`)}`, null, 'look',
            )}
            {row(
              <Avatar own={own} colour={colour} style={{ borderRadius: 10 }} />, t('open.steps.brand'),
              logoName || t('open.check.noLogo'),
              <div className="sl-xs sl-dim sl-row" style={{ gap: 6 }}>
                <i aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: colour, flex: 'none', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }} />
                {fromLogo ? t('open.check.fromLogo', { colour: colourText }) : colourText}
              </div>,
              'brand',
            )}
          </div>

          <label className="sl-row sl-sm" style={{ gap: 10, alignItems: 'flex-start', cursor: 'pointer', position: 'relative' }}>
            <input type="checkbox" className="sl-file" checked={agreed} onChange={(e) => onAgree(e.target.checked)} />
            <span className={`sl-cbox ${agreed ? 'on' : ''}`} aria-hidden="true">{agreed && <Ic name="check" style={{ width: 14, height: 14, strokeWidth: 3 }} />}</span>
            <span>
              {t('open.check.termsPre')}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="sl-link">{t('open.check.termsLink')}</a>
              {t('open.check.termsPost', { fee: FEE_PERCENT })}
            </span>
          </label>

          {error && (
            <div className="sl-alert bad" role="alert">
              <Ic name="warn" />
              <div className="sl-stk sl-sm" style={{ gap: 8 }}>
                <b>{t(`open.error.${error.kind}.title`, { host, name })}</b>
                <span className="sl-dim">{t(`open.error.${error.kind}.body`)}</span>
                {error.step && <button type="button" className="sl-link" style={{ alignSelf: 'flex-start' }} onClick={() => onEdit(error.step)}>{t(`open.error.${error.kind}.action`)}</button>}
              </div>
            </div>
          )}
          {dev !== 'ph' && cta}
        </div>
      </Wrap>
    </SellScreen>
  );
}

// How long each part of the work stays on screen at least, so the checklist
// reads as a sequence rather than a flash: the work itself is real and
// usually done well before.
const TICK_MS = 650;
const LIVE_MS = 900;
const REEL_MS = 1900;

/** Counts up to `to` once, unless motion is reduced. */
function useCountUp(to, still) {
  const [n, setN] = useState(still ? to : 0);
  useEffect(() => {
    if (still) { setN(to); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1800);
      setN(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, still]);
  return n;
}

/**
 * O9 — the store being created. The checklist follows the real work (the
 * store, its look, the logo upload); the preview is a showreel of the store
 * in other looks while it waits, starting from the seller's own.
 */
export function SellCreating({ dev, host, progress, lookOn, design, lookId, colour, store, mode, still, onDone }) {
  const { t } = useTranslation('platform');
  const { t: td } = useTranslation('design');
  const items = [
    { key: 'link', done: progress.link },
    lookOn && { key: 'style', done: progress.style },
    progress.logo && { key: 'logo', done: progress.logo === 'done' || progress.logo === 'failed', failed: progress.logo === 'failed' },
  ].filter(Boolean);
  const [shown, setShown] = useState(0);
  const doneKey = items.map((i) => (i.done ? 1 : 0)).join('');
  const finished = useRef(onDone);
  useEffect(() => { finished.current = onDone; }, [onDone]);
  useEffect(() => {
    if (shown < items.length) {
      if (!items[shown].done) return undefined;
      const id = setTimeout(() => setShown((s) => s + 1), TICK_MS);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => finished.current(), LIVE_MS);
    return () => clearTimeout(id);
  // items is rebuilt each render; doneKey is what changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, doneKey, items.length]);

  // The reel: the seller's own design first, then every other look.
  const frames = useMemo(() => [
    { id: lookId, design },
    ...LOOKS.filter((l) => l.id !== lookId).map((l) => ({ id: l.id, design: normalizeDesign({ ...l.design, look: l.id }) })),
  ], [lookId, design]);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (still || !lookOn) return undefined;
    const id = setInterval(() => { if (!document.hidden) setFrame((f) => (f + 1) % frames.length); }, REEL_MS);
    return () => clearInterval(id);
  }, [still, lookOn, frames.length]);
  const f = frames[frame] || frames[0];
  const count = useCountUp(WAYS_TO_LOOK, still);
  const pct = items.length ? Math.max(8, Math.round((shown / items.length) * 100)) : 100;

  return (
    <SellScreen top={false}>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: 24 }}>
        <div className="sl-stk" style={{ gap: 10, alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: 460 }}>
          <span className="sl-lbl">{t('open.creating.label')}</span>
          <h1 className="sl-h1" style={{ overflowWrap: 'anywhere' }}>{host}</h1>
          <div className="sl-prog" style={{ width: '100%' }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('open.creating.label')}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="sl-row sl-wrap sl-sm" style={{ gap: 14, justifyContent: 'center' }} role="status">
            {items.map((it, i) => {
              const ticked = i < shown;
              const label = it.failed && ticked ? t('open.creating.logoFailed') : t(`open.creating.${it.key}`);
              return (
                <span key={it.key} className={`sl-row ${ticked ? (it.failed ? '' : 'sl-ok') : 'sl-dim'}`} style={{ gap: 6, color: ticked && it.failed ? 'var(--k-warn)' : undefined }}>
                  {ticked
                    ? <Ic name={it.failed ? 'warn' : 'check'} className="s" />
                    : i === shown ? <span className="sl-spin" aria-hidden="true" /> : <span style={{ width: 14 }} aria-hidden="true" />}
                  {label}
                </span>
              );
            })}
          </div>
        </div>
        {lookOn && (
          <div className="sl-stk" style={{ gap: 14, alignItems: 'center' }}>
            <StorePreview design={f.design} tenant={store} brand={colour} mode={mode} width={dev === 'tab' ? 220 : 200} />
            <span className="sl-xs sl-dim">{`${td(`names.${f.id}`)} · ${td(`menu.${f.design.menu}`)} · ${td(`layout.${f.design.productLayout}`)}`}</span>
            <div className="sl-stk" style={{ gap: 2, alignItems: 'center', textAlign: 'center' }}>
              <b className="sl-num" style={{ font: '700 22px/1.2 var(--k-font)', letterSpacing: '-.01em' }}>{groupDigits(count)}</b>
              <span className="sl-xs sl-dim">{t('open.creating.ways')}</span>
            </div>
          </div>
        )}
      </div>
    </SellScreen>
  );
}

// Copies text, also where the async clipboard is missing (a page served over
// plain http, the local stack among them).
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** O10 — the store is live: its link to share and what to do next in the back office. */
export function SellLive({ dev, store, url, colour, own, logoFailed, lookOn }) {
  const { t } = useTranslation('platform');
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const sub = store.subdomain;
  const office = (path) => managerUrl(`${path}?tenant=${encodeURIComponent(sub)}`);
  const host = `${sub}.esy.ge`;

  const copy = async () => {
    if (await copyText(url)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  // Instagram takes no link from the web: the phone's share sheet reaches it,
  // and elsewhere the link is copied for the profile.
  const instagram = async () => {
    if (navigator.share && window.isSecureContext) {
      try { await navigator.share({ title: store.name, url }); return; } catch { /* closed, or refused: copy instead */ }
    }
    if (await copyText(url)) setNote(t('open.live.instagramCopied'));
  };

  const wrap = dev === 'desk'
    ? { display: 'flex', gap: 72, alignItems: 'flex-start', maxWidth: 1136, margin: '0 auto', padding: '120px 48px 40px' }
    : dev === 'tab'
      ? { display: 'flex', flexDirection: 'column', gap: 36, maxWidth: 640, margin: '0 auto', padding: '130px 28px 40px' }
      : { display: 'flex', flexDirection: 'column', gap: 18, padding: 'calc(env(safe-area-inset-top, 0px) + 24px) 16px 32px' };
  const ic = dev === 'ph' ? 60 : 72;

  return (
    <SellScreen top={false}>
      <div style={wrap}>
        <div className="sl-stk" style={{ gap: dev === 'ph' ? 12 : 18, flex: dev === 'desk' ? 1 : undefined, minWidth: 0 }}>
          <span className="sl-empty-ic" style={{ width: ic, height: ic }}><Ic name="check" style={{ width: 30, height: 30, strokeWidth: 2.4 }} /></span>
          <div className="sl-stk" style={{ gap: 8 }}>
            <h1 className="sl-big">{t('open.live.title', { name: store.displayName || store.name })}</h1>
            <p className="sl-p sl-lg">{t('open.live.body')}</p>
          </div>
          {logoFailed && (
            <div className="sl-alert warn" role="status">
              <Ic name="warn" />
              <div className="sl-stk sl-sm" style={{ gap: 8 }}>
                <span>{t('open.live.logoFailed')}</span>
                <a className="sl-link" href={office('/settings/brand')}>{t('open.live.logoFailedAction')}</a>
              </div>
            </div>
          )}
          <div className="sl-card sl-pad sl-row" style={{ gap: 12 }}>
            <Avatar own={own} colour={colour} />
            <b className="sl-grow sl-num" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{host}</b>
            <button type="button" className="sl-btn s sm" onClick={copy} aria-live="polite">
              <Ic name={copied ? 'check' : 'copy'} />{copied ? t('open.live.copied') : t('open.live.copy')}
            </button>
          </div>
          <div className="sl-share" role="group" aria-label={t('open.live.share')}>
            <button type="button" onClick={instagram} aria-label={t('open.live.shareOn', { where: 'Instagram' })}>
              <span className="sl-li-ic"><Ic name="instagram" /></span><span className="sl-xs">{'Instagram'}</span>
            </button>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('open.live.shareOn', { where: 'Facebook' })}>
              <span className="sl-li-ic"><Ic name="facebook" /></span><span className="sl-xs">{'Facebook'}</span>
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('open.live.shareOn', { where: 'WhatsApp' })}>
              <span className="sl-li-ic"><Ic name="whatsapp" /></span><span className="sl-xs">{'WhatsApp'}</span>
            </a>
          </div>
          {note && <p className="sl-hint" role="status">{note}</p>}
        </div>

        <div className="sl-stk" style={{ gap: dev === 'ph' ? 10 : 12, width: dev === 'desk' ? 420 : undefined, flex: 'none' }}>
          <span className="sl-lbl">{t('open.live.nextTitle')}</span>
          <div className="sl-list">
            <a className="sl-li" href={office('/products')}>
              <span className="sl-li-ic"><Ic name="box" /></span>
              <div className="sl-grow"><b className="sl-sm">{t('open.live.product')}</b><div className="sl-xs sl-dim">{t('open.live.productSub')}</div></div>
              <Ic name="next" className="s sl-dim" />
            </a>
            <a className="sl-li" href={office('/settings/integrations')}>
              <span className="sl-li-ic"><Ic name="card" /></span>
              <div className="sl-grow"><b className="sl-sm">{t('open.live.pay')}</b><div className="sl-xs sl-dim">{t('open.live.paySub')}</div></div>
              <Ic name="next" className="s sl-dim" />
            </a>
            {lookOn && (
              <a className="sl-li" href={office('/settings/design')}>
                <span className="sl-li-ic"><Ic name="palette" /></span>
                <div className="sl-grow"><b className="sl-sm">{t('open.live.design')}</b><div className="sl-xs sl-dim">{t('open.live.designSub')}</div></div>
                <Ic name="next" className="s sl-dim" />
              </a>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: dev === 'ph' ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <a className="sl-btn p lg" href={office('/')}>{t('open.live.dashboard')}</a>
            <a className="sl-btn g lg" href={url}>{t('open.live.visit')}</a>
          </div>
        </div>
      </div>
    </SellScreen>
  );
}
