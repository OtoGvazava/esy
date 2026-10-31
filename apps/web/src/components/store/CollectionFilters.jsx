// The pieces of a collection page's filters (the design's A3): the pill, the
// removable chip, the sort menu, the price range, the in-stock box, the option
// pills, and the sheet that carries the filters on a phone or tablet. Every
// colour, radius and floating surface is a theme token, so Soft, Liquid Glass
// and Neon each draw them their own way; copy arrives from the caller's t().
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { alpha } from '../../core/tokens';
import { money } from '../../core/money';

// The design's glyphs (A3), drawn at the theme's stroke weight.
export const PATHS = {
  filter: 'M4 6h16M7 12h10M10 18h4',
  sort: 'M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  back: 'M15 5 8 12l7 7',
};

export function Glyph({ size = 20, weight, children }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: 'none', strokeWidth: weight || 'var(--k-ic-w, 1.8)' }}
    >
      {children}
    </svg>
  );
}

// Above the dock (1200) and level with the store's own menus (StoreMenus.jsx).
const Z = { scrim: 1290, layer: 1295 };
const SCRIM = 'rgba(8,8,12,.44)';

/**
 * The design's pill (`.pill`, `.pill.on`), at a touch-safe 40 px. A pill on a
 * card or sheet rather than the page takes the surface's second tone, as the
 * design's search dropdown does: Liquid Glass's frosted pill is invisible on
 * white.
 */
export function pillStyle(T, on, onSurface = false) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px',
    boxSizing: 'border-box', borderRadius: 'var(--k-r-pill)', flex: 'none', cursor: 'pointer',
    background: on ? 'var(--k-pill-on)' : onSurface ? T.surface2 : 'var(--k-pill-bg)',
    border: on || onSurface ? '1px solid transparent' : 'var(--k-pill-bd)',
    color: on ? 'var(--k-pill-on-fg)' : T.text,
    font: `${on ? 600 : 500} 13.5px ${T.font}`, whiteSpace: 'nowrap', textDecoration: 'none',
  };
}

/** A filter section's heading (the design's `.h3`). */
export function SectionTitle({ T, children, id }) {
  return (
    <div id={id} style={{ font: '600 16px/1.3 var(--k-font-d)', color: T.text }}>{children}</div>
  );
}

/**
 * One active filter as a removable chip (`.chip.nd.c-proc`). The chip is drawn
 * at the design's 28 px; the button around it is 40 px tall so the × is a
 * thumb's target on a phone.
 */
export function FilterChip({ T, label, aria, onRemove }) {
  return (
    <button
      type="button" aria-label={aria} title={aria} onClick={onRemove}
      style={{
        height: 40, padding: 0, border: 0, background: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', flex: 'none',
      }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px 0 11px',
        borderRadius: 'var(--k-r-pill)', background: T.surface2, color: T.text,
        font: `600 12px ${T.font}`, whiteSpace: 'nowrap',
      }}>
        {label}
        <Glyph size={14}><path d={PATHS.x} /></Glyph>
      </span>
    </button>
  );
}

/** A quiet text action in the accent colour (`.link.sm`), with a 40 px target. */
export function LinkButton({ T, onClick, children, style }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        minHeight: 40, padding: '0 4px', border: 0, background: 'none', cursor: 'pointer',
        color: T.accentFg, font: `600 12.5px ${T.font}`, whiteSpace: 'nowrap', ...style,
      }}
    >{children}</button>
  );
}

/**
 * The sort pill and the menu it opens. `options` is [{ id, label }]; the pill
 * reads "Sort: <current>" through `pillLabel`.
 */
export function SortMenu({ T, value, options, pillLabel, menuLabel, onChange, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const button = useRef(null);
  const id = useId();
  const current = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const key = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    box.current?.querySelector('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  // Up and down walk the items, as in any menu.
  const walk = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...box.current.querySelectorAll('[role="menuitemradio"]')];
    const at = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div ref={box} style={{ position: 'relative', flex: 'none' }}>
      <button
        ref={button} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((v) => !v)} style={pillStyle(T, false)}
      >
        <Glyph size={16}><path d={PATHS.sort} /></Glyph>
        {pillLabel(current.label)}
      </button>
      {open && (
        <div
          id={id} role="menu" aria-label={menuLabel} onKeyDown={walk}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, zIndex: 60,
            minWidth: 220, maxWidth: 'calc(100vw - 32px)', padding: 6, boxSizing: 'border-box',
            borderRadius: 'var(--k-r-in)', background: T.surface, border: `1px solid ${T.border}`,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {options.map((o) => {
            const on = o.id === current.id;
            return (
              <button
                key={o.id} type="button" role="menuitemradio" aria-checked={on}
                onClick={() => { setOpen(false); onChange(o.id); button.current?.focus(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 12px',
                  border: 0, borderRadius: 'calc(var(--k-r-in) - 4px)', cursor: 'pointer', textAlign: 'left',
                  background: on ? T.surface2 : 'transparent', color: T.text,
                  font: `${on ? 600 : 500} 14px ${T.font}`, whiteSpace: 'nowrap',
                }}
              >
                <span style={{ flex: 1 }}>{o.label}</span>
                <span style={{ width: 18, display: 'inline-flex', color: T.accentFg }}>
                  {on && <Glyph size={18}><path d={PATHS.check} /></Glyph>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The design's checkbox row (`.cbox`), on a real, focusable checkbox. */
export function CheckRow({ T, on, onChange, label }) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 10, minHeight: 40,
      cursor: 'pointer', font: `400 14px ${T.font}`, color: T.text,
    }}>
      <input
        type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, margin: 0 }}
      />
      <span aria-hidden="true" style={{
        width: 22, height: 22, flex: 'none', boxSizing: 'border-box', borderRadius: 6,
        display: 'grid', placeItems: 'center', color: T.onAccent,
        border: `2px solid ${on ? T.accent : T.border}`, background: on ? T.accent : 'transparent',
        boxShadow: focus ? `0 0 0 3px ${alpha(T.accent, 0.35)}` : 'none',
      }}>
        {on && <Glyph size={16} weight={3}><path d={PATHS.check} /></Glyph>}
      </span>
      {label}
    </label>
  );
}

// The lari sign is the same in every language the platform speaks.
const LARI = '₾';

const toNumber = (s) => {
  const n = Number(String(s ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
  return String(s ?? '').trim() === '' || !Number.isFinite(n) ? null : n;
};

/**
 * The price filter: two fields and, when the collection's prices span a range,
 * a two-thumb slider over it. Nothing is committed while a thumb moves or a
 * field is being typed in — a drag would otherwise leave a history entry per
 * pixel — only when the thumb is let go, a field loses focus, or the arrow
 * keys have rested for a moment (a run of presses is one choice, so it is one
 * history entry). A bound left at the collection's own edge is no bound at all.
 */
export function PriceFilter({ T, bounds, min, max, labels, onCommit }) {
  const lo = bounds ? Math.floor(bounds.lo) : 0;
  const hi = bounds ? Math.ceil(bounds.hi) : 0;
  const ranged = !!bounds && hi > lo;
  const [a, setA] = useState(min);
  const [b, setB] = useState(max);
  const [textA, setTextA] = useState(min == null ? '' : String(min));
  const [textB, setTextB] = useState(max == null ? '' : String(max));
  const track = useRef(null);
  const drag = useRef(null);
  // The pair as it is right now, for handlers that run before a re-render.
  const pair = useRef({ a: min, b: max });
  const keyTimer = useRef(null);
  // The field being typed in, which an update from the URL must not overwrite.
  const editing = useRef(null);

  // The URL is the truth: back, forward and a chip's × all arrive through it.
  useEffect(() => {
    pair.current = { a: min, b: max };
    setA(min);
    setB(max);
    if (editing.current !== 'a') setTextA(min == null ? '' : String(min));
    if (editing.current !== 'b') setTextB(max == null ? '' : String(max));
  }, [min, max]);

  useEffect(() => () => clearTimeout(keyTimer.current), []);

  const commit = (nextA, nextB) => {
    clearTimeout(keyTimer.current);
    keyTimer.current = null;
    let x = nextA;
    let y = nextB;
    if (x != null && y != null && x > y) [x, y] = [y, x];
    if (ranged) {
      if (x != null && x <= lo) x = null;
      if (y != null && y >= hi) y = null;
    }
    // Show what was kept, even when it changes nothing and the URL stays put.
    pair.current = { a: x, b: y };
    setA(x);
    setB(y);
    setTextA(x == null ? '' : String(x));
    setTextB(y == null ? '' : String(y));
    onCommit(x, y);
  };
  const commitSoon = () => {
    clearTimeout(keyTimer.current);
    keyTimer.current = setTimeout(() => commit(pair.current.a, pair.current.b), 450);
  };

  const shownA = a == null ? lo : a;
  const shownB = b == null ? hi : b;
  const pct = (v) => (ranged ? ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100 : 0);

  const valueAt = (clientX) => {
    const r = track.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    return Math.round(lo + ratio * (hi - lo));
  };
  // Moves one thumb, never past the other, and says where the pair now stands.
  const place = (which, v) => {
    const now = pair.current;
    if (which === 'a') {
      const next = Math.min(v, now.b == null ? hi : now.b);
      pair.current = { ...now, a: next };
      setA(next);
      setTextA(String(next));
    } else {
      const next = Math.max(v, now.a == null ? lo : now.a);
      pair.current = { ...now, b: next };
      setB(next);
      setTextB(String(next));
    }
    return pair.current;
  };

  const thumb = (which) => {
    const value = which === 'a' ? shownA : shownB;
    const step = Math.max(1, Math.round((hi - lo) / 10));
    return (
      <span
        role="slider" tabIndex={0}
        aria-label={which === 'a' ? labels.minSlider : labels.maxSlider}
        aria-valuemin={lo} aria-valuemax={hi} aria-valuenow={value} aria-valuetext={money(value)}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.focus();
          drag.current = which;
        }}
        onPointerMove={(e) => {
          if (drag.current !== which) return;
          place(which, valueAt(e.clientX));
        }}
        onPointerUp={(e) => {
          if (drag.current !== which) return;
          drag.current = null;
          const now = place(which, valueAt(e.clientX));
          commit(now.a, now.b);
        }}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={(e) => {
          const moves = {
            ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -step, PageUp: step,
          };
          const current = which === 'a' ? (pair.current.a ?? lo) : (pair.current.b ?? hi);
          let v = null;
          if (e.key in moves) v = current + moves[e.key];
          else if (e.key === 'Home') v = lo;
          else if (e.key === 'End') v = hi;
          if (v == null) return;
          e.preventDefault();
          place(which, Math.min(Math.max(v, lo), hi));
          commitSoon();
        }}
        // Leaving the thumb settles a pending keyboard choice at once.
        onBlur={() => { if (keyTimer.current) commit(pair.current.a, pair.current.b); }}
        style={{
          position: 'absolute', top: -11, left: `${pct(value)}%`, width: 44, height: 44, marginLeft: -22,
          display: 'grid', placeItems: 'center', cursor: 'grab', touchAction: 'none', outline: 'none',
          zIndex: which === 'a' && shownA >= hi ? 2 : 1,
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: 'var(--k-r-ibtn)', background: T.surface,
          boxShadow: `0 0 0 2px ${T.accent}, 0 2px 6px rgba(0,0,0,.22)`,
        }} />
      </span>
    );
  };

  const field = (which, text, setText, label, onDone, placeholder) => (
    <label style={{
      flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', height: 42, boxSizing: 'border-box',
      borderRadius: 'var(--k-r-in)', border: '1.5px solid var(--k-in-bd)', background: 'var(--k-in-bg)',
      color: T.textDim, overflow: 'hidden',
    }}>
      <input
        inputMode="decimal" aria-label={label} value={text} placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => { editing.current = which; }}
        onBlur={() => { editing.current = null; onDone(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{
          flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none', background: 'transparent',
          padding: '0 4px 0 13px', color: T.text, font: `500 15px ${T.font}`,
        }}
      />
      <span style={{ padding: '0 12px 0 2px', font: `500 14px ${T.font}` }}>{LARI}</span>
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {field('a', textA, setTextA, labels.min, () => commit(toNumber(textA), pair.current.b), ranged ? String(lo) : '')}
        <span aria-hidden="true" style={{ color: T.textDim }}>–</span>
        {field('b', textB, setTextB, labels.max, () => commit(pair.current.a, toNumber(textB)), ranged ? String(hi) : '')}
      </div>
      {ranged && (
        <div style={{ position: 'relative', height: 22, margin: '4px 11px 0' }}>
          <div ref={track} style={{ position: 'absolute', left: 0, right: 0, top: 8, height: 6, borderRadius: 3, background: T.surface2 }}>
            <i style={{
              position: 'absolute', top: 0, bottom: 0, borderRadius: 3, background: T.accent,
              left: `${pct(shownA)}%`, width: `${Math.max(pct(shownB) - pct(shownA), 0)}%`,
            }} />
          </div>
          {thumb('a')}
          {thumb('b')}
        </div>
      )}
    </div>
  );
}

/** One variant axis as a row of pills, each value a toggle. */
export function OptionPills({ T, name, values, chosen, onToggle, onSurface = false }) {
  const id = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SectionTitle T={T} id={id}>{name}</SectionTitle>
      <div role="group" aria-labelledby={id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {values.map((v) => {
          const on = chosen.some((c) => c.toLowerCase() === v.toLowerCase());
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => onToggle(v)} style={pillStyle(T, on, onSurface)}>
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The sheet a phone or tablet opens the filters in (`.sheet`): over the page
 * and the menu, with the page held still underneath. Focus moves in when it
 * opens and back to the opener when it closes, Tab stays inside, and Escape
 * or a tap on the scrim closes it.
 */
export function FilterSheet({ T, open, onClose, title, closeLabel, footer, backRef, children }) {
  const panel = useRef(null);
  const closer = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const back = backRef?.current;
    closer.current?.focus();
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const stops = [...panel.current.querySelectorAll('a[href], button:not([disabled]), input, [tabindex="0"]')];
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      html.style.overflow = overflow;
      if (back && back.isConnected) back.focus();
    };
  }, [open, onClose, backRef]);

  if (!open) return null;
  return createPortal(
    <>
      <div aria-hidden="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: Z.scrim, background: SCRIM }} />
      <section
        ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: Z.layer, maxHeight: '88vh',
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
          borderRadius: 'var(--k-r-sheet) var(--k-r-sheet) 0 0', background: T.surface,
          border: 'var(--k-fl-bd)', borderBottom: 0, boxShadow: '0 -14px 40px -10px rgba(0,0,0,.28)',
          color: T.text, font: `400 14px ${T.font}`,
        }}
      >
        <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span aria-hidden="true" style={{ width: 42, height: 5, borderRadius: 3, background: T.border, alignSelf: 'center' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h2 id={titleId} style={{ margin: 0, font: 'var(--k-w-t) 20px/1.22 var(--k-font-d)', color: T.text }}>{title}</h2>
            <button
              ref={closer} type="button" aria-label={closeLabel} onClick={onClose}
              style={{
                width: 44, height: 44, flex: 'none', padding: 0, border: 0, cursor: 'pointer',
                borderRadius: 'var(--k-r-ibtn)', background: T.surface2, color: T.text,
                display: 'grid', placeItems: 'center',
              }}
            ><Glyph><path d={PATHS.x} /></Glyph></button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: '12px 16px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
            {footer}
          </div>
        )}
      </section>
    </>,
    document.body,
  );
}
