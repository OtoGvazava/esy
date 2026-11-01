// Quick setup's first two steps: the store's name and its link (the design's
// O3), and what it sells (O4).
import { useTranslation } from 'react-i18next';
import { onColor } from '../../core/tokens';
import { Btn, Ic, SellScreen, Wrap, initialsOf } from './kit';
import { GROUPS } from './setup';

// The subdomain check's answers (TenantService.subdomainStatus), as a chip.
const SUB_CHIP = {
  available: 'done',
  checking: 'proc',
  taken: 'bad',
  reserved: 'bad',
  invalid: 'warn',
};

/** O3 — the name buyers see, and the link the seller shares. */
export function SellName({ dev, top, name, onName, subdomain, onSub, subState, touched, colour, onNext }) {
  const { t } = useTranslation('platform');
  const ok = subState === 'available' && !!name.trim();
  // Until something is typed there is nothing to judge.
  const state = !name.trim() && !subdomain ? null : subState;
  const bad = touched && (state === 'taken' || state === 'reserved' || state === 'invalid');
  const cta = <Btn off={!ok} onClick={onNext}>{t('open.next')}</Btn>;

  const aside = (
    <>
      <span className="sl-lbl">{t('open.name.previewTitle')}</span>
      <div className="sl-card sl-pad">
        <div className="sl-row" style={{ gap: 12 }}>
          <span className="sl-av" style={{ background: colour, color: onColor(colour) }} aria-hidden="true">{initialsOf(name)}</span>
          <div className="sl-grow">
            <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: name.trim() ? 'var(--k-fg)' : 'var(--k-dim)' }}>
              {name.trim() || t('open.name.yourStore')}
            </b>
            <div className="sl-sm sl-dim" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`${subdomain || '…'}.esy.ge`}</div>
          </div>
          <Ic name="link" />
        </div>
      </div>
      <p className="sl-xs sl-dim" style={{ margin: 0 }}>{t('open.name.previewNote')}</p>
    </>
  );

  return (
    <SellScreen {...top} bar={dev === 'ph' ? cta : null}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onNext(); }}>
        <Wrap dev={dev} side aside={aside} gap={{ ph: 22, tab: 32 }}>
          <div className="sl-stk" style={{ gap: dev === 'ph' ? 16 : 18 }}>
            <div className="sl-stk" style={{ gap: 8 }}>
              <h1 className="sl-h1">{t('open.name.title')}</h1>
              <p className="sl-p">{t('open.name.body')}</p>
            </div>
            <label className="sl-fld">{t('open.name.nameLabel')}
              <input
                className="sl-in" value={name} maxLength={60} autoComplete="organization"
                placeholder={t('open.name.namePlaceholder')} onChange={(e) => onName(e.target.value)}
              />
            </label>
            <label className="sl-fld">{t('open.name.linkLabel')}
              <span className={`sl-ingrp ${bad ? 'err' : ''}`}>
                <input
                  value={subdomain} onChange={(e) => onSub(e.target.value)} aria-invalid={bad}
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="url"
                />
                <span>{'.esy.ge'}</span>
              </span>
            </label>
            <div className="sl-row sl-sm" style={{ gap: 8 }} aria-live="polite">
              {state && (
                <span className={`sl-chip ${SUB_CHIP[state]} ${state === 'checking' ? '' : 'dot'}`}>
                  {state === 'checking' && <span className="sl-spin" aria-hidden="true" />}
                  {t(`open.name.sub.${state}`)}
                </span>
              )}
              <span className="sl-dim" style={{ minWidth: 0 }}>{state === 'taken' || state === 'reserved' ? t(`open.name.why.${state}`) : t('open.name.rule')}</span>
            </div>
            {dev !== 'ph' && <div style={{ marginTop: 8 }}>{cta}</div>}
          </div>
        </Wrap>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </SellScreen>
  );
}

/** O4 — what the store sells, which picks the three looks it starts from. */
export function SellCategory({ dev, top, value, onPick, onNext }) {
  const { t } = useTranslation('platform');
  const { t: td } = useTranslation('design');
  const cols = dev === 'ph' ? 2 : dev === 'tab' ? 3 : 4;
  const cta = (
    <Btn off={!value} onClick={onNext} block={dev !== 'desk'} style={dev === 'desk' ? { width: 528, alignSelf: 'flex-start' } : dev === 'tab' ? { marginTop: 4 } : undefined}>
      {t('open.next')}
    </Btn>
  );
  return (
    <SellScreen {...top} bar={dev === 'ph' ? cta : null}>
      <Wrap dev={dev} gap={{ ph: 20, tab: 24, desk: 26 }}>
        <div className="sl-stk" style={{ gap: 8 }}>
          <h1 className="sl-h1">{t('open.category.title')}</h1>
          <p className="sl-p">{t('open.category.body')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: dev === 'ph' ? 10 : dev === 'tab' ? 12 : 14 }}>
          {GROUPS.map((g) => (
            <button key={g} type="button" className={`sl-tile ${value === g ? 'on' : ''}`} aria-pressed={value === g} onClick={() => onPick(g)}>
              <Ic name={g} className="l" />
              {td(`group.${g}`)}
            </button>
          ))}
        </div>
        {dev !== 'ph' && cta}
      </Wrap>
    </SellScreen>
  );
}
