// Settings → Delivery (the design's Z5): the store's four routes (D9), each
// a card with its switch and, while on, its price and promised time.
//
// The board has one save for the whole tab, so changes wait for it; the
// server still enforces its two rules per route (the last route cannot go
// off, express needs a courier). Save writes the routes being switched on
// first and the ones being switched off last, so a swap — pickup off,
// courier on — never trips the "last route" rule halfway through.
//
// Two departures from the board, both because of what a route is here:
// express is an upgrade on either courier (not "Tbilisi" only), and its
// second field is its promised time like every other route's — there is no
// order cut-off time to set, so the board's "orders until 15:00" is not drawn.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../contexts/TenantContext';
import { deliveryApi, handleApiError } from '../utils/api';
import { deliveryQuery } from '../core/query/managerQueries';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import { Alert, BxIcon, Fld, SaveBar, Switch } from './officeBx';
import { SkField, SkIn } from './officeSk';

const ICON = { pickup: 'pin', tbilisi: 'truck', express: 'clock', georgia: 'globe' };
// The currency sign after a price, as money() writes it.
const LARI = '₾';
// The board's two columns: pickup and the city courier, then express and the regions.
const COLUMNS = [['pickup', 'tbilisi'], ['express', 'georgia']];

const blank = (v) => (v === null || v === undefined ? '' : String(v));
/** A price as the owner typed it, with a comma read as the decimal point. */
const amount = (v) => String(v ?? '').trim().replace(',', '.');

export default function DeliveryTab() {
  const { t, i18n } = useTranslation('manager');
  const { t: tOwner } = useTranslation('owner');
  const { tenant } = useTenant();
  const [params] = useSearchParams();
  const sub = params.get('tenant') || undefined;
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  const etaKey = String(i18n.language || '').startsWith('ka') ? 'etaKa' : 'etaEn';

  // The routes as the server has them. What the owner types is kept apart
  // (edits), over them, so a read that lands while they type changes nothing
  // they typed.
  const qc = useQueryClient();
  const routes = useQuery(deliveryQuery());
  const rows = routes.data ?? (routes.isError ? [] : null);
  const setRows = (fn) => qc.setQueryData(deliveryQuery().queryKey, (prev) => (prev ? fn(prev) : prev));
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const error = saveError || (routes.isError ? handleApiError(routes.error, tOwner('delivery.loadFailed')) : '');
  const [saved, setSaved] = useState(false);

  // Without card payments a courier order is still taken, with payment
  // arranged by the store (checkout says so); the owner hears it here.
  const noCard = tenant && !tenant.bogConfigured && (
    <Alert tone="warn" icon="warn">
      <span className="bx-sm"><b>{t('settingsTabs.delivery.noCardLead')}</b> {t('settingsTabs.delivery.noCard')}</span>
      <Link to={`/settings/integrations${q}`} className="bx-link bx-sm" style={{ alignSelf: 'flex-start' }}>{t('settingsTabs.delivery.toPayments')}</Link>
    </Alert>
  );

  // The four route cards in the board's two columns, each with its switch,
  // until the routes are in; the save bar is already at the foot.
  if (!rows) {
    const cardSk = (on) => (
      <div className="bx-card bx-pad bx-stk" style={{ gap: 12 }}>
        <div className="bx-row" style={{ gap: 12 }}>
          <Sk w={34} h={34} r="var(--k-r-in)" />
          <b className="bx-grow"><SkIn w="40%" /></b>
          <Sk w={46} h={28} r={14} />
        </div>
        {on && (
          <div className="bx-row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <SkField className="bx-grow" />
            <SkField className="bx-grow" />
          </div>
        )}
      </div>
    );
    return (
      <>
        {noCard}
        <Skeleton label={t('settingsTabs.loading')} className="bx-two even">
          <div className="bx-stk" style={{ gap: 14 }}>{cardSk(true)}{cardSk(true)}</div>
          <div className="bx-stk" style={{ gap: 14 }}>{cardSk(false)}{cardSk(false)}</div>
        </Skeleton>
        <SaveBar t={t} dirty={false} busy={false} saved={false} onSave={() => {}} onCancel={() => {}} />
      </>
    );
  }

  const row = (route) => rows.find((r) => r.route === route);
  const original = (route, field) => {
    const r = row(route) || {};
    if (field === 'enabled') return !!r.enabled;
    if (field === 'price' || field === 'freeOverTotal') return r[field] === null || r[field] === undefined ? '' : String(Number(r[field]));
    return blank(r[field]);
  };
  const value = (route, field) => (edits[route] && field in edits[route] ? edits[route][field] : original(route, field));
  const setField = (route, field) => (v) => {
    const next = v && v.target ? v.target.value : v;
    setSaved(false);
    setEdits((p) => ({ ...p, [route]: { ...(p[route] || {}), [field]: next } }));
  };
  const changes = (route) => {
    const e = edits[route] || {};
    const out = {};
    Object.keys(e).forEach((f) => {
      const was = original(route, f);
      const now = e[f];
      const same = f === 'price' || f === 'freeOverTotal' ? amount(now) === amount(was) : f === 'enabled' ? now === was : String(now).trim() === String(was).trim();
      if (!same) out[f] = f === 'price' ? (amount(now) || '0') : f === 'freeOverTotal' ? amount(now) : f === 'enabled' ? now : String(now).trim();
    });
    return out;
  };
  const changed = rows.map((r) => r.route).filter((route) => Object.keys(changes(route)).length > 0);
  const dirty = changed.length > 0;

  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true);
    setSaveError('');
    setSaved(false);
    // Switched on first, switched off last; field edits in between.
    const rank = (route) => {
      const c = changes(route);
      if (c.enabled === true) return 0;
      if (c.enabled === false) return 2;
      return 1;
    };
    const order = [...changed].sort((a, b) => rank(a) - rank(b));
    let written = [];
    try {
      for (const route of order) {
        const updated = await deliveryApi.update(route, changes(route), sub);
        setRows((prev) => prev.map((r) => (r.route === route ? { ...r, ...updated } : r)));
        written = [...written, route];
      }
      setEdits({});
      setSaved(true);
    } catch (e) {
      // The refusal names the rule that was hit; what was already written
      // stays written, and the rest waits on screen for another try.
      setSaveError(handleApiError(e, tOwner('delivery.saveFailed')));
      setEdits((p) => {
        const next = { ...p };
        written.forEach((r) => { delete next[r]; });
        return next;
      });
      await routes.refetch();
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => { setEdits({}); setSaveError(''); };

  const money = (route, field, label, placeholder) => (
    <Fld label={label} className="bx-grow">
      <span className="bx-ingrp">
        <input
          inputMode="decimal" value={value(route, field)} placeholder={placeholder}
          onChange={setField(route, field)} aria-label={label}
        />
        <span>{LARI}</span>
      </span>
    </Fld>
  );
  const text = (route, field, label) => (
    <Fld label={label} className="bx-grow">
      <input className="bx-in" value={value(route, field)} onChange={setField(route, field)} />
    </Fld>
  );

  const card = (route) => {
    if (!row(route)) return null;
    const on = !!value(route, 'enabled');
    const label = t(`settingsTabs.delivery.route.${route}`);
    const head = (
      <div className="bx-row" style={{ gap: 12 }}>
        <span className="bx-li-ic"><BxIcon name={ICON[route]} /></span>
        {on ? <b className="bx-grow">{label}</b> : (
          <div className="bx-grow">
            <b className="bx-sm">{label}</b>
            <div className="bx-xs bx-dim">{t(`settingsTabs.delivery.offHint.${route}`)}</div>
          </div>
        )}
        {route === 'pickup' && on && <span className="bx-sm bx-okt">{t('settingsTabs.delivery.free')}</span>}
        <Switch on={on} onChange={setField(route, 'enabled')} label={label} disabled={busy} />
      </div>
    );
    if (!on) return <div key={route} className="bx-card bx-pad">{head}</div>;
    return (
      <div key={route} className="bx-card bx-pad bx-stk" style={{ gap: 12 }}>
        {head}
        {route === 'pickup' && (
          <>
            {text(route, 'pickupAddress', t('settingsTabs.delivery.address'))}
            {text(route, 'pickupHours', t('settingsTabs.delivery.hours'))}
            {/* A promised time set before this tab dropped the field stays editable. */}
            {original(route, etaKey) && text(route, etaKey, t('settingsTabs.delivery.eta'))}
          </>
        )}
        {route !== 'pickup' && (
          <div className="bx-row" style={{ gap: 12, alignItems: 'flex-start' }}>
            {money(route, 'price', t('settingsTabs.delivery.price'))}
            {text(route, etaKey, t('settingsTabs.delivery.eta'))}
          </div>
        )}
        {/* No free-over on express: the threshold is a gift of the courier fee, not of speed. */}
        {(route === 'tbilisi' || route === 'georgia') && money(route, 'freeOverTotal', t('settingsTabs.delivery.freeOver'), t('settingsTabs.delivery.never'))}
        {route === 'express' && <p className="bx-hint">{tOwner('delivery.routeHint.express')}</p>}
      </div>
    );
  };

  return (
    <>
      {noCard}
      {error && <Alert tone="bad" icon="warn"><span className="bx-sm">{error}</span></Alert>}
      <div className="bx-two even">
        {COLUMNS.map((col) => (
          <div key={col.join()} className="bx-stk" style={{ gap: 14 }}>{col.map(card)}</div>
        ))}
      </div>
      <SaveBar t={t} dirty={dirty} busy={busy} saved={saved} onSave={save} onCancel={cancel} />
    </>
  );
}
