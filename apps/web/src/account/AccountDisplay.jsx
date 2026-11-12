// /account/display — language and display, an account section like the others
// (the design's U7; inside a store S4, signed out S5). Language, appearance,
// text size and, on a store, the product view in one list; the three comfort
// switches in another. Every choice applies at once and is kept by
// DisplayPrefsContext: in this browser for a guest, on the esy account when
// signed in. It replaced the store's own display settings screen.
import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { useDisplayPrefs } from '../contexts/DisplayPrefsContext';
import { LANGS, TEXT_SIZES, VIEWS } from '../core/display/prefs';
import { langInfo } from '../components/glow/GlowPrimitives';
import { useIndicator } from '../core/useIndicator';
import { VIEW_PATHS } from '../components/store/ViewSwitch';
import { useSegLook } from '../components/glow/useSegLook';
import { Btn, Card, List, liStyle } from '../platform/PlatformKit';
import { Head, useAccount } from './parts';

// The design's glyphs for this screen, drawn at the theme's stroke weight.
const PATHS = {
  light: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  dark: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  auto: <><rect x="3.5" y="5" width="17" height="11.5" rx="2" /><path d="M9 20h6M12 16.5V20" /></>,
  ...VIEW_PATHS,
};

function Glyph({ name, size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"
      style={{ flex: 'none', fill: 'none', stroke: 'currentColor', strokeWidth: 'var(--k-ic-w, 1.8)', strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >{PATHS[name]}</svg>
  );
}

/**
 * One choice of several, as a radio group: the chosen option is the one Tab
 * stops on, and the arrow keys move the choice.
 */
function Seg({ labelledBy, options, value, onChange, wellStyle, buttonStyle }) {
  const look = useSegLook();
  const refs = useRef([]);
  const well = useRef(null);
  const ind = useIndicator(well, value ?? null);
  const at = Math.max(0, options.findIndex((o) => o.id === value));
  const onKey = (e, i) => {
    const n = options.length;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    let next;
    if (step) next = (i + step + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    onChange(options[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div ref={well} role="radiogroup" aria-labelledby={labelledBy} style={{ ...look.well, ...wellStyle }}>
      <span aria-hidden="true" className="esy-ind" data-still={ind.still || undefined} style={{ ...ind.style, ...look.thumb }} />
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={o.id} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on}
            tabIndex={i === at ? 0 : -1} lang={o.lang} onClick={() => onChange(o.id)} onKeyDown={(e) => onKey(e, i)}
            data-ind={o.id} className="esy-press-soft"
            style={{ ...look.button(on), ...buttonStyle }}
          >{o.content}</button>
        );
      })}
    </div>
  );
}

/** A 46 × 28 switch inside a 44 px target, as the kit draws it. */
function Switch({ T, on, onChange, labelledBy, describedBy }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-labelledby={labelledBy} aria-describedby={describedBy}
      onClick={() => onChange(!on)}
      style={{ flex: 'none', margin: -8, padding: 8, border: 0, borderRadius: 22, background: 'transparent', cursor: 'pointer' }}
    >
      <span aria-hidden="true" style={{
        position: 'relative', display: 'block', width: 46, height: 28, borderRadius: 14,
        background: on ? T.accent : 'var(--k-line)',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .16s ease',
        }} />
      </span>
    </button>
  );
}

export default function AccountDisplay() {
  const { T, dev, app, guest } = useAccount();
  const { ph, desk } = dev;
  const { t } = useTranslation('display');
  const acct = useTranslation('account').t;
  const { language, appearance, setLanguage, setMode } = useThemeMode();
  const display = useDisplayPrefs();
  const ids = useId();

  if (!display) return null;
  const id = (name) => `${ids}-${name}`;

  // The product view is kept per store, so it is a store's choice alone.
  const views = app === 'store';
  const choiceRow = (last) => ({ ...liStyle(T, last), flexDirection: 'column', alignItems: 'stretch', gap: 10 });
  const title = { margin: 0, font: `700 12.5px/1.3 ${T.font}`, color: T.text };
  const sub = { margin: '2px 0 0', font: `400 12px/1.4 ${T.font}`, color: T.textDim };

  const appearances = ['light', 'dark', 'auto'];
  const view = display.view || 'store';
  const switches = [
    { key: 'solid', on: display.solid, set: display.setSolid },
    { key: 'motion', on: display.motion, set: display.setMotion },
    { key: 'saver', on: display.saver, set: display.setSaver },
  ];

  return (
    <>
      <Head T={T} desk={desk} title={t('title')} sub={t(guest ? 'introGuest' : 'intro')} />

      {/* Signed out below a desktop, the offer to sign in sits here; on a desktop it is beside the page. */}
      {guest && !desk && (
        <Card T={T} pad={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: ph ? 'wrap' : 'nowrap' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{acct('hub.guestSignIn')}</span>
          <Btn T={T} kind="p" size="sm" ph={ph} to="/signin" style={ph ? { flex: '1 0 100%' } : undefined}>{acct('hub.signIn')}</Btn>
        </Card>
      )}

      <div style={desk
        ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, alignItems: 'start' }
        : { display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <List T={T}>
          <div style={choiceRow(false)}>
            <div id={id('lang')} style={title}>{t('language')}</div>
            <Seg
              labelledBy={id('lang')} value={language} onChange={setLanguage}
              options={LANGS.map((code) => ({ id: code, lang: code, content: langInfo(code).native }))}
            />
          </div>
          <div style={choiceRow(false)}>
            <div id={id('appearance')} style={title}>{t('appearance.label')}</div>
            <Seg
              labelledBy={id('appearance')} value={appearance || 'auto'} onChange={setMode}
              options={appearances.map((a) => ({ id: a, content: <><Glyph name={a} />{t(`appearance.${a}`)}</> }))}
            />
          </div>
          <div style={choiceRow(!views)}>
            <div id={id('text')} style={title}>{t('text.label')}</div>
            <Seg
              labelledBy={id('text')} value={display.text} onChange={display.setText}
              buttonStyle={{ minHeight: 58, flexDirection: 'column', gap: 3, padding: '6px 4px', lineHeight: 1.15, whiteSpace: 'normal', textAlign: 'center' }}
              options={TEXT_SIZES.map((s, i) => ({
                id: s,
                content: (
                  <>
                    <span aria-hidden="true" style={{ font: `600 ${[13, 15, 18, 21][i]}px/1 ${T.font}` }}>{t('text.glyph')}</span>
                    <span style={{ fontSize: 12 }}>{t(`text.${s}`)}</span>
                  </>
                ),
              }))}
            />
          </div>
          {views && (
            <div style={choiceRow(true)}>
              <div id={id('view')} style={title}>{t('view.label')}</div>
              <Seg
                labelledBy={id('view')} value={view} onChange={(v) => display.setView(v === 'store' ? null : v)}
                wellStyle={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderRadius: 'min(var(--k-r-btn), 20px)' }}
                buttonStyle={{
                  minHeight: 48, padding: '8px 12px', justifyContent: 'flex-start', textAlign: 'left',
                  whiteSpace: 'normal', lineHeight: 1.2, borderRadius: 'max(0px, min(calc(var(--k-r-btn) - 4px), 16px))',
                }}
                options={['store', ...VIEWS].map((v) => ({ id: v, content: <><Glyph name={v} />{t(`view.${v}`)}</> }))}
              />
            </div>
          )}
        </List>

        <List T={T}>
          {switches.map((s, i) => (
            <div key={s.key} style={liStyle(T, i === switches.length - 1)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div id={id(s.key)} style={title}>{t(`${s.key}.label`)}</div>
                <div id={id(`${s.key}-sub`)} style={sub}>{t(`${s.key}.sub`)}</div>
              </div>
              <Switch T={T} on={s.on} onChange={s.set} labelledBy={id(s.key)} describedBy={id(`${s.key}-sub`)} />
            </div>
          ))}
        </List>
      </div>
    </>
  );
}
