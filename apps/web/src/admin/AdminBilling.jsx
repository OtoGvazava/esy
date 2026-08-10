// /billing — what each store has accrued in service fees, and the platform
// total. One question, answered in one column: "who owes what".
//
// Two rules the numbers here obey. Refunded orders are not revenue (decision
// D2), so neither the revenue nor the fee column counts them and the screen
// says so. And the platform total is the server's `totalAccrued`, never a sum
// added up in the browser — a client-side total would quietly disagree with the
// server the moment the list is filtered, paged or rounded differently.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi, handleApiError } from '../utils/api';
import { useAdminTokens } from './adminTokens';
import { Card, Note, SectionTitle } from '../core/primitives';
import { Icons } from '../core/icons';
import { Empty, Failed, Loading, count, lari } from './AdminUI';

const COLS = 'minmax(180px, 1fr) 90px 130px 130px';

function HeadRow({ T, t }) {
  const cell = {
    font: `600 10.5px ${T.font}`, color: T.textMute,
    letterSpacing: '0.07em', textTransform: 'uppercase',
  };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center',
      padding: '12px 16px', background: T.surface2,
    }}>
      <div style={cell}>{t('billing.colStore')}</div>
      <div style={{ ...cell, textAlign: 'right' }}>{t('billing.colOrders')}</div>
      <div style={{ ...cell, textAlign: 'right' }}>{t('billing.colRevenue')}</div>
      <div style={{ ...cell, textAlign: 'right' }}>{t('billing.colFees')}</div>
    </div>
  );
}

function BillingRow({ T, lang, row }) {
  const num = { font: `600 13px ${T.mono}`, color: T.text, textAlign: 'right' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center',
      padding: '12px 16px', borderTop: `1px solid ${T.border}`,
    }}>
      <div style={{ minWidth: 0 }}>
        <Link
          to={`/stores/${encodeURIComponent(row.subdomain)}`}
          style={{ font: `600 13.5px ${T.font}`, color: T.text, textDecoration: 'none' }}
        >
          {row.name || row.subdomain}
        </Link>
        <div style={{ font: `500 11.5px ${T.mono}`, color: T.textMute, marginTop: 2 }}>
          {row.subdomain}
        </div>
      </div>
      <div style={num}>{count(row.orderCount, lang) ?? '—'}</div>
      <div style={num}>{lari(row.revenue, lang) ?? '—'}</div>
      <div style={{ ...num, color: T.accentFg }}>{lari(row.feesOwed, lang) ?? '—'}</div>
    </div>
  );
}

export default function AdminBilling() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getBilling({ signal: ac.signal });
      if (ac.signal.aborted) return;
      setData(res);
    } catch (e) {
      if (ac.signal.aborted || e?.name === 'AbortError') return;
      setData(null);
      setError(handleApiError(e, t('billing.loadFailed')));
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  // Biggest debt first — this list is read to decide who to chase.
  const rows = useMemo(() => {
    const list = Array.isArray(data?.stores) ? [...data.stores] : [];
    return list.sort((a, b) => (Number(b.feesOwed) || 0) - (Number(a.feesOwed) || 0));
  }, [data]);

  const wrap = { padding: 20, maxWidth: 1040, margin: '0 auto' };

  if (loading && !data) {
    return (
      <div style={wrap}>
        <SectionTitle T={T} lang={lang} title={t('billing.title')} sub={t('billing.sub')} />
        <Loading T={T} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={wrap}>
        <SectionTitle T={T} lang={lang} title={t('billing.title')} sub={t('billing.sub')} />
        <Failed T={T} message={error || t('billing.loadFailed')} onRetry={load} />
      </div>
    );
  }

  const total = lari(data.totalAccrued, lang);

  return (
    <div style={wrap}>
      <SectionTitle T={T} lang={lang} title={t('billing.title')} sub={t('billing.sub')} />

      <Card T={T} pad={20} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: T.accentFg, display: 'flex' }}><Icons.chart size={16} /></span>
          <span style={{
            font: `600 10.5px ${T.font}`, color: T.textMute,
            letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            {t('billing.totalAccrued')}
          </span>
        </div>
        <div style={{
          font: `800 34px ${T.mono}`, marginTop: 8, letterSpacing: '-0.02em',
          color: total == null ? T.textMute : T.accentFg,
        }}>
          {total ?? '—'}
        </div>
        <div style={{ font: `500 12.5px ${T.font}`, color: T.textMute, marginTop: 4 }}>
          {t('billing.storeCount', { n: count(rows.length, lang) })}
        </div>
      </Card>

      <Note T={T} tone="admin" style={{ marginBottom: 16 }}>{t('money.excludesRefunds')}</Note>

      {rows.length === 0 ? (
        <Empty T={T} title={t('billing.empty')} body={t('billing.emptyBody')} />
      ) : (
        <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 560 }}>
              <HeadRow T={T} t={t} />
              {rows.map((r) => (
                <BillingRow key={r.subdomain} T={T} lang={lang} row={r} />
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
