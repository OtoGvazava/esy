// A look's thumbnail (the design canvas's Mini): a schematic storefront drawn
// with the look's own theme tokens, so a seller can compare looks before the
// store has a single product. The root carries data-th and data-md, and the
// look's style options (core/design/scope.js), so the thumbnail shows its
// theme, corners and page ground whatever theme the page around it uses.
//
// Given a `name`, it is the seller's own store, as quick setup draws it: the
// name and initials (or the chosen logo) in place of the placeholder bars.
import '../../styles/mini.css';
import { scopeAttrs } from '../../core/design/scope';

// The kit's product shapes (esy-kit.css, assets/*.svg), one per tile as the
// canvas Mini draws them, in the theme's photo-foreground colour.
const SHAPES = {
  mug: <><path d="M18 30h48v40c0 10-8 16-18 16H36c-10 0-18-6-18-16z" /><path d="M66 40h6c8 0 12 5 12 12s-4 12-12 12h-6" fill="none" stroke="currentColor" strokeWidth="7" /></>,
  vase: <path d="M40 12h20v8c0 6 14 12 14 34 0 22-10 34-24 34S26 76 26 54c0-22 14-28 14-34z" />,
  bowl: <><path d="M10 42h80c0 23-17 40-40 40S10 65 10 42z" /><rect x="37" y="82" width="26" height="6" rx="2" /></>,
  cloth: <><rect x="18" y="22" width="64" height="15" /><rect x="18" y="40" width="64" height="15" /><rect x="18" y="58" width="64" height="20" /></>,
  plate: <path fillRule="evenodd" d="M50 34c24 0 42 9 42 20s-18 20-42 20S8 65 8 54s18-20 42-20zm0 8c-16 0-28 5-28 12s12 12 28 12 28-5 28-12-12-12-28-12z" />,
};
const TILES = [['t1', 'mug'], ['t2', 'vase'], ['t3', 'bowl'], ['t4', 'cloth'], ['t2', 'plate'], ['t1', 'vase']];

export default function LookThumb({ design, brand, mode = 'light', scale = 1, name, initials, logo }) {
  const d = design;
  const scope = scopeAttrs(d, mode);
  const own = !!name;
  return (
    <div aria-hidden="true" style={{ width: 200 * scale, height: 412 * scale, flex: 'none' }}>
      <div
        {...scope}
        className={`mini ${scope.className} l-${d.productLayout} n-${d.menu}`}
        style={{ '--k-brand': brand, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: '0 0' }}
      >
        {d.header === 'cover' && <div className="m-cover" />}
        <div className="m-top">
          <span className="m-burger" />
          <span className={own ? 'm-av m-own' : 'm-av'}>
            {own && (logo ? <img src={logo} alt="" /> : initials)}
          </span>
          <div>{own ? <div className="m-name">{name}</div> : <div className="m-l1" />}<div className="m-l2" /></div>
        </div>
        <div className="m-tabs"><i /><i /><i /></div>
        {d.show.stories && <div className="m-rings"><i /><i /><i /><i /><i /></div>}
        {d.header !== 'cover' && <div className="m-hero" />}
        <div className="m-pills"><i className="on" /><i /><i /><i /></div>
        <div className="m-grid">
          {TILES.map(([tile, shape], i) => (
            <div key={i} className="m-row">
              <div className={`m-ph ${tile}`}><svg className="m-shape" viewBox="0 0 100 100">{SHAPES[shape]}</svg></div>
              <i />
            </div>
          ))}
        </div>
        <div className="m-dock" />
        <div className="m-fab" />
      </div>
    </div>
  );
}
