// /stores — every store on the platform, searchable, with the suspend switch.
//
// The list is the screen an admin lands on, so it carries the four figures a
// support question usually turns on (products, orders, revenue, fees owed)
// rather than making each one a click away. Both money columns exclude refunded
// orders (decision D2) and the screen says so out loud: a revenue number that
// quietly means something other than "what the store took" is worse than no
// number at all.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, handleApiError } from '../utils/api';
import { adminStoreLists, adminStoresQuery } from '../core/query/adminQueries';
import { useDebounce } from '../hooks/useDebounce';
import { useAdminTokens } from './adminTokens';
import { Btn, Card, Chip, Field, Note } from '../core/primitives';
import { useAdminHead } from './adminHead';
import { Mark } from '../core/domain';
import { Icons } from '../core/icons';
import { useDevice } from '../contexts/DeviceContext';
import {
  Empty, Failed, Stat, StoreStatus, SuspendDialog,
  count, dateTime, isSuspended, lari,
} from './AdminUI';
import { StoresSkeleton } from './AdminSkeletons';

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

/** A desktop reads the stores as a table (the design's AD1); a phone keeps the cards. */
function StoreTable({ T, t, lang, stores, busy, rowError, onSuspend, onReactivate }) {
  const th = {
    textAlign: 'left', padding: '10px 14px', font: `500 12px ${T.font}`, color: T.textMute,
    borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
  };
  const td = {
    padding: '12px 14px', borderBottom: `1px solid ${T.border}`, font: `500 13px ${T.font}`,
    color: T.text, verticalAlign: 'middle',
  };
  const num = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
  return (
    <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>{t('stores.colStore')}</th>
            <th style={th}>{t('stores.colOwner')}</th>
            <th style={{ ...th, textAlign: 'right' }}>{t('stores.colOrders')}</th>
            <th style={{ ...th, textAlign: 'right' }}>{t('stores.colRevenue')}</th>
            <th style={{ ...th, textAlign: 'right' }}>{t('stores.colFees')}</th>
            <th style={th}>{t('stores.colStatus')}</th>
            <th style={th} aria-label={t('stores.colAction')} />
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => {
            const off = isSuspended(store);
            const name = store.displayName || store.name || store.subdomain;
            const isBusy = busy === store.subdomain;
            return (
              <tr key={store.subdomain}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Mark T={T} store={{ name }} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <Link
                        to={`/stores/${encodeURIComponent(store.subdomain)}`}
                        style={{ font: `700 14px ${T.font}`, color: T.text, textDecoration: 'none' }}
                      >{name}</Link>
                      <div style={{ font: `500 12px ${T.mono}`, color: T.textMute }}>{store.subdomain}</div>
                      {rowError[store.subdomain] && (
                        <div style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{rowError[store.subdomain]}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ ...td, color: T.textDim }} title={store.ownerEmail ? undefined : t('stores.noOwner')}>
                  {store.ownerEmail || '—'}
                </td>
                <td style={num}>{count(store.orderCount, lang) ?? '—'}</td>
                <td style={num}>{lari(store.revenue, lang) ?? '—'}</td>
                <td style={{ ...num, color: T.accentFg }}>{lari(store.feesOwed, lang) ?? '—'}</td>
                <td style={td}><StoreStatus T={T} store={store} /></td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {off ? (
                    <Btn T={T} kind="quiet" size="sm" disabled={isBusy} onClick={() => onReactivate(store)}>
                      {isBusy ? t('ui.working') : t('stores.reactivate')}
                    </Btn>
                  ) : (
                    <Btn T={T} kind="danger" size="sm" disabled={isBusy} onClick={() => onSuspend(store)}>
                      {t('stores.suspend')}
                    </Btn>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

export default function AdminStores() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;
  const { isDesktop } = useDevice();

  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const q = debounced.trim();
  const [suspending, setSuspending] = useState(null);
  const [busy, setBusy] = useState('');
  const [rowError, setRowError] = useState({});

  // The list from the query cache, so coming back to it draws it at once. A
  // new search keeps the rows on screen, dimmed, until its own answer is in.
  const list = useQuery({ ...adminStoresQuery(q), placeholderData: keepPreviousData });
  // Drop the stale list: an error next to rows would read as "still current".
  const stores = list.isError ? null : (list.data ?? null);
  const failed = list.isError && !list.isFetching;
  const error = failed ? handleApiError(list.error, t('stores.loadFailed')) : '';
  const refreshing = list.isPlaceholderData;
  // The search the rows on screen answer. While a new one is on its way the
  // figures, the count and the empty state stay with the rows they describe,
  // and change with them once the answer lands.
  const [shownQ, setShownQ] = useState(q);
  if (!refreshing && list.data !== undefined && shownQ !== q) setShownQ(q);

  // Both writes return the updated store, so the row is replaced from the
  // server's answer rather than guessed at locally, in every list it is in.
  // The write has also set the list refetching (core/query/client.js): an
  // answer that is not a store is left to that read rather than patched in
  // from a guess — a row that disagrees with the server is worse than a
  // second round-trip.
  const replace = (updated) => {
    if (!updated?.subdomain) return;
    qc.setQueriesData({ queryKey: adminStoreLists }, (prev) => (
      prev && prev.map((s) => (s.subdomain === updated.subdomain ? updated : s))
    ));
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

  const searching = shownQ.length > 0;
  const dim = refreshing ? 'esy-refreshing' : 'esy-settled';
  useAdminHead({ title: t('stores.title'), sub: t('stores.head') });

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      {/* A search's own count; without one, the figures below carry the total. */}
      {stores && searching && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Chip T={T} tone="admin">{t('stores.resultCount', { n: count(stores.length, lang) })}</Chip>
        </div>
      )}

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

      {/* The platform's figures across the top, before a search narrows the list. */}
      {stores && stores.length > 0 && !searching && (
        <div className={dim} style={{
          display: 'grid', gridTemplateColumns: `repeat(${isDesktop ? 4 : 2}, minmax(0, 1fr))`,
          gap: 12, marginBottom: 14,
        }}>
          {[
            [t('stores.kpiStores'), count(stores.length, lang)],
            [t('stores.active'), count(stores.filter((x) => !isSuspended(x)).length, lang)],
            [t('stores.suspended'), count(stores.filter(isSuspended).length, lang)],
            [t('stores.colRevenue'), lari(stores.reduce((n, x) => n + (Number(x.revenue) || 0), 0), lang)],
          ].map(([label, value]) => (
            <Card key={label} T={T} pad={16}>
              <div style={{ font: `500 13px ${T.font}`, color: T.textDim }}>{label}</div>
              <div style={{ marginTop: 6, font: `800 24px ${T.font}`, color: T.text, whiteSpace: 'nowrap' }}>{value}</div>
            </Card>
          ))}
        </div>
      )}

      {/* A retry after a failure draws the skeleton again, as the first load did. */}
      {(list.isPending || (list.isError && list.isFetching)) && <StoresSkeleton />}

      {failed && (
        <Failed T={T} message={error} onRetry={() => list.refetch()} />
      )}

      {stores && stores.length === 0 && (
        <div className={dim}>
          <Empty
            T={T}
            title={searching ? t('stores.emptyQuery') : t('stores.empty')}
            body={searching ? t('stores.emptyQueryBody') : t('stores.emptyBody')}
          />
        </div>
      )}

      {stores && stores.length > 0 && isDesktop && (
        <div className={dim}>
          <StoreTable
            T={T} t={t} lang={lang} stores={stores} busy={busy} rowError={rowError}
            onSuspend={setSuspending} onReactivate={reactivate}
          />
        </div>
      )}

      {stores && stores.length > 0 && !isDesktop && (
        <div className={dim} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

      {/* What the revenue leaves out reads as a footnote to the figures, not a banner. */}
      {stores && stores.length > 0 && (
        <div style={{ marginTop: 12, font: `400 12px/1.5 ${T.font}`, color: T.textMute }}>
          {t('money.excludesRefunds')}
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
