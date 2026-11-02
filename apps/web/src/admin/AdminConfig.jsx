// /config — live platform configuration (the design's AD6).
//
// One row per value: what it is, where the value in effect comes from (a chip:
// the environment, or changed here), the value, and what it does. A value
// changed here lives in the free Key Value store, which can be emptied on a
// restart — the row then falls back to the environment's value, so a changed
// row also says what that value is. The API tells the two apart
// (GET /api/admin/config → sources, envValues).
//
// Writes go through PUT /api/admin/config one key at a time, so a half-typed
// value in another row is never written. The two that move money are
// confirmed: the commission in a second step that spells out what changes,
// the bank environment by typing its name. With the store unreachable nothing
// can be written and every Change button is off.
//
// The reserved-subdomain list is read-only and comes from the server
// (TenantService.RESERVED): an admin asking "why can't a store be called
// `billing`?" has nowhere else to look.
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminApi, handleApiError } from '../utils/api';
import { adminConfigQuery } from '../core/query/adminQueries';
import { useAdminTokens } from './adminTokens';
import { useDevice } from '../contexts/DeviceContext';
import { useAdminHead } from './adminHead';
import { Failed } from './AdminUI';
import {
  Alert, Dialog, DialogPoint, Glyph, KitBtn, KitChip, List, Mono, RowIcon, SourceChip, Switch,
} from './AdminKit';
import { ConfigSkeleton } from './AdminSkeletons';

// The environment variable behind each value, as application.yml names it.
const ENV_VARS = {
  serviceFeeRate: 'PLATFORM_SERVICE_FEE_RATE',
  bogEnv: 'BOG_ENV',
  publicBaseUrl: 'APP_PUBLIC_BASE_URL',
  designEnabled: 'APP_DESIGN_ENABLED',
  bogAuthUrl: 'BOG_AUTH_URL',
  bogBaseUrl: 'BOG_BASE_URL',
};

const URL_FIELDS = ['publicBaseUrl'];
const ADVANCED = ['bogAuthUrl', 'bogBaseUrl'];
const MAX_FEE_PERCENT = 10;

const ka = (lang) => String(lang || '').startsWith('ka');

/** A rate (0.025) as the design writes the percentage: "2,5" in Georgian, "2.5" in English. */
function pctText(rate, lang) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return '';
  const p = String(Math.round(n * 10000) / 100);
  return ka(lang) ? p.replace('.', ',') : p;
}

/** "2,5" / "2.5" → 0.025, or null when it is not a percentage the platform takes. */
function parsePct(text) {
  const s = String(text || '').trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return null;
  const p = Number(s);
  if (!Number.isFinite(p) || p < 0 || p > MAX_FEE_PERCENT) return null;
  return Math.round(p * 100) / 10000;
}

/** One value: name and source chip, the value, the environment's value under an override, what it does. */
function ValueRow({ T, phone, name, source, value, envNote, desc, action, tint, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: tint ? 'stretch' : 'center', flexDirection: tint ? 'column' : 'row',
      gap: tint ? 10 : 12, padding: 16, minHeight: 56, boxSizing: 'border-box',
      borderBottom: `1px solid ${T.border}`,
      background: tint ? `color-mix(in oklab, ${T.accent} 7%, ${T.surface})` : 'transparent',
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{
          display: 'flex', gap: phone ? 6 : 8, minWidth: 0,
          flexDirection: phone ? 'column' : 'row', alignItems: phone ? 'flex-start' : 'center',
        }}>
          <b style={{ font: `700 12.5px/1.4 ${T.font}`, color: T.text }}>{name}</b>
          {source}
        </div>
        {value != null && (
          <span style={{ font: `600 13px/1.45 ${T.mono}`, color: T.text, overflowWrap: 'anywhere' }}>{value}</span>
        )}
        {envNote && <span style={{ font: `500 12px/1.45 ${T.font}`, color: T.textDim }}>{envNote}</span>}
        {desc && <span style={{ font: `500 12px/1.45 ${T.font}`, color: T.textDim }}>{desc}</span>}
      </div>
      {children}
      {action}
    </div>
  );
}

export default function AdminConfig() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;
  const { isMobile, isDesktop } = useDevice();

  const [editing, setEditing] = useState(null);   // a field name, while its row is open
  const [draft, setDraft] = useState('');
  const [touched, setTouched] = useState(false);
  const [dialog, setDialog] = useState(null);     // 'fee' | 'bank'
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState('');            // the field being written
  const [rowError, setRowError] = useState({});
  const [advanced, setAdvanced] = useState(false);
  const later = useRef(null);

  // The values from the query cache. An open row's draft is its own state,
  // filled from them when the row is opened, so a read that lands while
  // someone is typing never changes what they typed.
  const config = useQuery(adminConfigQuery());
  const { refetch } = config;
  const data = config.data ?? null;

  useEffect(() => () => clearTimeout(later.current), []);

  /**
   * Write one key, then read back what is in effect. This server's own cache
   * forgets the key on write, so the first read is current; a second read a
   * little later catches any other instance whose cache had not expired.
   * The first read is the one every write sets off (core/query/client.js):
   * waiting for it, rather than starting another, keeps one request.
   */
  const write = async (field, value) => {
    setBusy(field);
    setRowError((p) => ({ ...p, [field]: '' }));
    try {
      await adminApi.updateConfig({ [field]: value });
      await refetch({ cancelRefetch: false });
      clearTimeout(later.current);
      later.current = setTimeout(() => { refetch(); }, 2500);
      return true;
    } catch (e) {
      setRowError((p) => ({ ...p, [field]: handleApiError(e, t('config.saveFailed')) }));
      return false;
    } finally {
      setBusy('');
    }
  };

  const open = (field, start) => {
    setEditing(field);
    setDraft(start);
    setTouched(false);
    setRowError((p) => ({ ...p, [field]: '' }));
  };
  const close = () => { setEditing(null); setDialog(null); setTyped(''); };

  // Before the store answers, the line says nothing rather than guess.
  useAdminHead({
    title: t('config.title'),
    sub: data ? (data.storeReady ? t('config.sub') : t('config.subOffline')) : '',
  });

  // A retry after a failure draws the skeleton again, as the first load did.
  if (config.isPending || (config.isError && !data && config.isFetching)) return <ConfigSkeleton />;
  if (config.isError && !data) {
    return <Failed T={T} message={handleApiError(config.error, t('config.loadFailed'))} onRetry={() => refetch()} />;
  }

  const ready = !!data?.storeReady;
  const sources = data?.sources || {};
  const envValues = data?.envValues || {};
  const reserved = Array.isArray(data?.reservedSubdomains) ? data.reservedSubdomains : [];
  const mono = <Mono T={T} />;
  const unset = t('config.unset');
  const shown = (v) => (v === '' || v == null ? unset : String(v));

  // "In the environment (BOG_ENV): sandbox" — only under a value changed here.
  const envNote = (field) => (sources[field] === 'override' ? (
    <Trans
      t={t}
      i18nKey="config.envNote"
      values={{ name: ENV_VARS[field], value: shown(envValues[field]) }}
      components={{ mono }}
    />
  ) : null);

  const change = (onClick, kind = 'ghost') => (
    <KitBtn T={T} kind={kind} size="sm" disabled={!ready || !!busy} onClick={onClick} style={isMobile ? { height: 40 } : undefined}>
      {t('config.change')}
    </KitBtn>
  );

  const errorLine = (field) => (rowError[field] ? (
    <span role="alert" style={{ font: `500 12px/1.45 ${T.font}`, color: T.dangerFg }}>{rowError[field]}</span>
  ) : null);

  // ── The commission ──────────────────────────────────────────────────────
  const rate = data?.serviceFeeRate;
  const feeTo = parsePct(draft);
  const feeBad = touched && feeTo == null;
  const feeRow = editing === 'serviceFeeRate' ? (
    <ValueRow
      T={T}
      phone={isMobile}
      tint
      name={t('config.name.serviceFeeRate')}
      source={<KitChip T={T} tone="info">{t('config.editing')}</KitChip>}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={{
          display: 'flex', alignItems: 'center', height: 50, borderRadius: 12, overflow: 'hidden',
          background: T.surface, border: `1.5px solid ${feeBad ? T.danger : T.accent}`,
          boxShadow: feeBad ? 'none' : `0 0 0 4px color-mix(in oklab, ${T.accent} 18%, transparent)`,
        }}>
          <input
            value={draft}
            inputMode="decimal"
            autoFocus
            aria-label={t('config.feeInputLabel')}
            aria-invalid={feeBad || undefined}
            onChange={(e) => { setDraft(e.target.value); setTouched(true); }}
            style={{
              flex: 1, minWidth: 0, height: '100%', border: 'none', background: 'transparent', outline: 'none',
              padding: '0 4px 0 15px', color: T.text, font: `500 15px ${T.font}`, fontVariantNumeric: 'tabular-nums',
            }}
          />
          <span style={{ padding: '0 14px', color: T.textDim, font: `500 15px ${T.font}` }}>%</span>
        </span>
      </label>
      <span style={{ font: `500 12px/1.5 ${T.font}`, color: feeBad ? T.dangerFg : T.textDim }}>
        {feeBad
          ? t('config.feeInvalid', { max: MAX_FEE_PERCENT })
          : t('config.feeHint', {
            from: `${pctText(rate, lang)}%`,
            to: feeTo == null ? '…' : `${pctText(feeTo, lang)}%`,
            max: MAX_FEE_PERCENT,
          })}
      </span>
      {errorLine('serviceFeeRate')}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <KitBtn T={T} size="sm" onClick={close}>{t('ui.cancel')}</KitBtn>
        <KitBtn
          T={T}
          kind="primary"
          size="sm"
          disabled={feeTo == null || Number(feeTo) === Number(rate)}
          onClick={() => { setTouched(true); if (feeTo != null) setDialog('fee'); }}
        >
          {t('config.continue')}
        </KitBtn>
      </div>
    </ValueRow>
  ) : (
    <ValueRow
      T={T}
      phone={isMobile}
      name={t('config.name.serviceFeeRate')}
      source={<SourceChip T={T} source={sources.serviceFeeRate} />}
      value={rate == null ? unset : (
        <>{String(rate)} <span style={{ color: T.textDim, fontWeight: 400 }}>· {pctText(rate, lang)}%</span></>
      )}
      envNote={envNote('serviceFeeRate')}
      desc={(
        <>
          {t('config.desc.serviceFeeRate')}
          {errorLine('serviceFeeRate') && <><br />{errorLine('serviceFeeRate')}</>}
        </>
      )}
      action={change(() => open('serviceFeeRate', pctText(rate, lang)))}
    />
  );

  // ── The bank environment ────────────────────────────────────────────────
  const bank = String(data?.bogEnv || '');
  const bankTo = bank === 'live' ? 'sandbox' : 'live';
  const bankRow = (
    <ValueRow
      T={T}
      phone={isMobile}
      name={t('config.name.bogEnv')}
      source={<SourceChip T={T} source={sources.bogEnv} />}
      value={shown(bank)}
      envNote={envNote('bogEnv')}
      desc={(
        <>
          {!ready && bank === 'sandbox' ? t('config.bankDescOffline')
            : bank === 'live' ? t('config.bankDescLive') : t('config.bankDescSandbox')}
          {errorLine('bogEnv') && <><br />{errorLine('bogEnv')}</>}
        </>
      )}
      action={change(() => { setTyped(''); setDialog('bank'); }, 'soft')}
    />
  );

  // ── Addresses (the public one, and the two advanced bank ones) ──────────
  const urlRow = (field) => {
    const value = data?.[field];
    if (editing === field) {
      const v = draft.trim();
      const bad = touched && v !== '' && !/^https?:\/\//.test(v);
      return (
        <ValueRow
          key={field}
          T={T}
          phone={isMobile}
          tint
          name={t(`config.name.${field}`)}
          source={<KitChip T={T} tone="info">{t('config.editing')}</KitChip>}
        >
          <input
            value={draft}
            autoFocus
            inputMode="url"
            spellCheck={false}
            aria-label={t(`config.name.${field}`)}
            aria-invalid={bad || undefined}
            placeholder={t('config.blankDerives')}
            onChange={(e) => { setDraft(e.target.value); setTouched(true); }}
            style={{
              width: '100%', boxSizing: 'border-box', height: 50, padding: '0 15px', borderRadius: 12,
              background: T.surface, color: T.text, font: `500 14px ${T.mono}`, outline: 'none',
              border: `1.5px solid ${bad ? T.danger : T.accent}`,
            }}
          />
          <span style={{ font: `500 12px/1.5 ${T.font}`, color: bad ? T.dangerFg : T.textDim }}>
            {bad ? t('config.urlInvalid') : t('config.urlHint')}
          </span>
          {errorLine(field)}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <KitBtn T={T} size="sm" disabled={busy === field} onClick={close}>{t('ui.cancel')}</KitBtn>
            <KitBtn
              T={T}
              kind="primary"
              size="sm"
              disabled={bad || busy === field}
              onClick={async () => { if (await write(field, v)) close(); }}
            >
              {busy === field ? t('ui.working') : t('config.save')}
            </KitBtn>
          </div>
        </ValueRow>
      );
    }
    return (
      <ValueRow
        key={field}
        T={T}
        phone={isMobile}
        name={t(`config.name.${field}`)}
        source={<SourceChip T={T} source={sources[field]} />}
        value={shown(value)}
        envNote={envNote(field)}
        desc={(
          <>
            {t(`config.desc.${field}`)}
            {errorLine(field) && <><br />{errorLine(field)}</>}
          </>
        )}
        action={change(() => open(field, value || ''))}
      />
    );
  };

  // ── The store design switch ─────────────────────────────────────────────
  const designOn = !!data?.designEnabled;
  const designRow = (
    <ValueRow
      T={T}
      phone={isMobile}
      name={t('config.name.designEnabled')}
      source={<SourceChip T={T} source={sources.designEnabled} />}
      value={designOn ? t('config.on') : t('config.off')}
      envNote={envNote('designEnabled')}
      desc={(
        <>
          {t('config.desc.designEnabled')}
          {errorLine('designEnabled') && <><br />{errorLine('designEnabled')}</>}
        </>
      )}
      action={(
        <Switch
          T={T}
          on={designOn}
          disabled={!ready || !!busy}
          label={t('config.name.designEnabled')}
          onChange={(on) => write('designEnabled', String(on))}
        />
      )}
    />
  );

  const list = (
    <List T={T}>
      {feeRow}
      {bankRow}
      {URL_FIELDS.map(urlRow)}
      {designRow}
      <button
        type="button"
        aria-expanded={advanced}
        onClick={() => setAdvanced((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', minHeight: 56,
          border: 'none', borderBottom: advanced ? `1px solid ${T.border}` : 'none', background: 'transparent',
          color: T.text, textAlign: 'left', cursor: 'pointer',
        }}
      >
        <RowIcon T={T} name="sliders" />
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}` }}>{t('config.advancedTitle')}</b>
          <span style={{ display: 'block', font: `500 12px/1.45 ${T.font}`, color: T.textDim, marginTop: 2 }}>
            {t('config.advancedSub')}
          </span>
        </span>
        <Glyph name="chevD" style={{ transform: advanced ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }} />
      </button>
      {advanced && ADVANCED.map(urlRow)}
    </List>
  );

  const side = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <b style={{ font: `600 16px/1.3 ${T.font}`, color: T.text }}>{t('config.reservedTitle')}</b>
          <KitChip T={T}>{String(reserved.length)}</KitChip>
        </div>
        <p style={{ margin: 0, font: `500 12px/1.5 ${T.font}`, color: T.textDim }}>{t('config.reservedSub')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {reserved.map((s) => (
            <span key={s} style={{
              font: `500 12px ${T.mono}`, padding: '3px 8px', borderRadius: 7, background: T.surface2, color: T.text,
            }}>
              {s}
            </span>
          ))}
          {reserved.length === 0 && (
            <span style={{ font: `500 12px ${T.font}`, color: T.textDim }}>{t('config.reservedEmpty')}</span>
          )}
        </div>
      </div>
      <Alert T={T} tone="warn" icon="db">{t('config.volatile')}</Alert>
    </div>
  );

  // ── Dialogs ─────────────────────────────────────────────────────────────
  // Kept mounted with `open`, so each one animates out as well as in.
  const big = { font: `700 20px ${T.mono}`, fontVariantNumeric: 'tabular-nums' };
  const feeDialog = (
    <Dialog
      T={T}
      phone={isMobile}
      open={dialog === 'fee' && feeTo != null}
      title={t('config.feeDialogTitle')}
      onClose={() => setDialog(null)}
      busy={busy === 'serviceFeeRate'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '4px 0' }}>
        <span style={{ ...big, color: T.textDim }}>{pctText(rate, lang)}%</span>
        <span style={{ color: T.textDim }}>→</span>
        <span style={{ ...big, color: T.text }}>{pctText(feeTo, lang)}%</span>
      </div>
      <List T={T}>
        <DialogPoint T={T} first icon="store">{t('config.feePointNew')}</DialogPoint>
        <DialogPoint T={T} icon="receipt">{t('config.feePointOld')}</DialogPoint>
        <DialogPoint T={T} icon="db">
          <Trans t={t} i18nKey="config.feePointEnv" values={{ line: `PLATFORM_SERVICE_FEE_RATE=${feeTo}` }} components={{ mono }} />
        </DialogPoint>
      </List>
      {errorLine('serviceFeeRate')}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <KitBtn T={T} disabled={busy === 'serviceFeeRate'} onClick={() => setDialog(null)}>{t('ui.cancel')}</KitBtn>
        <KitBtn
          T={T}
          kind="primary"
          disabled={busy === 'serviceFeeRate'}
          style={{ flex: isMobile ? '1 1 0' : 'none' }}
          onClick={async () => { if (await write('serviceFeeRate', String(feeTo))) close(); }}
        >
          {busy === 'serviceFeeRate' ? t('ui.working') : t('config.feeConfirm', { to: `${pctText(feeTo, lang)}%` })}
        </KitBtn>
      </div>
    </Dialog>
  );

  const typedOk = typed.trim().toLowerCase() === bank;
  const bankDialog = (
    <Dialog
      T={T}
      phone={isMobile}
      open={dialog === 'bank'}
      title={t('config.bankDialogTitle')}
      onClose={() => setDialog(null)}
      busy={busy === 'bogEnv'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '4px 0' }}>
        <span style={{ ...big, color: T.text }}>{shown(bank)}</span>
        <span style={{ color: T.textDim }}>→</span>
        <span style={{ ...big, color: bankTo === 'sandbox' ? T.dangerFg : T.text }}>{bankTo}</span>
      </div>
      <List T={T}>
        <DialogPoint T={T} first icon="card" tone={bankTo === 'sandbox' ? T.dangerFg : undefined}>
          {bankTo === 'sandbox' ? t('config.bankPointSandbox') : t('config.bankPointLive')}
        </DialogPoint>
        <DialogPoint T={T} icon="clock">{t('config.bankPointNow')}</DialogPoint>
      </List>
      {/* The name of the environment being left, typed out — the design's guard. */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 7, font: `500 12.5px ${T.font}`, color: T.textDim }}>
        <span>
          <Trans
            t={t}
            i18nKey="config.bankTypeLabel"
            values={{ word: bank }}
            components={{ mono: <Mono T={T} style={{ color: T.text, fontWeight: 700 }} /> }}
          />
        </span>
        <input
          value={typed}
          autoFocus
          spellCheck={false}
          autoCapitalize="none"
          placeholder={bank}
          onChange={(e) => setTyped(e.target.value)}
          style={{
            height: 50, padding: '0 15px', borderRadius: 12, boxSizing: 'border-box', background: T.surface,
            border: `1.5px solid ${T.accent}`, color: T.text, font: `500 15px ${T.mono}`, outline: 'none',
            boxShadow: `0 0 0 4px color-mix(in oklab, ${T.accent} 18%, transparent)`,
          }}
        />
      </label>
      {errorLine('bogEnv')}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <KitBtn T={T} disabled={busy === 'bogEnv'} onClick={() => setDialog(null)}>{t('ui.cancel')}</KitBtn>
        <KitBtn
          T={T}
          kind="danger"
          disabled={!typedOk || busy === 'bogEnv'}
          style={{ flex: isMobile ? '1 1 0' : 'none' }}
          onClick={async () => { if (await write('bogEnv', bankTo)) close(); }}
        >
          {busy === 'bogEnv' ? t('ui.working') : t('config.bankConfirm')}
        </KitBtn>
      </div>
    </Dialog>
  );

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>
        {/* The service name never breaks across lines, as the design sets it. */}
        {ready ? (
          <Alert T={T} tone="ok">
            <Trans t={t} i18nKey="config.storeConnected" components={{ mono: <Mono T={T} style={{ whiteSpace: 'nowrap' }} /> }} />
          </Alert>
        ) : (
          <Alert T={T} tone="bad" title={t('config.storeOffline')}>
            <Trans
              t={t}
              i18nKey="config.storeOfflineHint"
              values={{ bank: shown(bank) }}
              components={{ mono: <Mono T={T} style={{ whiteSpace: 'nowrap' }} /> }}
            />
          </Alert>
        )}

        <div style={{
          display: 'grid', gap: isMobile ? 14 : 20, alignItems: 'start',
          gridTemplateColumns: isDesktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
        }}>
          {list}
          {side}
        </div>
      </div>

      {feeDialog}
      {bankDialog}
    </div>
  );
}
