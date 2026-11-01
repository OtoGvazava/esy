// The settings tabs that edit the store itself (PUT /api/tenant/current):
// Shop (Z1), Brand (Z2) and card payments (Z7).
//
// That endpoint replaces every branding field it is sent, so each tab sends
// the whole store: what the tab changed, over what the store already has.
// A tab that sent only its own fields would blank the others. The Bank of
// Georgia keys are the exception, sent only from the payments tab (their
// absence leaves the stored keys alone, a blank id disconnects).
//
// Not drawn, because the store has nothing behind them: Z1's "accepting
// orders" switch and its temporary closure dates (no such fields, and
// checkout has no rule to honour them), and Z7's "check" of the keys (they
// are stored as given; the bank is first asked when a shopper pays).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../contexts/TenantContext';
import { tenantApi, handleApiError } from '../utils/api';
import { money, FEE_PERCENT } from '../core/money';
import { Alert, BxIcon, Fld, SaveBar, Select, initialsOf, useBx } from './officeKit';

// Server-allowed store categories (mirrors TenantService.CATEGORIES).
const CATEGORIES = ['fashion', 'electronics', 'home', 'food', 'art', 'sport', 'wear'];
// Mirrors TenantService.TAGLINE_MAX: the field stops at the length the server keeps.
const TAGLINE_MAX = 160;
// ImageUpload's rules on the server, checked first so a wrong file is refused before it is sent.
const IMAGE_MAX = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const fromTenant = (tn) => ({
  displayName: tn.displayName || tn.name || '',
  description: tn.description || '',
  tagline: tn.tagline || '',
  logoUrl: tn.logoUrl || '',
  category: tn.category || '',
  primaryColor: tn.primaryColor || '#6366f1',
  secondaryColor: tn.secondaryColor || '#8b5cf6',
  addressStreet: tn.addressStreet || '',
  addressCity: tn.addressCity || '',
  addressCountry: tn.addressCountry || '',
  addressPostalCode: tn.addressPostalCode || '',
  establishedYear: tn.establishedYear ? String(tn.establishedYear) : '',
});

/**
 * One tab's edits over the store as the server has it. `save(extra)` sends
 * the whole store with the edits in, plus `extra` (the payment keys).
 */
function useStoreForm() {
  const { t } = useTranslation('manager');
  const { tenant, refresh } = useTenant();
  const [params] = useSearchParams();
  const sub = params.get('tenant') || undefined;
  const base = useMemo(() => (tenant ? fromTenant(tenant) : null), [tenant]);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const form = base ? { ...base, ...edits } : null;
  const dirty = !!base && Object.keys(edits).some((k) => edits[k] !== base[k]);
  const set = (key) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setSaved(false);
    setEdits((p) => ({ ...p, [key]: v }));
  };
  const cancel = () => { setEdits({}); setError(''); };

  const save = async (extra = {}) => {
    if (!form || busy) return false;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const payload = {};
      Object.keys(form).forEach((k) => { payload[k] = typeof form[k] === 'string' ? form[k].trim() : form[k]; });
      await tenantApi.update({ ...payload, ...extra }, sub);
      await refresh();
      setEdits({});
      setSaved(true);
      return true;
    } catch (e) {
      setError(handleApiError(e, t('settingsTabs.saveFailed')));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { tenant, sub, form, set, dirty, busy, error, saved, save, cancel, refresh };
}

function Loading() {
  const { t } = useTranslation('manager');
  return <div className="bx-sm bx-dim">{t('settingsTabs.loading')}</div>;
}

// ---------------------------------------------------------------- Z1 Shop

export function ShopTab() {
  const { t } = useTranslation('manager');
  const { t: tOwner } = useTranslation('owner');
  const f = useStoreForm();
  const bx = useBx();
  if (!f.form) return <Loading />;
  const { form, set } = f;
  const known = CATEGORIES.includes(form.category);

  return (
    <>
      {f.error && <Alert tone="bad" icon="warn"><span className="bx-sm">{f.error}</span></Alert>}
      <div className="bx-two">
        <div className="bx-stk" style={{ gap: 16 }}>
          <div className="bx-card bx-pad bx-stk" style={{ gap: 14 }}>
            <Fld label={t('settingsTabs.shop.name')}>
              <input className="bx-in" value={form.displayName} onChange={set('displayName')} />
            </Fld>
            {/* One line, and the store's header gives it one line; the field
                stops where the server would cut. */}
            <Fld label={t('settingsTabs.shop.tagline')}>
              <input className="bx-in" value={form.tagline} onChange={set('tagline')} maxLength={TAGLINE_MAX} />
            </Fld>
            <Fld label={t('settingsTabs.shop.description')}>
              <textarea className="bx-in" value={form.description} onChange={set('description')} rows={3} />
            </Fld>
            <div className="bx-row" style={bx === 'ph' ? { flexDirection: 'column', alignItems: 'stretch', gap: 14 } : { gap: 12, alignItems: 'flex-start' }}>
              <Fld label={t('settingsTabs.shop.category')} className="bx-grow">
                <Select value={form.category} onChange={set('category')}>
                  <option value="">{t('settingsTabs.shop.noCategory')}</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{tOwner(`cat_${c}`)}</option>)}
                  {form.category && !known && <option value={form.category}>{form.category}</option>}
                </Select>
              </Fld>
              <Fld label={t('settingsTabs.shop.established')} style={bx === 'ph' ? undefined : { width: 140, flex: 'none' }}>
                <input
                  className="bx-in" inputMode="numeric" maxLength={4} placeholder={t('settingsTabs.shop.yearPlaceholder')}
                  value={form.establishedYear} onChange={(e) => set('establishedYear')(e.target.value.replace(/\D/g, ''))}
                />
              </Fld>
            </div>
          </div>
        </div>
      </div>
      <SaveBar t={t} dirty={f.dirty} busy={f.busy} saved={f.saved} onSave={() => f.save()} onCancel={f.cancel} />
    </>
  );
}

// --------------------------------------------------------------- Z2 Brand

/** The logo: saved the moment it is chosen or removed, like the cover. */
function LogoCard({ store, sub, refresh }) {
  const { t } = useTranslation('manager');
  const input = useRef(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const url = store.logoUrl;

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    if (file.type && !IMAGE_TYPES.includes(file.type)) { setError(t('settingsTabs.brand.logoBadType')); return; }
    if (file.size > IMAGE_MAX) { setError(t('settingsTabs.brand.logoTooLarge')); return; }
    setBusy('upload');
    setError('');
    try {
      await tenantApi.uploadLogo(file, sub);
      await refresh();
    } catch (err) {
      setError(handleApiError(err, t('settingsTabs.brand.logoFailed')));
    } finally {
      setBusy('');
    }
  };
  const remove = async () => {
    if (busy) return;
    setBusy('remove');
    setError('');
    try {
      await tenantApi.deleteLogo(sub);
      await refresh();
    } catch (err) {
      setError(handleApiError(err, t('settingsTabs.brand.logoFailed')));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="bx-card bx-pad bx-stk" style={{ gap: 12 }}>
      <b className="bx-h3">{t('settingsTabs.brand.logo')}</b>
      <div className="bx-row" style={{ gap: 16 }}>
        <span className="bx-av lg" style={{ borderRadius: 22 }} aria-hidden="true">
          {url ? <img src={url} alt="" /> : initialsOf(store.displayName || store.name, store.subdomain)}
        </span>
        <div className="bx-stk" style={{ gap: 6 }}>
          <span className="bx-xs bx-dim">{t('settingsTabs.brand.logoHint')}</span>
          <div className="bx-row bx-wrap" style={{ gap: 8 }}>
            <input ref={input} type="file" accept={IMAGE_TYPES.join(',')} onChange={pick} hidden />
            <button type="button" className="bx-btn bx-btn-s bx-btn-sm" disabled={!!busy} onClick={() => input.current?.click()}>
              <BxIcon name="upload" />
              {busy === 'upload' ? t('settingsTabs.brand.uploading') : url ? t('settingsTabs.brand.change') : t('settingsTabs.brand.upload')}
            </button>
            {url && (
              <button type="button" className="bx-btn bx-btn-g bx-btn-sm" disabled={!!busy} onClick={remove}>
                {busy === 'remove' ? t('settingsTabs.brand.removing') : t('settingsTabs.brand.remove')}
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <span className="bx-errt" role="alert">{error}</span>}
    </div>
  );
}

/**
 * The cover photo, on the endpoints and copy the Design tab's cover section
 * uses (DesignSections): saved at once, not in the design draft. With a
 * photo, its preview and the logo's two actions; without, the kit's drop zone.
 */
function CoverCard({ store, sub, refresh }) {
  const { t } = useTranslation('manager');
  const { t: tDesign } = useTranslation('design');
  const bx = useBx();
  const input = useRef(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const url = store.coverUrl || null;

  const fail = (e, fallback) => {
    if (e?.status === 413) return tDesign('editor.cover.tooLarge');
    if (e?.status === 415) return tDesign('editor.cover.badType');
    return handleApiError(e, tDesign(fallback));
  };
  const upload = async (file) => {
    if (!file || busy) return;
    if (file.type && !IMAGE_TYPES.includes(file.type)) { setError(tDesign('editor.cover.badType')); return; }
    if (file.size > IMAGE_MAX) { setError(tDesign('editor.cover.tooLarge')); return; }
    setBusy('upload');
    setError('');
    try {
      await tenantApi.uploadCover(file, sub);
      await refresh();
    } catch (e) {
      setError(fail(e, 'editor.cover.failed'));
    } finally {
      setBusy('');
    }
  };
  const remove = async () => {
    if (busy) return;
    setBusy('remove');
    setError('');
    try {
      await tenantApi.deleteCover(sub);
      await refresh();
    } catch (e) {
      setError(fail(e, 'editor.cover.removeFailed'));
    } finally {
      setBusy('');
    }
  };
  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again
    upload(file);
  };
  const fileInput = (
    <input
      ref={input} type="file" accept={IMAGE_TYPES.join(',')} aria-label={tDesign('editor.cover.title')}
      onChange={onFile} disabled={!!busy}
      style={{ position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden' }}
    />
  );

  return (
    <div className="bx-card bx-pad bx-stk" style={{ gap: 12 }}>
      <b className="bx-h3">{tDesign('editor.cover.title')}</b>
      {url ? (
        <>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--k-r-in)', background: 'var(--k-sf2)', aspectRatio: '16 / 5', minHeight: 90 }}>
            <img src={url} alt={tDesign('editor.cover.current')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div className="bx-row bx-wrap" style={{ gap: 8, position: 'relative' }}>
            {fileInput}
            <button type="button" className="bx-btn bx-btn-s bx-btn-sm" disabled={!!busy} onClick={() => input.current?.click()}>
              <BxIcon name="upload" />{busy === 'upload' ? tDesign('editor.cover.uploading') : tDesign('editor.cover.change')}
            </button>
            <button type="button" className="bx-btn bx-btn-g bx-btn-sm" disabled={!!busy} onClick={remove}>
              {busy === 'remove' ? tDesign('editor.cover.removing') : tDesign('editor.cover.remove')}
            </button>
          </div>
        </>
      ) : (
        <label
          className={`bx-dz${drag ? ' drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); if (!drag) setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer?.files?.[0]); }}
        >
          <BxIcon name="image" size="l" />
          <b style={{ color: 'var(--k-fg)' }}>
            {busy === 'upload' ? tDesign('editor.cover.uploading') : bx === 'ph' ? tDesign('editor.cover.choose') : tDesign('editor.cover.drop')}
          </b>
          <span className="bx-xs">{t('settingsTabs.brand.coverWhere')}</span>
          {fileInput}
        </label>
      )}
      {error && <span className="bx-errt" role="alert">{error}</span>}
    </div>
  );
}

/** A colour: the kit's 44px swatch over the native picker, and its hex. */
function Colour({ label, value, onChange }) {
  return (
    <Fld label={label}>
      <span className="bx-row" style={{ gap: 12 }}>
        <span style={{ position: 'relative', width: 44, height: 44, borderRadius: 12, background: value, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)', flex: 'none' }}>
          <input
            type="color" value={value} onChange={onChange} aria-label={label}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 0, padding: 0, cursor: 'pointer' }}
          />
        </span>
        <span className="bx-mono" style={{ color: 'var(--k-fg)' }}>{String(value).toUpperCase()}</span>
      </span>
    </Fld>
  );
}

export function BrandTab() {
  const { t } = useTranslation('manager');
  const f = useStoreForm();
  const bx = useBx();
  if (!f.form || !f.tenant) return <Loading />;
  const { form, set } = f;
  const q = f.sub ? `?tenant=${encodeURIComponent(f.sub)}` : '';
  const georgia = t('settingsTabs.brand.georgia');
  const countries = [georgia, form.addressCountry].filter((c, i, all) => c && all.indexOf(c) === i);

  return (
    <>
      {f.error && <Alert tone="bad" icon="warn"><span className="bx-sm">{f.error}</span></Alert>}
      <div className="bx-two even">
        <div className="bx-stk" style={{ gap: 16 }}>
          <LogoCard store={f.tenant} sub={f.sub} refresh={f.refresh} />
          <CoverCard store={f.tenant} sub={f.sub} refresh={f.refresh} />
          {/* The theme moved to the Design tab. The colour has not: that tab
              has no colour control yet and sends owners here for it. */}
          <Alert icon="palette">
            <span className="bx-sm">{t('settingsTabs.brand.themeMoved')}</span>
            <Link to={`/settings/design${q}`} className="bx-link bx-sm" style={{ alignSelf: 'flex-start' }}>{t('settingsTabs.brand.toDesign')}</Link>
          </Alert>
        </div>
        <div className="bx-stk" style={{ gap: 16 }}>
          <div className="bx-card bx-pad bx-stk" style={{ gap: 12 }}>
            <b className="bx-h3">{t('settingsTabs.brand.address')}</b>
            <Fld label={t('settingsTabs.brand.street')}>
              <input className="bx-in" value={form.addressStreet} onChange={set('addressStreet')} />
            </Fld>
            <div className="bx-row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <Fld label={t('settingsTabs.brand.city')} className="bx-grow">
                <input className="bx-in" value={form.addressCity} onChange={set('addressCity')} />
              </Fld>
              <Fld label={t('settingsTabs.brand.postal')} style={{ width: bx === 'ph' ? 120 : 140, flex: 'none' }}>
                <input className="bx-in" value={form.addressPostalCode} onChange={set('addressPostalCode')} inputMode="numeric" />
              </Fld>
            </div>
            <Fld label={t('settingsTabs.brand.country')}>
              <Select value={form.addressCountry} onChange={set('addressCountry')}>
                <option value="">{t('settingsTabs.brand.noCountry')}</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Fld>
            <p className="bx-hint">{t('settingsTabs.brand.addressWhere')}</p>
          </div>
          <div className="bx-card bx-pad bx-stk" style={{ gap: 12 }}>
            <b className="bx-h3">{t('settingsTabs.brand.colours')}</b>
            <div className="bx-row bx-wrap" style={{ gap: 24, alignItems: 'flex-start' }}>
              <Colour label={t('settingsTabs.brand.primary')} value={form.primaryColor} onChange={set('primaryColor')} />
              <Colour label={t('settingsTabs.brand.secondary')} value={form.secondaryColor} onChange={set('secondaryColor')} />
            </div>
          </div>
        </div>
      </div>
      <SaveBar t={t} dirty={f.dirty} busy={f.busy} saved={f.saved} onSave={() => f.save()} onCancel={f.cancel} />
    </>
  );
}

// ----------------------------------------------------------- Z7 Payments

/** When an order was placed, as the payments card reads it: "today 13:03" or "2 October". */
function when(t, placed) {
  const d = Array.isArray(placed)
    ? new Date(placed[0], (placed[1] || 1) - 1, placed[2] || 1, placed[3] || 0, placed[4] || 0)
    : new Date(placed);
  if (Number.isNaN(d.getTime())) return '';
  // Written out, not left to Intl: Chrome has no Georgian dates.
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return t('settingsTabs.pay.today', { time });
  return t('analytics.dayLong', { day: d.getDate(), month: t(`finances.month.${d.getMonth() + 1}`) });
}

function BogMark() {
  const { t } = useTranslation('manager');
  return (
    <span className="bx-av" role="img" aria-label={t('settingsTabs.pay.bank')} style={{ background: '#ff6a13', color: '#1a1a1a', borderRadius: 12 }}>
      {t('settingsTabs.pay.bogMark')}
    </span>
  );
}

function Steps({ title, steps, note }) {
  return (
    <div className="bx-card bx-padl bx-stk" style={{ gap: 12 }}>
      <b className="bx-h3">{title}</b>
      {steps.map((s, i) => (
        <div key={s} className="bx-row bx-sm" style={{ gap: 12, alignItems: 'flex-start' }}>
          <span className="bx-chip nd c-proc">{i + 1}</span>
          <span>{s}</span>
        </div>
      ))}
      <Alert icon="info"><span className="bx-sm">{note}</span></Alert>
    </div>
  );
}

export function PaymentsTab() {
  const { t } = useTranslation('manager');
  const f = useStoreForm();
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [editing, setEditing] = useState(false);
  const [last, setLast] = useState(undefined); // undefined while loading, null for none
  const on = !!f.tenant?.bogConfigured;

  // The latest card payment, from the store's own orders.
  useEffect(() => {
    if (!on) return undefined;
    let live = true;
    tenantApi.orders(f.sub)
      .then((rows) => {
        if (!live) return;
        const paid = (Array.isArray(rows) ? rows : []).filter((o) => String(o.paymentStatus).toLowerCase() === 'paid');
        setLast(paid[0] || null);
      })
      .catch(() => { if (live) setLast(null); });
    return () => { live = false; };
  }, [on, f.sub]);

  if (!f.form || !f.tenant) return <Loading />;

  const connect = async () => {
    const ok = await f.save({ bogClientId: clientId.trim(), bogClientSecret: secret.trim() });
    if (ok) { setClientId(''); setSecret(''); setEditing(false); }
  };
  const disconnect = async () => {
    if (!window.confirm(t('settingsTabs.pay.disconnectConfirm'))) return;
    await f.save({ bogClientId: '', bogClientSecret: '' });
  };
  const showForm = !on || editing;
  const chip = on
    ? { cls: 'bx-chip c-done', text: t('settingsTabs.pay.connected') }
    : { cls: 'bx-chip c-canc', text: t('settingsTabs.pay.off') };

  return (
    <>
      {f.error && <Alert tone="bad" icon="warn"><span className="bx-sm">{f.error}</span></Alert>}
      <div className="bx-two">
        <div className="bx-card bx-padl bx-stk" style={{ gap: 14 }}>
          <div className="bx-row" style={{ gap: 12 }}>
            <BogMark />
            <div className="bx-grow">
              <b>{t('settingsTabs.pay.title')}</b>
              <div className="bx-xs bx-dim">{t('settingsTabs.pay.methods')}</div>
            </div>
            <span className={`${chip.cls} bx-no-ph`}>{chip.text}</span>
          </div>
          <span className={`${chip.cls} bx-only-ph`} style={{ alignSelf: 'flex-start' }}>{chip.text}</span>

          {on && !editing && (
            <>
              <div className="bx-list">
                <div className="bx-li bx-kv bx-sm" style={{ padding: '10px 16px' }}>
                  <span className="bx-dim">{t('settingsTabs.pay.clientId')}</span>
                  <span className="bx-mono">{t('settingsTabs.pay.keptOnServer')}</span>
                </div>
                <div className="bx-li bx-kv bx-sm" style={{ padding: '10px 16px' }}>
                  <span className="bx-dim">{t('settingsTabs.pay.lastPayment')}</span>
                  <span>
                    {last === undefined ? '…'
                      : last ? `${when(t, last.placed)} · ${money(last.total)}`
                        : t('settingsTabs.pay.noPaymentYet')}
                  </span>
                </div>
                <div className="bx-li bx-kv bx-sm" style={{ padding: '10px 16px' }}>
                  <span className="bx-dim">{t('settingsTabs.pay.refunds')}</span>
                  <span>{t('settingsTabs.pay.refundsOwner')}</span>
                </div>
              </div>
              <div className="bx-row bx-wrap" style={{ gap: 10 }}>
                <button type="button" className="bx-btn bx-btn-g bx-btn-sm" disabled={f.busy} onClick={() => setEditing(true)}>{t('settingsTabs.pay.changeKey')}</button>
                <button type="button" className="bx-btn bx-btn-d bx-btn-sm" disabled={f.busy} onClick={disconnect}>{t('settingsTabs.pay.disconnect')}</button>
              </div>
            </>
          )}

          {showForm && (
            <>
              <p className="bx-sm bx-dim">{t('settingsTabs.pay.keysOwn')}</p>
              <Fld label={t('settingsTabs.pay.clientId')}>
                <input
                  className="bx-in bx-mono" value={clientId} autoComplete="off" spellCheck={false}
                  placeholder={on ? t('settingsTabs.pay.keptPlaceholder') : ''}
                  onChange={(e) => setClientId(e.target.value)}
                />
              </Fld>
              <Fld label={t('settingsTabs.pay.secret')}>
                <input
                  className="bx-in bx-mono" type="password" value={secret} autoComplete="new-password"
                  placeholder={on ? t('settingsTabs.pay.keptPlaceholder') : ''}
                  onChange={(e) => setSecret(e.target.value)}
                />
              </Fld>
              <p className="bx-hint">{t('settingsTabs.pay.secretHint')}</p>
              <div className="bx-row" style={{ gap: 10 }}>
                {editing && (
                  <button type="button" className="bx-btn bx-btn-g" disabled={f.busy} onClick={() => { setEditing(false); setClientId(''); setSecret(''); }}>
                    {t('settingsTabs.cancel')}
                  </button>
                )}
                <button
                  type="button" className="bx-btn bx-btn-p bx-btn-b"
                  disabled={f.busy || !clientId.trim() || (!on && !secret.trim())}
                  onClick={connect}
                >
                  {f.busy ? t('settingsTabs.saving') : t('settingsTabs.pay.connect')}
                </button>
              </div>
            </>
          )}
        </div>

        {on ? (
          <Steps
            title={t('settingsTabs.pay.howItWorks')}
            steps={[t('settingsTabs.pay.on1'), t('settingsTabs.pay.on2'), t('settingsTabs.pay.on3')]}
            note={t('settingsTabs.pay.onNote', { percent: FEE_PERCENT })}
          />
        ) : (
          <Steps
            title={t('settingsTabs.pay.howToTurnOn')}
            steps={[t('settingsTabs.pay.off1'), t('settingsTabs.pay.off2'), t('settingsTabs.pay.off3')]}
            note={t('settingsTabs.pay.offNote')}
          />
        )}
      </div>
    </>
  );
}
