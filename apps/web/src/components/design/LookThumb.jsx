// A look's thumbnail (the design canvas's Mini): a storefront drawn with the
// look's own theme tokens and real product photos, so a seller can compare
// looks before the store has a single product. The root carries data-th and
// data-md, and the look's style options (core/design/scope.js), so the
// thumbnail shows its theme, corners and page ground whatever theme the page
// around it uses.
//
// The photos are of what the store sells (`group`, one of the looks' groups):
// its tiles, its cover band and the end of its hero band (./photos.js). A group
// without photos of its own, or none given, draws the photos of the look's own
// group.
//
// Given a `name`, it is the seller's own store, as quick setup draws it: the
// name and initials (or the chosen logo) in place of the placeholder bars.
import '../../styles/mini.css';
import { scopeAttrs } from '../../core/design/scope';
import { lookById } from '../../core/design/looks';
import { groupPhotos, hasPhotos } from './photos';

// The tiles' tones, as the canvas Mini draws them.
const TONES = ['t1', 't2', 't3', 't4', 't2', 't1'];
const url = (src) => (src ? `url("${src}")` : undefined);

export default function LookThumb({ design, brand, mode = 'light', scale = 1, name, initials, logo, group }) {
  const d = design;
  const scope = scopeAttrs(d, mode);
  const own = !!name;
  const photos = groupPhotos(hasPhotos(group) ? group : lookById(d.look)?.group);
  return (
    <div aria-hidden="true" style={{ width: 200 * scale, height: 412 * scale, flex: 'none' }}>
      <div
        {...scope}
        className={`mini ${scope.className} l-${d.productLayout} n-${d.menu}`}
        style={{
          '--k-brand': brand, '--m-cover': url(photos.cover), '--m-hero': url(photos.hero),
          transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: '0 0',
        }}
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
          {TONES.map((tone, i) => (
            <div key={i} className="m-row">
              <div className={`m-ph ${tone}`} style={{ '--m-p': url(photos.tiles[i]) }} />
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
