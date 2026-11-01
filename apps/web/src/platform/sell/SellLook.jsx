// Quick setup's look (the design's O5): three looks for what the store sells,
// each drawn as the seller's own store, with quick changes — menu, layout,
// colour, shuffle — and every look on one wall (O6).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LookThumb from '../../components/design/LookThumb';
import { LOOKS, lookById, suggestedLooks } from '../../core/design/looks';
import schema from '../../core/design/schema.json';
import { Btn, Ic, SellScreen, Wrap } from './kit';
import { GROUPS, QUICK, lookLine } from './setup';

/**
 * A pill that opens a small menu under it. The menu is fixed to the viewport
 * and kept inside it, so a pill at the edge of a phone still opens a whole one.
 */
function QuickMenu({ label, open, onOpen, onClose, children }) {
  const pill = useRef(null);
  const pop = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return undefined; }
    const place = () => {
      const r = pill.current.getBoundingClientRect();
      const w = pop.current?.offsetWidth || 220;
      const h = pop.current?.offsetHeight || 0;
      const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
      const below = r.bottom + 8;
      setPos({ left, top: below + h > window.innerHeight - 12 ? Math.max(12, r.top - 8 - h) : below });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!pop.current?.contains(e.target) && !pill.current?.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); pill.current?.focus(); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <button ref={pill} type="button" className="sl-pill" aria-haspopup="menu" aria-expanded={open} onClick={() => (open ? onClose() : onOpen())}>
        {label}<span aria-hidden="true">{' ▾'}</span>
      </button>
      {open && (
        <div ref={pop} className="sl-pop" role="menu" aria-label={label} style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}>
          {children}
        </div>
      )}
    </>
  );
}

/** The quick changes: menu, layout and colour, each a pill with its choices. */
function QuickChanges({ t, td, design, colour, onRemix, onColour, align = 'center' }) {
  const [open, setOpen] = useState(null);
  const close = () => setOpen(null);
  const item = (checked, label, onPick) => (
    <button key={label} type="button" className="it" role="menuitemradio" aria-checked={checked} onClick={() => { onPick(); close(); }}>
      <span className="sl-grow">{label}</span>
      {checked && <Ic name="check" className="s" />}
    </button>
  );
  return (
    <>
      <QuickMenu label={t('open.look.menu')} open={open === 'menu'} onOpen={() => setOpen('menu')} onClose={close}>
        {schema.options.menu.map((id) => item(design.menu === id, td(`menu.${id}`), () => onRemix('menu', id)))}
      </QuickMenu>
      <QuickMenu label={t('open.look.layout')} open={open === 'layout'} onOpen={() => setOpen('layout')} onClose={close}>
        {schema.options.productLayout.map((id) => item(design.productLayout === id, td(`layout.${id}`), () => onRemix('productLayout', id)))}
      </QuickMenu>
      <QuickMenu label={t('open.look.colour')} open={open === 'colour'} onOpen={() => setOpen('colour')} onClose={close}>
        <div className="sws" style={{ justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
          {QUICK.map((c) => (
            <button
              key={c.hex} type="button" role="menuitemradio" aria-checked={colour === c.hex}
              aria-label={t(`open.colours.${c.key}`)} className={`sl-swatch ${colour === c.hex ? 'on' : ''}`}
              style={{ background: c.hex }} onClick={() => { onColour(c.hex); close(); }}
            />
          ))}
          <label className="sl-swatch custom" aria-label={t('open.brand.custom')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" /></svg>
            <input type="color" value={colour} onChange={(e) => onColour(e.target.value)} />
          </label>
        </div>
      </QuickMenu>
    </>
  );
}

/** O5 — three looks, one picked, each drawn as the seller's store. */
export function SellLook({ dev, top, three, look, designOf, colour, own, groupLabel, onSelect, onRemix, onColour, onShuffle, onMore, onNext }) {
  const { t } = useTranslation('platform');
  const { t: td } = useTranslation('design');
  const d = designOf(look);
  const i = Math.max(0, three.findIndex((l) => l.id === look.id));
  const step = (by) => onSelect(three[(i + by + three.length) % three.length].id);
  const gen = t(`open.lookGen.${look.id}`);
  const sub = groupLabel ? t('open.look.sub', { cat: groupLabel }) : t('open.look.subAny');
  const swipe = useRef(null);

  const useIt = <Btn onClick={onNext} block={dev === 'ph'} style={dev === 'desk' ? { width: 528 } : dev === 'tab' ? { flex: '1 1 0' } : undefined}>{t('open.look.use', { name: gen })}</Btn>;
  const more = <Btn kind="g" size={dev === 'ph' ? '' : 'lg'} block={dev === 'ph'} onClick={onMore} style={dev === 'tab' ? { flex: '1 1 0' } : dev === 'desk' ? { minWidth: 'max-content' } : undefined}>{t('open.look.more')}</Btn>;
  const shuffle = (
    <Btn kind="g" size={dev === 'ph' ? '' : 'lg'} block={dev === 'ph'} onClick={onShuffle} style={dev === 'tab' ? { flex: '1 1 0' } : dev === 'desk' ? { minWidth: 'max-content' } : undefined}>
      <Ic name="shuffle" />{t('open.look.shuffle')}
    </Btn>
  );

  return (
    <SellScreen
      {...top}
      bar={dev === 'ph' ? (<>{useIt}<div className="sl-row" style={{ gap: 10 }}>{more}{shuffle}</div></>) : null}
    >
      <Wrap dev={dev} gap={{ ph: 14, tab: 22, desk: 22 }} top={{ ph: 18 }}>
        <div className="sl-stk" style={{ gap: 6 }}>
          <h1 className="sl-h1">{t('open.look.title')}</h1>
          <p className="sl-p">{sub}</p>
        </div>

        {dev === 'ph' ? (
          <div className="sl-stk" style={{ gap: 12, alignItems: 'center' }}>
            <div
              className="sl-row" style={{ gap: 10, justifyContent: 'center', touchAction: 'pan-y' }}
              onPointerDown={(e) => { swipe.current = e.clientX; }}
              onPointerUp={(e) => {
                if (swipe.current == null) return;
                const dx = e.clientX - swipe.current;
                swipe.current = null;
                if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
              }}
            >
              <button type="button" className="sl-ibtn" aria-label={t('open.look.prev')} onClick={() => step(-1)}><Ic name="back" /></button>
              <div role="img" aria-label={`${td(`names.${look.id}`)} · ${lookLine(td, d)}`}>
                <LookThumb design={d} brand={colour} scale={0.74} {...own} />
              </div>
              <button type="button" className="sl-ibtn" aria-label={t('open.look.next')} onClick={() => step(1)}><Ic name="next" /></button>
            </div>
            <div className="sl-rowb" style={{ width: '100%', alignItems: 'baseline' }}>
              <b className="sl-h3">{td(`names.${look.id}`)}</b>
              <span className="sl-sm sl-dim" style={{ textAlign: 'right' }}>{lookLine(td, d)}</span>
            </div>
            <div className="sl-dots" aria-hidden="true">{three.map((l) => <i key={l.id} className={l.id === look.id ? 'on' : ''} />)}</div>
            <div className="sl-row" style={{ gap: 8, justifyContent: 'center' }}>
              <QuickChanges t={t} td={td} design={d} colour={colour} onRemix={onRemix} onColour={onColour} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: dev === 'desk' ? 20 : 12 }}>
              {three.map((l) => {
                const on = l.id === look.id;
                const ld = designOf(l);
                return (
                  <button key={l.id} type="button" className={`sl-opt ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onSelect(l.id)} style={{ padding: dev === 'desk' ? 20 : 12 }}>
                    <LookThumb design={ld} brand={colour} scale={dev === 'desk' ? 0.92 : 0.72} {...own} />
                    <span className="sl-rowb" style={{ width: '100%', alignItems: 'flex-start' }}>
                      <span style={{ minWidth: 0 }}>
                        <b className="sl-h3" style={{ display: 'block' }}>{td(`names.${l.id}`)}</b>
                        <span className="sl-xs sl-dim" style={{ display: 'block' }}>{lookLine(td, ld)}</span>
                      </span>
                      <span className={`sl-radio ${on ? 'on' : ''}`} aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="sl-row sl-wrap" style={{ gap: 8 }}>
              <span className="sl-sm sl-dim" style={{ marginRight: 4 }}>{t('open.look.tune', { name: gen })}</span>
              <QuickChanges t={t} td={td} design={d} colour={colour} onRemix={onRemix} onColour={onColour} align="start" />
            </div>
            <div className="sl-row" style={{ gap: 12 }}>{useIt}{more}{shuffle}</div>
          </>
        )}
      </Wrap>
    </SellScreen>
  );
}

// The wall's order, mixing themes and groups the way the board does.
const WALL = ['social', 'studio', 'sneaker', 'bakery', 'gallerywall', 'nightdrop', 'glowup', 'market', 'gadget', 'boutique', 'coffee', 'toybox', 'pastel', 'cleantech']
  .map(lookById).filter(Boolean);
// Any look the order above forgot still shows.
LOOKS.forEach((l) => { if (!WALL.includes(l)) WALL.push(l); });

/** O6 — every look, filtered by what it is made for; a tap picks it and goes back. */
export function SellMoreLooks({ dev, top, current, designOf, colour, own, onPick }) {
  const { t } = useTranslation('platform');
  const { t: td } = useTranslation('design');
  const [filter, setFilter] = useState('all');
  // "Other" has no looks of its own: it shows the three it starts from.
  const list = filter === 'all' ? WALL : filter === 'other' ? suggestedLooks('other') : WALL.filter((l) => l.group === filter);
  const cols = dev === 'ph' ? 2 : dev === 'tab' ? 3 : 5;
  const scale = dev === 'ph' ? 0.72 : dev === 'tab' ? 0.8 : 0.85;
  return (
    <SellScreen {...top}>
      <Wrap dev={dev} gap={{ ph: 16, tab: 20, desk: 20 }} top={{ ph: 18 }}>
        <div className="sl-stk" style={{ gap: 6 }}>
          <h1 className="sl-h1">{t('open.more.title', { count: LOOKS.length })}</h1>
          <p className="sl-p">{t('open.more.body')}</p>
        </div>
        <div className="sl-pills" role="group" aria-label={t('open.more.filter')}>
          {['all', ...GROUPS].map((g) => (
            <button key={g} type="button" className={`sl-pill ${filter === g ? 'on' : ''}`} aria-pressed={filter === g} onClick={() => setFilter(g)}>
              {g === 'all' ? t('open.more.all') : td(`group.${g}`)}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: dev === 'ph' ? '22px 12px' : dev === 'tab' ? '28px 16px' : '30px 20px', justifyItems: 'center', padding: '6px 0 40px' }}>
          {list.map((l) => {
            const on = l.id === current;
            const ld = designOf(l);
            return (
              <button
                key={l.id} type="button" onClick={() => onPick(l.id)} aria-current={on || undefined}
                style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', minWidth: 0, background: 'none', border: 0, padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}
              >
                <span className={`sl-th ${on ? 'on' : ''}`} style={{ borderRadius: 28 * scale + 4 }}>
                  <LookThumb design={ld} brand={colour} scale={scale} {...own} />
                </span>
                <span className="sl-stk" style={{ gap: 4, alignItems: 'center', textAlign: 'center' }}>
                  <b className="sl-sm">{td(`names.${l.id}`)}</b>
                  <span className="sl-xs sl-dim">{`${td(`group.${l.group}`)} · ${td(`theme.${ld.theme}`)}`}</span>
                  {on && (
                    <span className="sl-chip brand" style={{ height: 22, padding: '0 9px', gap: 4 }}>
                      <Ic name="check" style={{ width: 12, height: 12, strokeWidth: 3 }} />{td('look.picked')}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Wrap>
    </SellScreen>
  );
}
