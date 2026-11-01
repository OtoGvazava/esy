// Quick setup's logo and colour (the design's O7). Both are optional. The
// logo stays in the browser as the chosen File until the store exists — the
// upload needs a store to belong to — and its main colour, picked on a canvas
// here, is offered first, before the six quick colours.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LookThumb from '../../components/design/LookThumb';
import { colourCheck } from '../../core/design/contrast';
import { logoColour } from '../../core/design/logoColour';
import { Btn, Ic, SellScreen, Wrap } from './kit';
import { QUICK, colourName } from './setup';

// What the logo endpoint takes (ImageUpload on the server): these four types, up to 5 MB.
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const LOGO_MAX = 5 * 1024 * 1024;

const imageSize = (url) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
  img.onerror = () => resolve(null);
  img.src = url;
});

/** The look as a short spec beside its thumbnail: look, theme, menu, layout. */
export function LookSpec({ t, td, lookId, design }) {
  if (!lookId) return null;
  return (
    <dl className="sl-spec sl-sm">
      <dt>{t('open.spec.look')}</dt><dd>{td(`names.${lookId}`)}</dd>
      <dt>{t('open.spec.theme')}</dt><dd>{td(`theme.${design.theme}`)}</dd>
      <dt>{t('open.spec.menu')}</dt><dd>{td(`menu.${design.menu}`)}</dd>
      <dt>{t('open.spec.layout')}</dt><dd>{t(`open.layoutSpec.${design.productLayout}`)}</dd>
    </dl>
  );
}

/** O7 — an optional logo, and the store colour. */
export function SellBrand({ dev, top, logo, logoHex, onLogo, onRemoveLogo, colour, onColour, lookId, design, own, onNext }) {
  const { t } = useTranslation('platform');
  const { t: td } = useTranslation('design');
  const [err, setErr] = useState('');
  const [over, setOver] = useState(false);
  const check = colourCheck(colour);
  const custom = colour !== logoHex && !QUICK.some((c) => c.hex === colour);

  const pick = async (file) => {
    setErr('');
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) { setErr(t('open.brand.errType')); return; }
    if (file.size > LOGO_MAX) { setErr(t('open.brand.errSize')); return; }
    const url = URL.createObjectURL(file);
    const size = await imageSize(url);
    if (!size) { URL.revokeObjectURL(url); setErr(t('open.brand.errRead')); return; }
    onLogo({ file, url, name: file.name, ...size, hex: await logoColour(url) });
  };
  const onFile = (e) => { pick(e.target.files?.[0]); e.target.value = ''; };

  const cta = <Btn onClick={onNext}>{t('open.brand.next')}</Btn>;
  const swatch = (hex, label, key) => (
    <button
      key={key || hex} type="button" className={`sl-swatch ${colour === hex ? 'on' : ''}`} aria-pressed={colour === hex}
      aria-label={label} title={label} style={{ background: hex }} onClick={() => onColour(hex)}
    />
  );

  const aside = (
    <>
      <span className="sl-lbl">{t('open.brand.yourStore')}</span>
      <div className="sl-row" style={{ gap: 18, alignItems: 'flex-start' }}>
        <LookThumb design={design} brand={colour} scale={dev === 'ph' ? 0.48 : dev === 'tab' ? 0.9 : 1} {...own} />
        <div className="sl-stk sl-grow" style={{ gap: 12 }}>
          <LookSpec t={t} td={td} lookId={lookId} design={design} />
          <p className="sl-xs sl-dim" style={{ margin: 0 }}>{t('open.brand.later')}</p>
        </div>
      </div>
    </>
  );

  return (
    <SellScreen {...top} bar={dev === 'ph' ? cta : null}>
      <Wrap dev={dev} side aside={aside} gap={{ ph: 16, tab: 30, side: 12 }} top={{ ph: 22 }}>
        <div className="sl-stk" style={{ gap: dev === 'ph' ? 16 : 18 }}>
          <div className="sl-stk" style={{ gap: 6 }}>
            <h1 className="sl-h1">{t('open.brand.title')}</h1>
            <p className="sl-p">{t('open.brand.body')}</p>
          </div>

          {logo ? (
            <div className="sl-dz full">
              <span className="sl-av lg" style={{ borderRadius: 22, background: colour }}><img src={logo.url} alt="" /></span>
              <span className="sl-grow">
                <b style={{ display: 'block', color: 'var(--k-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logo.name}</b>
                <span className="sl-xs" style={{ display: 'block' }}>{t('open.brand.chosen', { w: logo.w, h: logo.h })}</span>
              </span>
              <span className="sl-stk" style={{ gap: 14, alignItems: 'flex-end' }}>
                <label className="sl-link sl-sm" style={{ cursor: 'pointer', position: 'relative' }}>
                  {t('open.brand.change')}
                  <input type="file" className="sl-file" accept={LOGO_TYPES.join(',')} aria-label={t('open.brand.changeLabel')} onChange={onFile} />
                </label>
                <button type="button" className="sl-link bad sl-sm" onClick={() => { setErr(''); onRemoveLogo(); }}>{t('open.brand.remove')}</button>
              </span>
            </div>
          ) : (
            <label
              className={`sl-dz ${over ? 'over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
            >
              <Ic name="image" className="l" />
              <b style={{ color: 'var(--k-fg)' }}>{dev === 'ph' ? t('open.brand.choose') : t('open.brand.drop')}</b>
              <span className="sl-xs">{t('open.brand.types')}</span>
              <input type="file" className="sl-file" accept={LOGO_TYPES.join(',')} aria-label={t('open.brand.logo')} onChange={onFile} />
            </label>
          )}
          {err && <p className="sl-err" role="alert">{err}</p>}

          <div className="sl-stk" style={{ gap: 10 }}>
            <span className="sl-sm">
              {logoHex ? <><b>{t('open.brand.fromLogo')}</b>{t('open.brand.orOther')}</> : <b>{t('open.brand.pick')}</b>}
            </span>
            <div className="sl-row sl-wrap" style={{ gap: 10 }}>
              {logoHex && (
                <>
                  {swatch(logoHex, t('open.brand.logoSwatch', { colour: t(`open.colours.${colourName(logoHex)}`) }), 'logo')}
                  <span className="sl-sep" aria-hidden="true" />
                </>
              )}
              {QUICK.filter((c) => c.hex !== logoHex).map((c) => swatch(c.hex, t(`open.colours.${c.key}`)))}
              {custom && swatch(colour, t('open.brand.customOn', { colour: t(`open.colours.${colourName(colour)}`) }), 'custom')}
              <label className="sl-swatch custom" aria-label={t('open.brand.custom')} title={t('open.brand.custom')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" /></svg>
                <input type="color" value={colour} onChange={(e) => onColour(e.target.value)} />
              </label>
            </div>
          </div>

          {check.ok ? (
            <div className="sl-alert ok"><Ic name="check" /><span className="sl-sm">{t('open.brand.checkOk')}</span></div>
          ) : (
            <div className="sl-alert warn" role="status">
              <Ic name="warn" />
              <div className="sl-stk sl-sm" style={{ gap: 8 }}>
                <span>{t(`open.brand.check.${check.issue}`)}</span>
                <button type="button" className="sl-link" style={{ alignSelf: 'flex-start' }} onClick={() => onColour(check.fix)}>{t('open.brand.fix')}</button>
              </div>
            </div>
          )}
          {dev !== 'ph' && cta}
        </div>
      </Wrap>
    </SellScreen>
  );
}
