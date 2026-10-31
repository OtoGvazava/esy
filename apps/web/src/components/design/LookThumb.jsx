// A look's thumbnail (the design canvas's Mini): a schematic storefront drawn
// with the look's own theme tokens, so a seller can compare looks before the
// store has a single product. The root carries data-th and data-md, and the
// look's style options (core/design/scope.js), so the thumbnail shows its
// theme, corners and page ground whatever theme the page around it uses.
import '../../styles/mini.css';
import { scopeAttrs } from '../../core/design/scope';

const TILES = ['t1', 't2', 't3', 't4', 't2', 't1'];

export default function LookThumb({ design, brand, mode = 'light', scale = 1 }) {
  const d = design;
  const scope = scopeAttrs(d, mode);
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
          <span className="m-av" />
          <div><div className="m-l1" /><div className="m-l2" /></div>
        </div>
        <div className="m-tabs"><i /><i /><i /></div>
        {d.show.stories && <div className="m-rings"><i /><i /><i /><i /><i /></div>}
        {d.header !== 'cover' && <div className="m-hero" />}
        <div className="m-pills"><i className="on" /><i /><i /><i /></div>
        <div className="m-grid">
          {TILES.map((tile, i) => (
            <div key={i} className="m-row"><div className={`m-ph ${tile}`} /><i /></div>
          ))}
        </div>
        <div className="m-dock" />
        <div className="m-fab" />
      </div>
    </div>
  );
}
