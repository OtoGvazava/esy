// Account → Language and display (the design's D3; store design plan, Phase 7).
// Language, appearance, text size and the product view in one list, the three
// comfort switches in another. Every choice applies at once and is kept by
// DisplayPrefsContext: in this browser for a guest, on the esy account when
// signed in. It replaced the separate language and appearance screens.
import { useId, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { useDevice } from '../contexts/DeviceContext';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { useDisplayPrefs } from '../contexts/DisplayPrefsContext';
import { useBottomClearance } from '../core/design/useDesign';
import { LANGS, TEXT_SIZES, VIEWS } from '../core/display/prefs';
import { HeadButton } from '../components/store/StoreMenus';
import { langInfo } from '../components/glow/GlowPrimitives';
import { useIndicator } from '../core/useIndicator';
import { GlowScreen } from '../components/glow/GlowChrome';
import { VIEW_PATHS } from '../components/store/ViewSwitch';
import { useSegLook } from '../components/glow/useSegLook';
import { hostKey } from '../core/hostKey';

// The design's glyphs for this screen, drawn at the theme's stroke weight.
const PATHS = {
  back: <path d="M15 5 8 12l7 7" />,
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
function Switch({ on, onChange, labelledBy, describedBy }) {
  const { T } = useGlow();
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

export default function DisplaySettings() {
  const { T } = useGlow();
  const { t } = useTranslation('display');
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useDevice();
  const { isAuthenticated } = useAuth();
  const { language, appearance, setLanguage, setMode } = useThemeMode();
  const display = useDisplayPrefs();
  const clearance = useBottomClearance();
  const ids = useId();

  if (!display) return null;
  const id = (name) => `${ids}-${name}`;

  // On esy.ge this screen belongs to the account; on a store, whose account
  // lives on esy.ge, it is reached from the shop.
  const onStore = hostKey() === 'store';
  const home = onStore ? '/' : '/account';
  // Back where the shopper came from, or to that home on a first page.
  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(home));

  const list = {
    background: T.surface, border: 'var(--k-card-bd)', boxShadow: 'var(--k-card-sh)',
    borderRadius: 'var(--k-r-card)', overflow: 'hidden',
  };
  const row = (last) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56, boxSizing: 'border-box',
    borderBottom: last ? 'none' : `1px solid ${T.border}`,
  });
  const choiceRow = (last) => ({ ...row(last), flexDirection: 'column', alignItems: 'stretch', gap: 10 });
  const title = { margin: 0, font: `700 12.5px/1.3 ${T.font}`, color: T.text };
  const sub = { margin: '2px 0 0', font: `400 12px/1.4 ${T.font}`, color: T.textDim };

  const appearances = ['light', 'dark', 'auto'];
  const view = display.view || 'store';
  const switches = [
    { key: 'solid', on: display.solid, set: display.setSolid },
    { key: 'motion', on: display.motion, set: display.setMotion },
    { key: 'saver', on: display.saver, set: display.setSaver },
  ];

  const choices = (
    <div style={list}>
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
      <div style={choiceRow(false)}>
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
    </div>
  );

  const comfort = (
    <div style={list}>
      {switches.map((s, i) => (
        <div key={s.key} style={row(i === switches.length - 1)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id={id(s.key)} style={title}>{t(`${s.key}.label`)}</div>
            <div id={id(`${s.key}-sub`)} style={sub}>{t(`${s.key}.sub`)}</div>
          </div>
          <Switch on={s.on} onChange={s.set} labelledBy={id(s.key)} describedBy={id(`${s.key}-sub`)} />
        </div>
      ))}
    </div>
  );

  return (
    <GlowScreen T={T} padBottom={isDesktop ? 48 : clearance + 28}>
      {!isDesktop && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isTablet ? '16px 28px 6px' : '12px 16px 6px' }}>
          <HeadButton label={t('back')} onClick={goBack}><Glyph name="back" size={20} /></HeadButton>
          <h1 style={{ flex: 1, minWidth: 0, margin: 0, textAlign: 'center', font: `600 16px/1.3 var(--k-font-d, ${T.font})`, color: T.text }}>
            {t('title')}
          </h1>
          <span aria-hidden="true" style={{ width: 44, flex: 'none' }} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', padding: isDesktop ? '28px 48px 0' : isTablet ? '10px 28px 0' : '8px 16px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: isMobile ? undefined : isTablet ? 600 : 1040 }}>
          {isDesktop && (
            <div>
              <Link to={home} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginBottom: 4, font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' }}>
                <Glyph name="back" size={12} />{onStore ? t('toShop') : t('toAccount')}
              </Link>
              <h1 style={{ margin: 0, font: `var(--k-w-t, 700) 30px/1.15 var(--k-font-d, ${T.font})`, letterSpacing: '-0.02em', color: T.text }}>
                {t('title')}
              </h1>
            </div>
          )}
          <p style={{ margin: 0, maxWidth: 640, font: `400 12.5px/1.45 ${T.font}`, color: T.textDim }}>
            {t(isAuthenticated ? 'intro' : 'introGuest')}
          </p>
          <div style={isDesktop
            ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, alignItems: 'start' }
            : { display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {choices}
            {comfort}
          </div>
        </div>
      </div>
    </GlowScreen>
  );
}
