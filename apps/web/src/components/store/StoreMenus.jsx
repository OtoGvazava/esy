// The store's menu in the three styles GlowDock does not draw as a bottom bar
// (the canvas's StoreNav and StoreTop):
//   top     a row of text tabs under the store header that pins to the top
//   drawer  a menu button in the header that opens a panel from the left
//   fab     a round button in the store colour that opens the items above it
// All three draw the one list in storeChrome.js. Every colour, radius and
// floating surface is a theme token, so Soft, Liquid Glass and Neon each draw
// these their own way.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@mui/material';
import { useGlow } from '../../styles/glow';
import { useDesign } from '../../core/design/useDesign';
import { useDevice } from '../../contexts/DeviceContext';
import { useThemeMode } from '../../contexts/ThemeModeContext';
import { alpha } from '../../core/tokens';
import { Icon, langInfo } from '../glow/GlowPrimitives';
import { useStoreNav } from './storeChrome';
import { useIndicator } from '../../core/useIndicator';
import { StoreName } from './VerifiedTick';
import StoreSocials from './StoreSocials';

// Above the dock (1200) and below MUI's dialogs (1300) and the profile gate.
const Z = { strip: 1150, scrim: 1290, layer: 1295 };
// The canvas draws one scrim for every theme.
const SCRIM = 'rgba(8,8,12,.44)';
const REDUCED = '(prefers-reduced-motion: reduce)';

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

// The canvas's menu glyph: three lines, the last one short.
function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

function Badge({ n, style }) {
  const { T } = useGlow();
  return (
    <span style={{
      display: 'inline-block', minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box',
      borderRadius: 999, background: T.accent, color: T.onAccent, textAlign: 'center',
      font: `700 11px/18px ${T.font}`, ...style,
    }}>{n}</span>
  );
}

/**
 * A 44 px header control on the theme's floating surface (the canvas's
 * `ibtn float`): a link when it has `to`, otherwise a button. `plain` drops
 * the surface, for a control that already sits on one.
 */
export function HeadButton({ to, label, badge, plain = false, children, ref, style, className = 'esy-press', ...rest }) {
  const { T } = useGlow();
  const look = {
    position: 'relative', width: 44, height: 44, flex: 'none', boxSizing: 'border-box', padding: 0,
    display: 'inline-grid', placeItems: 'center', cursor: 'pointer', textDecoration: 'none',
    borderRadius: 'var(--k-r-ibtn)', color: T.text,
    ...(plain ? { background: 'transparent', border: 0 } : {
      background: 'var(--k-fl-bg)', border: 'var(--k-fl-bd)', boxShadow: 'var(--k-fl-sh)',
      backdropFilter: 'var(--k-fl-blur)', WebkitBackdropFilter: 'var(--k-fl-blur)',
    }),
    ...style,
  };
  const body = (
    <>
      {children}
      {badge ? <Badge n={badge} style={{ position: 'absolute', top: -3, right: -3, boxShadow: `0 0 0 2px ${T.bg}` }} /> : null}
    </>
  );
  return to
    ? <Link ref={ref} to={to} aria-label={label} className={className} style={look} {...rest}>{body}</Link>
    : <button ref={ref} type="button" aria-label={label} className={className} style={look} {...rest}>{body}</button>;
}

/** The store's logo, or its initial on the store colour. */
export function StoreAvatar({ size = 44, ring = false }) {
  const { T, tenant } = useGlow();
  const { theme } = useDesign();
  return (
    <span style={{
      position: 'relative', width: size, height: size, flex: 'none', overflow: 'hidden',
      // Round, as the canvas draws it; Neon squares its avatar off like its buttons.
      borderRadius: theme === 'neon' ? Math.round(size * 0.16) : '50%',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: T.grad, color: T.onAccent, font: `800 ${Math.round(size * 0.38)}px ${T.font}`,
      boxShadow: ring ? `0 0 0 3px ${T.bg}` : undefined,
    }}>
      {tenant.logoUrl
        ? <img src={tenant.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : tenant.initials}
    </span>
  );
}

// A panel over the page: focus moves in when it opens and back to `backRef`
// when it closes, Tab stays inside `boxRef`, Escape closes it, and the page
// underneath stops scrolling. `onClose` must be stable.
function useModal(open, boxRef, firstRef, backRef, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const box = boxRef.current;
    const back = backRef.current;
    firstRef.current?.focus();
    // index.css gives <html> an overflow, so the viewport scrolls by <html>'s
    // and not <body>'s: <html> is the one to hold still.
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !box) return;
      const stops = [...box.querySelectorAll('a[href], button:not([disabled])')]
        .filter((el) => !el.closest('[inert]'));
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const inside = box.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      html.style.overflow = overflow;
      // A link that navigated away may have taken the opener with it.
      if (back && back.isConnected) back.focus();
    };
  }, [open, boxRef, firstRef, backRef, onClose]);
}

// Whether the element has scrolled up past the top of the screen. The tabs pin
// themselves with this rather than `position: sticky`: they take a surface
// only once pinned, which sticky cannot tell them, and sticky engages only
// where index.css's `overflow-x: clip` is supported (its `hidden` fallback
// makes <body> a scroller that never scrolls, and sticky then sticks to it).
function usePinned(ref, enabled) {
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setPinned(entry.boundingClientRect.top < 0),
      { threshold: [0, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);
  return enabled && pinned;
}

const TABS_H = 44;

/**
 * Top tabs: shop · search · bag · orders · account as text, the current one
 * underlined in the store colour and the bag carrying its count. Under the
 * store header it holds its place and pins to the top once scrolled past;
 * `fixed` keeps it at the top of a page that has no store header.
 */
export function StoreTabs({ fixed = false }) {
  const { T } = useGlow();
  const { isMobile } = useDevice();
  const { t } = useTranslation('navbar');
  const { items } = useStoreNav();
  const holder = useRef(null);
  const row = useRef(null);
  const pinned = usePinned(holder, !fixed) || fixed;
  const gutter = isMobile ? 16 : 40;
  const current = items.find((it) => it.active)?.key;
  // The underline slides from tab to tab rather than jumping.
  const ind = useIndicator(row, current ?? null, gutter);
  const line = ind.rect;

  // Five Georgian labels do not fit a narrow phone, so the row scrolls; keep
  // the current tab in view (sideways only, never moving the page).
  useEffect(() => {
    const box = row.current;
    const tab = box?.querySelector('[aria-current="page"]');
    if (!tab) return;
    const b = box.getBoundingClientRect();
    const r = tab.getBoundingClientRect();
    if (r.right > b.right - gutter) box.scrollLeft += r.right - b.right + gutter;
    else if (r.left < b.left + gutter) box.scrollLeft -= b.left + gutter - r.left;
  }, [current, gutter]);

  const nav = (
    <nav
      aria-label={t('menu.top')}
      style={pinned ? {
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: Z.strip,
        background: 'var(--k-fl-bg)', backdropFilter: 'var(--k-fl-blur)', WebkitBackdropFilter: 'var(--k-fl-blur)',
        ...(fixed ? { viewTransitionName: 'esy-dock' } : null),
      } : { position: 'relative' }}
    >
      <div ref={row} style={{
        position: 'relative', display: 'flex', gap: 22, overflowX: 'auto', scrollbarWidth: 'none',
        padding: `0 ${gutter}px`, boxShadow: `inset 0 -1px 0 ${T.border}`,
      }}>
        <span
          aria-hidden="true" className="esy-ind" data-still={ind.still || undefined}
          style={line
            ? { width: line.w, height: 2, transform: `translate(${line.x}px, ${line.y + line.h - 2}px)`, background: T.accent, borderRadius: 2 }
            : { width: 0, height: 0, opacity: 0 }}
        />
        {items.map((it) => (
          <Link
            key={it.key} to={it.to} aria-current={it.active ? 'page' : undefined} data-ind={it.key}
            className="esy-press-soft"
            style={{
              flex: 'none', minHeight: TABS_H, minWidth: 44, boxSizing: 'border-box',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              textDecoration: 'none', whiteSpace: 'nowrap',
              color: it.active ? T.text : T.textDim, font: `${it.active ? 600 : 500} 14px ${T.font}`,
            }}
          >
            {it.label}
            {it.badge ? <Badge n={it.badge} /> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
  if (fixed) return nav;
  return <div ref={holder} style={{ position: 'relative', height: TABS_H }}>{nav}</div>;
}

function SideMenu({ id, open, onClose, backRef }) {
  const { T, dark, tenant } = useGlow();
  const { t } = useTranslation('navbar');
  const { items } = useStoreNav();
  const { mode, toggle, setMode, language, setLanguage } = useThemeMode();
  const panel = useRef(null);
  const closer = useRef(null);
  const still = useMediaQuery(REDUCED);
  useModal(open, panel, closer, backRef, onClose);

  const dur = still ? '0s' : '.28s';
  const langWell = useRef(null);
  const modeWell = useRef(null);
  const langInd = useIndicator(langWell, language);
  const modeInd = useIndicator(modeWell, mode);
  // Hidden only once the slide-out has finished, shown at once on the way in.
  const hide = `visibility 0s linear ${open ? '0s' : dur}`;
  const pickMode = (m) => {
    if (setMode) setMode(m);
    else if (m !== mode) toggle();
  };
  // The canvas's segmented control: the chosen half lifts out of the well,
  // as one thumb that slides to the half chosen.
  const segOn = dark ? `color-mix(in oklab, ${T.text} 16%, ${T.surface2})` : T.surface;
  const well = { position: 'relative', display: 'flex', gap: 4, padding: 4, margin: '0 8px', borderRadius: 'var(--k-r-btn)', background: T.surface2 };
  const thumb = (ind) => ({
    ...ind.style, borderRadius: 'calc(var(--k-r-btn) - 4px)', background: segOn,
    boxShadow: dark ? 'none' : '0 1px 4px rgba(0,0,0,.14)',
  });
  const seg = (on) => ({
    position: 'relative', zIndex: 1,
    flex: 1, minWidth: 0, minHeight: 44, padding: '0 10px', border: 0, cursor: 'pointer',
    borderRadius: 'calc(var(--k-r-btn) - 4px)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: 'transparent', color: on ? T.text : T.textDim,
    font: `${on ? 600 : 500} 14px ${T.font}`, whiteSpace: 'nowrap', transition: 'color var(--m-base) ease',
  });

  return (
    <>
      <div
        aria-hidden="true" onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: Z.scrim, background: SCRIM,
          opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
          transition: `opacity ${dur} ease, ${hide}`,
        }}
      />
      <div
        ref={panel} id={id} role="dialog" aria-modal="true" aria-label={t('menu.drawer')} inert={!open}
        style={{
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: Z.layer,
          width: '82%', maxWidth: 360, boxSizing: 'border-box', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 4, padding: '18px 14px 20px',
          background: T.surface, border: 'var(--k-fl-bd)', borderLeft: 0,
          borderRadius: '0 var(--k-r-sheet) var(--k-r-sheet) 0',
          boxShadow: '24px 0 60px -24px rgba(0,0,0,.4)',
          transform: open ? 'none' : 'translateX(-105%)', visibility: open ? 'visible' : 'hidden',
          transition: `transform ${dur} cubic-bezier(.2,.8,.2,1), ${hide}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 14px 8px' }}>
          <StoreAvatar size={44} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <StoreName name={tenant.name} style={{ font: `700 16px/1.2 ${T.font}`, color: T.text }} />
            <span style={{ font: `500 12px ${T.font}`, color: T.textMute, ...ellipsis }}>{tenant.domain}</span>
          </div>
          <button
            ref={closer} type="button" aria-label={t('menu.close')} onClick={onClose}
            style={{
              width: 44, height: 44, flex: 'none', padding: 0, border: 0, cursor: 'pointer',
              borderRadius: 'var(--k-r-ibtn)', background: T.surface2, color: T.text,
              display: 'inline-grid', placeItems: 'center',
            }}
          ><Icon.close /></button>
        </div>

        <nav aria-label={t('menu.drawer')} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((it) => (
            <Link
              key={it.key} to={it.to} onClick={onClose} aria-current={it.active ? 'page' : undefined}
              className="esy-press-soft"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 46, padding: '0 12px',
                borderRadius: 'var(--k-r-in)', textDecoration: 'none', color: T.text,
                background: it.active ? T.surface2 : 'transparent',
                font: `${it.active ? 600 : 500} 15px ${T.font}`,
              }}
            >
              <it.Icon width={20} height={20} />
              <span style={{ flex: 1, minWidth: 0, ...ellipsis }}>{it.label}</span>
              {it.badge ? <Badge n={it.badge} /> : null}
            </Link>
          ))}
        </nav>

        <div style={{ height: 1, background: T.border, margin: '10px 8px', flex: 'none' }} />

        {/* The language and light/dark controls the phone header carries,
            here because the side menu's header has search and the bag. */}
        <div ref={langWell} role="group" aria-label={t('menu.language')} style={well}>
          <span aria-hidden="true" className="esy-ind" data-still={langInd.still || undefined} style={thumb(langInd)} />
          {['ka', 'en'].map((code) => (
            <button
              key={code} type="button" lang={code} aria-pressed={language === code} data-ind={code}
              onClick={() => setLanguage(code)} style={seg(language === code)}
            >{langInfo(code).native}</button>
          ))}
        </div>
        <div ref={modeWell} role="group" aria-label={t('menu.appearance')} style={{ ...well, marginTop: 8 }}>
          <span aria-hidden="true" className="esy-ind" data-still={modeInd.still || undefined} style={thumb(modeInd)} />
          {[
            { m: 'light', Glyph: Icon.sun, label: t('menu.light') },
            { m: 'dark', Glyph: Icon.moon, label: t('menu.dark') },
          ].map((o) => (
            <button
              key={o.m} type="button" aria-pressed={mode === o.m} data-ind={o.m}
              onClick={() => pickMode(o.m)} style={seg(mode === o.m)}
            ><o.Glyph width={16} height={16} />{o.label}</button>
          ))}
        </div>
        {/* The store's social buttons, as the canvas closes the menu with them. */}
        <StoreSocials style={{ margin: '16px 8px 0' }} />
      </div>
    </>
  );
}

/** The side menu: its button, and the panel it opens from the left. */
export function MenuButton({ plain = false }) {
  const { t } = useTranslation('navbar');
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const button = useRef(null);
  const id = useId();
  // A page change (a menu link, or the browser's back) closes it.
  useEffect(() => { setOpen(false); }, [pathname]);
  return (
    <>
      <HeadButton
        ref={button} plain={plain} label={t('menu.open')} onClick={() => setOpen(true)}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      ><MenuGlyph /></HeadButton>
      {createPortal(<SideMenu id={id} open={open} onClose={close} backRef={button} />, document.body)}
    </>
  );
}

/**
 * The action button: round, in the store colour, at the bottom right, with the
 * bag's count on it. It opens the items as pills stacked above it.
 */
export function ActionButton() {
  const { T } = useGlow();
  const { isMobile } = useDevice();
  const { t } = useTranslation('navbar');
  const { items, count } = useStoreNav();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const box = useRef(null);
  const fab = useRef(null);
  const first = useRef(null);
  const id = useId();
  const still = useMediaQuery(REDUCED);
  useModal(open, box, first, fab, close);
  useEffect(() => { setOpen(false); }, [pathname]);

  const ms = still ? 0 : 180;
  const label = open ? t('menu.close') : count ? t('menu.openCount', { count }) : t('menu.open');
  return (
    <>
      <div
        aria-hidden="true" onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: Z.scrim, background: SCRIM,
          opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
          transition: `opacity ${ms}ms ease, visibility 0s linear ${open ? 0 : ms}ms`,
        }}
      />
      <div ref={box} style={{ position: 'fixed', right: isMobile ? 16 : 24, bottom: 18, zIndex: Z.layer, width: 60, height: 60 }}>
        <nav
          id={id} aria-label={t('menu.fab')} inert={!open}
          style={{
            position: 'absolute', right: 0, bottom: 68, display: 'flex', flexDirection: 'column',
            alignItems: 'flex-end', gap: 8, visibility: open ? 'visible' : 'hidden',
            transition: `visibility 0s linear ${open ? 0 : ms + 120}ms`,
          }}
        >
          {items.map((it, i) => {
            // The pill nearest the button comes first, the rest follow upward.
            const delay = open && !still ? (items.length - 1 - i) * 30 : 0;
            return (
              <Link
                key={it.key} ref={i === 0 ? first : undefined} to={it.to} onClick={close}
                aria-current={it.active ? 'page' : undefined}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 16px',
                  boxSizing: 'border-box', borderRadius: 'var(--k-r-pill)', textDecoration: 'none', whiteSpace: 'nowrap',
                  background: it.active ? 'var(--k-pill-on)' : T.surface,
                  color: it.active ? 'var(--k-pill-on-fg)' : T.text,
                  border: `1px solid ${it.active ? 'transparent' : T.border}`, boxShadow: 'var(--k-fl-sh)',
                  font: `${it.active ? 600 : 500} 14px ${T.font}`,
                  opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(8px)',
                  transition: `opacity ${ms}ms ease ${delay}ms, transform ${ms}ms ease ${delay}ms`,
                }}
              >
                <it.Icon width={16} height={16} />
                {it.label}
                {it.badge ? <Badge n={it.badge} /> : null}
              </Link>
            );
          })}
        </nav>
        <button
          ref={fab} type="button" aria-label={label} aria-expanded={open} aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="esy-press"
          style={{
            position: 'relative', width: 60, height: 60, padding: 0, border: 0, cursor: 'pointer',
            borderRadius: 'var(--k-r-ibtn)', display: 'grid', placeItems: 'center',
            background: T.accent, color: T.onAccent,
            boxShadow: `0 14px 30px -10px ${alpha(T.accent, 0.7)}`,
          }}
        >
          {open ? <Icon.close width={22} height={22} /> : <MenuGlyph />}
          {!open && count > 0 && (
            // The button is the store colour, so its count is drawn in ink.
            <Badge n={count} style={{
              position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, lineHeight: '20px',
              background: T.text, color: T.bg, boxShadow: `0 0 0 2px ${T.bg}`,
            }} />
          )}
        </button>
      </div>
    </>
  );
}

const STRIP_H = { top: TABS_H, drawer: 60 };

/**
 * Top tabs or the side menu's button on a page without the store header (every
 * page but home), pinned to the top. The page is pushed down by the strip's
 * height so nothing starts under it.
 */
export function MenuStrip({ kind }) {
  const { T, tenant } = useGlow();
  const { isMobile } = useDevice();
  const { t } = useTranslation('navbar');
  const { count } = useStoreNav();
  const height = STRIP_H[kind] ?? TABS_H;
  useLayoutEffect(() => {
    const body = document.body.style;
    const before = body.paddingTop;
    body.paddingTop = `${height}px`;
    return () => {
      body.paddingTop = before;
    };
  }, [height]);

  if (kind === 'top') return <StoreTabs fixed />;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: Z.strip, height, boxSizing: 'border-box',
      viewTransitionName: 'esy-dock',
      display: 'flex', alignItems: 'center', gap: 6, padding: `0 ${isMobile ? 8 : 32}px`,
      background: 'var(--k-fl-bg)', backdropFilter: 'var(--k-fl-blur)', WebkitBackdropFilter: 'var(--k-fl-blur)',
      boxShadow: `inset 0 -1px 0 ${T.border}`,
    }}>
      <MenuButton plain />
      <Link to="/" style={{
        flex: 1, minWidth: 0, minHeight: 44, display: 'flex', alignItems: 'center', gap: 10,
        textDecoration: 'none', color: T.text,
      }}>
        <StoreAvatar size={30} />
        <StoreName name={tenant.name} size={15} style={{ font: `700 15px ${T.font}`, letterSpacing: '-0.01em' }} />
      </Link>
      <HeadButton plain to="/search" label={t('dock.search')}><Icon.search /></HeadButton>
      <HeadButton plain to="/cart" label={count ? t('menu.bagCount', { count }) : t('dock.bag')} badge={count}><Icon.bag /></HeadButton>
    </div>
  );
}
