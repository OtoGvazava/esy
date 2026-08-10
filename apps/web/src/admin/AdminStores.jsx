// /stores — every store on the platform, searchable, with the suspend switch.
//
// The list is the screen an admin lands on, so it carries the four figures a
// support question usually turns on (products, orders, revenue, fees owed)
// rather than making each one a click away. Both money columns exclude refunded
// orders (decision D2) and the screen says so out loud: a revenue number that
// quietly means something other than "what the store took" is worse than no
// number at all.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi, handleApiError } from '../utils/api';
import { useDebounce } from '../hooks/useDebounce';
import { useAdminTokens } from './adminTokens';
import { Btn, Card, Chip, Field, Note, SectionTitle } from '../core/primitives';
import { Mark } from '../core/domain';
import { Icons } from '../core/icons';
import {
  Empty, Failed, Loading, Stat, StoreStatus, SuspendDialog,
  count, dateTime, isSuspended, lari,
} from './AdminUI';

function StoreRow({ T, store, lang, t, onSuspend, onReactivate, busy, error }) {
  const off = isSuspended(store);
  const name = store.displayName || store.name || store.subdomain;
  return (
    <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '14px 16px' }}>
        <Mark T={T} store={{ name }} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            to={`/stores/${encodeURIComponent(store.subdomain)}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              font: `700 15px ${T.font}`, color: T.text,
              textDecoration: 'none', letterSpacing: '-0.01em',
            }}
          >
            {name}
            <span style={{ color: T.accentFg }}><Icons.arrowR size={14} /></span>
          </Link>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap',
          }}>
            <span style={{ font: `500 12px ${T.mono}`, color: T.textMute }}>{store.subdomain}</span>
            {store.category && <Chip T={T} tone="neutral">{store.category}</Chip>}
          </div>
          <div style={{ font: `500 12.5px ${T.font}`, color: T.textDim, marginTop: 5 }}>
            {store.ownerEmail || t('stores.noOwner')}
          </div>
        </div>
        <StoreStatus T={T} store={store} />
      </div>

      <div style={{
        display: 'flex', gap: 22, flexWrap: 'wrap',
        padding: '12px 16px', borderTop: `1px solid ${T.border}`, background: T.surface2,
      }}>
        <Stat T={T} label={t('stores.colProducts')} value={count(store.productCount, lang)} />
        <Stat T={T} label={t('stores.colOrders')} value={count(store.orderCount, lang)} />
        <Stat T={T} label={t('stores.colRevenue')} value={lari(store.revenue, lang)} />
        <Stat T={T} label={t('stores.colFees')} value={lari(store.feesOwed, lang)} tone={T.accentFg} />
      </div>

      {off && (store.suspendReason || store.suspendedAt) && (
        <div style={{ padding: '12px 16px 0' }}>
          <Note T={T} tone="danger">
            {store.suspendReason || t('stores.noReason')}
            {store.suspendedAt && (
              <span style={{ color: T.textMute }}>
                {' · '}
                {dateTime(store.suspendedAt, lang) || store.suspendedAt}
              </span>
            )}
          </Note>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px 0', font: `500 12.5px ${T.font}`, color: T.dangerFg }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', justifyContent: 'flex-end' }}>
        {off ? (
          <Btn T={T} kind="quiet" size="sm" disabled={busy} onClick={() => onReactivate(store)}>
            {busy ? t('ui.working') : t('stores.reactivate')}
          </Btn>
        ) : (
          <Btn T={T} kind="danger" size="sm" disabled={busy} onClick={() => onSuspend(store)}>
            {t('stores.suspend')}
          </Btn>
        )}
      </div>
    </Card>
  );
}

export default function AdminStores() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;

  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const [stores, setStores] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState(null);
  const [busy, setBusy] = useState('');
  const [rowError, setRowError] = useState({});
  const abortRef = useRef(null);

  const load = useCallback(async (q) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listStores(q, { signal: ac.signal });
      if (ac.signal.aborted) return;
      setStores(Array.isArray(data) ? data : []);
    } catch (e) {
      if (ac.signal.aborted || e?.name === 'AbortError') return;
      // Drop the stale list: an error next to rows would read as "still current".
      setStores(null);
      setError(handleApiError(e, t('stores.loadFailed')));
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(debounced.trim());
    return () => abortRef.current?.abort();
  }, [debounced, load]);

  // Both writes return the updated store, so the row is replaced from the
  // server's answer rather than guessed at locally. If the answer is not a
  // store, the list is re-read rather than patched from a guess — a row that
  // disagrees with the server is worse than a second round-trip.
  const replace = (updated) => {
    if (!updated?.subdomain) {
      load(debounced.trim());
      return;
    }
    setStores((prev) => (prev || []).map((s) => (s.subdomain === updated.subdomain ? updated : s)));
  };

  const reactivate = async (store) => {
    setBusy(store.subdomain);
    setRowError((p) => ({ ...p, [store.subdomain]: '' }));
    try {
      replace(await adminApi.reactivateStore(store.subdomain));
    } catch (e) {
      setRowError((p) => ({ ...p, [store.subdomain]: handleApiError(e, t('stores.reactivateFailed')) }));
    } finally {
      setBusy('');
    }
  };

  const searching = debounced.trim().length > 0;

  return (
    <div style={{ padding: 20, maxWidth: 1040, margin: '0 auto' }}>
      <SectionTitle
        T={T}
        lang={lang}
        title={t('stores.title')}
        sub={t('stores.sub')}
        right={stores ? (
          <Chip T={T} tone="admin">{t('stores.resultCount', { n: count(stores.length, lang) })}</Chip>
        ) : null}
      />

      <Field
        T={T}
        id="admin-store-search"
        label={t('stores.searchLabel')}
        placeholder={t('stores.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        autoComplete="off"
        right={
          query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('stores.clearSearch')}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: T.textMute, display: 'flex', padding: 4,
              }}
            >
              <Icons.x size={14} />
            </button>
          ) : (
            <span style={{ color: T.textMute, display: 'flex' }}><Icons.search size={16} /></span>
          )
        }
        style={{ marginBottom: 14 }}
      />

      <Note T={T} tone="admin" style={{ marginBottom: 16 }}>{t('money.excludesRefunds')}</Note>

      {loading && !stores && <Loading T={T} />}

      {error && !loading && (
        <Failed T={T} message={error} onRetry={() => load(debounced.trim())} />
      )}

      {stores && stores.length === 0 && !loading && !error && (
        <Empty
          T={T}
          title={searching ? t('stores.emptyQuery') : t('stores.empty')}
          body={searching ? t('stores.emptyQueryBody') : t('stores.emptyBody')}
        />
      )}

      {stores && stores.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          opacity: loading ? 0.55 : 1,
        }}>
          {stores.map((s) => (
            <StoreRow
              key={s.subdomain}
              T={T}
              t={t}
              lang={lang}
              store={s}
              busy={busy === s.subdomain}
              error={rowError[s.subdomain]}
              onSuspend={setSuspending}
              onReactivate={reactivate}
            />
          ))}
        </div>
      )}

      {suspending && (
        <SuspendDialog
          T={T}
          store={suspending}
          onCancel={() => setSuspending(null)}
          onSuspended={(updated) => { replace(updated); setSuspending(null); }}
        />
      )}
    </div>
  );
}
