// The product view, switched where the products are (home grid, collection),
// beside the sort control. It is the same per-store choice Display settings
// keeps (DisplayPrefsContext), so either screen changes the other.
//
// Picking the owner's own layout clears the choice, so the store's layout is
// followed again if the owner changes it later. An owner layout the shopper
// cannot pick (the feed) shows as a "Store default" option.
//
// Every device draws all the views, a phone too (A1, A3): one tap, and the
// chosen one is always in sight.
/* eslint-disable react-refresh/only-export-components */
import { useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TenantContext } from '../../contexts/TenantContext';
import { useDisplayPrefs } from '../../contexts/DisplayPrefsContext';
import { normalizeDesign } from '../../core/design/normalize';
import { VIEWS } from '../../core/display/prefs';
import { useSegLook } from '../glow/useSegLook';
import { Glyph } from './CollectionFilters';

// The design's view glyphs (D3), shared with Display settings.
export const VIEW_PATHS = {
  store: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5" />,
  grid2: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  grid3: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="9.5" r="1.6" /><path d="m4 17 5-4.5 4 3.5 2.5-2 4.5 4" /></>,
  list: <><rect x="4" y="5" width="5" height="5" rx="1.2" /><rect x="4" y="14" width="5" height="5" rx="1.2" /><path d="M12 7.5h8M12 16.5h8" /></>,
};

export default function ViewSwitch() {
  const { t } = useTranslation('display');
  const { tenant } = useContext(TenantContext);
  const display = useDisplayPrefs();
  const refs = useRef([]);
  const look = useSegLook();
  // Storefronts only: the back office's preview draws the owner's design.
  if (!display?.store) return null;

  const owner = normalizeDesign(tenant?.design).productLayout;
  const options = VIEWS.includes(owner) ? VIEWS : ['store', ...VIEWS];
  const current = display.view || (VIEWS.includes(owner) ? owner : 'store');
  const at = Math.max(0, options.indexOf(current));
  const pick = (v) => display.setView(v === 'store' || v === owner ? null : v);
  const name = (v) => t(`view.${v}`);

  // A radio group, as on Display settings: Tab stops on the chosen view, the arrows move it.
  const onKey = (e, i) => {
    const n = options.length;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const j = (i + step + n) % n;
    pick(options[j]);
    refs.current[j]?.focus();
  };

  // The kit's .seg at the sort pill's height, round ends, icons only (A1, A3).
  return (
    <div
      role="radiogroup" aria-label={t('view.label')}
      style={{ ...look.well, flex: 'none', gap: 2, height: 40, boxSizing: 'border-box', borderRadius: 'var(--k-r-pill)' }}
    >
      {options.map((v, i) => {
        const on = i === at;
        return (
          <button
            key={v} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on}
            aria-label={name(v)} title={name(v)} tabIndex={on ? 0 : -1}
            onClick={() => pick(v)} onKeyDown={(e) => onKey(e, i)}
            style={{ ...look.button(on), flex: 'none', width: 36, minHeight: 0, height: 32, padding: 0, borderRadius: 'var(--k-r-pill)' }}
          >
            <Glyph size={16}>{VIEW_PATHS[v]}</Glyph>
          </button>
        );
      })}
    </div>
  );
}
