// The theme's segmented control (the kit's .seg): the chosen option lifts out
// of the well; Neon lights it instead. Display settings draws its choices with
// it, and the product view switch beside the sort control.
//
// The lifted part is one thumb that slides to the option chosen (`thumb`, on
// a .esy-ind inside the well, placed by core/useIndicator.js), rather than
// each option lighting on its own: the options themselves stay transparent.
import { useGlow } from '../../styles/glow';
import { useDesign } from '../../core/design/useDesign';

export function useSegLook() {
  const { T, dark } = useGlow();
  const { theme } = useDesign();
  const neon = theme === 'neon';
  return {
    well: { position: 'relative', display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--k-r-btn)', background: T.surface2 },
    thumb: {
      borderRadius: 'calc(var(--k-r-btn) - 4px)',
      background: neon ? 'var(--k-neon)' : dark ? (theme === 'glow' ? '#3a3a3e' : `color-mix(in oklab, ${T.text} 16%, ${T.surface2})`) : T.surface,
      boxShadow: neon ? '0 0 22px -4px var(--k-neon)'
        : dark ? `0 0 0 1px color-mix(in oklab, ${T.text} 18%, transparent)` : '0 1px 4px rgba(0,0,0,.14)',
    },
    button: (on) => ({
      position: 'relative', zIndex: 1,
      flex: 1, minWidth: 0, minHeight: 40, padding: neon ? '0 8px' : '0 10px', border: 0, cursor: 'pointer',
      borderRadius: 'calc(var(--k-r-btn) - 4px)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      font: `${on ? 600 : 500} 13.5px ${neon ? 'var(--k-font-m)' : T.font}`, whiteSpace: 'nowrap',
      color: on ? (neon ? 'var(--k-on-neon)' : T.text) : T.textDim,
      background: 'transparent',
    }),
  };
}
