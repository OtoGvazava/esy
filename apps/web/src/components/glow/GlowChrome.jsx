/* eslint-disable react-refresh/only-export-components */
// Shared Glow page chrome — adapts the prototype's absolute-positioned
// ScreenShell/TopNav/StickyCTA to a normal scrolling page above the fixed dock.
import { Icon } from './GlowPrimitives';
import { alpha } from '../../core/tokens';
import { useBottomClearance } from '../../core/design/useDesign';
import { markerStyle, useStuck } from '../../core/useStuck';

// Platform currency is GEL (₾) for every store.
//
// Re-exported from core/money rather than defined here: this module used to
// render the symbol as a PREFIX (₾199.99) while the design, the manager screens
// and the admin screens all put it after the amount (199.99 ₾), so the same
// price read differently depending on which screen you were on. core/money is
// the design's own formatter — it also drops a whole number's ".00" and returns
// an em-dash for a missing amount instead of a confident ₾0.
export { money } from '../../core/money';

export function GlowScreen({ T, children, padBottom = 120 }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.page, color: T.text, font: `400 14px ${T.font}`, paddingBottom: padBottom }}>
      {children}
    </div>
  );
}

export function GlowTopNav({ T, title, onBack, right }) {
  const [marker, stuck] = useStuck();
  // A tab's own screen (bag, orders, account) has no back button: the tab bar
  // is the way back, so it takes the design's large title instead (E3, C1).
  if (!onBack) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 16px 8px', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ flex: 1, minWidth: 0, margin: 0, font: `700 28px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{title}</h1>
        {right}
      </div>
    );
  }
  // The way back stays at the top while the page scrolls under it.
  return (
    <>
    <div ref={marker} aria-hidden="true" style={markerStyle} />
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: stuck ? T.bg : 'transparent', boxShadow: stuck ? `0 1px 0 ${T.border}` : 'none',
      transition: 'background-color .18s ease, box-shadow .18s ease',
    }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 8px', maxWidth: 1100, margin: '0 auto' }}>
      <button
        onClick={onBack}
        className="esy-press"
        aria-label="back"
        style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon.arrowR style={{ transform: 'rotate(180deg)' }} />
      </button>
      <div style={{ font: `600 14.5px ${T.font}`, color: T.text, letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text }}>{right}</div>
    </div>
    </div>
    </>
  );
}

// Fixed action bar that sits just above the global dock.
export function GlowStickyCTA({ T, label, sub, onClick, disabled }) {
  const bottom = useBottomClearance();
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom, padding: '14px 16px', background: T.bg, borderTop: `1px solid ${T.border}`, zIndex: 1100 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <button
          onClick={onClick}
          disabled={disabled}
          style={{
            width: '100%', height: 54, borderRadius: 16, border: 'none',
            background: disabled ? T.surface2 : T.grad, color: disabled ? T.textMute : T.onAccent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            font: `700 14.5px ${T.font}`, letterSpacing: '-0.01em',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: disabled ? 'none' : `0 10px 28px ${alpha(T.accent, 0.33)}`,
          }}
        >
          <span>{label}</span>
          {sub && <span style={{ opacity: 0.75, font: `500 13px ${T.font}` }}>· {sub}</span>}
          <Icon.arrowR />
        </button>
      </div>
    </div>
  );
}
