// Finances — what the store earned and what it owes the platform (the
// design's X2 board): this month's revenue, the commission and what is left,
// then month by month, and what does and does not reach the merchant.
//
// Three figures that are easy to conflate are kept apart:
//
//   revenue     goods sold, refunds and cancellations excluded (D2)
//   delivery    collected and passed to a courier — never counted as revenue
//   commission  2% of goods, frozen per order, owed to the platform (D9)
//
// Each month's row is the admin billing screen's own figure for that month
// (/api/tenant/stats/months), so the two screens cannot disagree. Nothing is
// invoiced yet, and the invoice column says exactly that.
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTK } from '../core/useTK';
import { money, FEE_PERCENT } from '../core/money';
import { handleApiError } from '../utils/api';
import { MTop } from './ManagerShell';
import { useMonthStats } from './useStoreStats';
import { Alert } from './officeKit';

/** "2026-10" → its month number and year. */
const parts = (ym) => {
  const [y, m] = String(ym).split('-').map(Number);
  return { y, m };
};

export default function ManagerMoney() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const [params] = useSearchParams();
  const devTenant = params.get('tenant') || undefined;
  const { data, loading, error } = useMonthStats(devTenant);

  const rate = Number(data?.serviceFeeRate);
  // The rate new orders are charged today, as a whole percent where it is one.
  const percent = Number.isFinite(rate) && rate > 0 ? Math.round(rate * 1000) / 10 : FEE_PERCENT;
  const months = data?.months || [];
  const now = months[0];
  const before = months[1];
  const thisYear = now ? parts(now.month).y : new Date().getFullYear();
  const monthName = (ym) => {
    const { y, m } = parts(ym);
    const name = t(`finances.month.${m}`);
    return y === thisYear ? name : t('finances.monthYear', { month: name, year: y });
  };

  const revenue = Number(now?.revenue || 0);
  const fees = Number(now?.feesOwed || 0);
  let change = null;
  if (now && before) {
    const prev = Number(before.revenue || 0);
    const { m } = parts(before.month);
    if (prev === 0) change = { dim: true, text: t(`finances.noneIn.${m}`) };
    else {
      const pct = Math.round(((revenue - prev) / prev) * 100);
      change = { down: pct < 0, text: t('finances.vsMonth', { arrow: pct < 0 ? '▼' : '▲', pct: Math.abs(pct), than: t(`finances.than.${m}`) }) };
    }
  }

  const routes = [
    { key: 'goods', chip: 'c-done' },
    { key: 'delivery', chip: 'c-done' },
    { key: 'refunds', chip: 'c-canc' },
  ];

  return (
    <div className="bx-page">
      <MTop T={T} title={t('finances.title')} sub={t('finances.sub', { percent })} />

      {loading && <div className="bx-sm bx-dim">{t('finances.loading')}</div>}
      {error && !loading && <Alert tone="bad" icon="warn"><span className="bx-sm">{handleApiError(error, t('finances.loadFailed'))}</span></Alert>}

      {data && !loading && now && (
        <>
          <div className="bx-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div className="bx-card bx-kpi">
              <span className="bx-sm bx-dim">{t('finances.revenueIn', { month: monthName(now.month) })}</span>
              <b>{money(revenue)}</b>
              {change && (change.dim
                ? <span className="bx-xs bx-dim">{change.text}</span>
                : <span className={`bx-delta${change.down ? ' down' : ''}`}>{change.text}</span>)}
            </div>
            <div className="bx-card bx-kpi">
              <span className="bx-sm bx-dim">{t('finances.fee', { percent })}</span>
              <b>{money(fees)}</b>
              <span className="bx-xs bx-dim">{t('finances.feeHint')}</span>
            </div>
            <div className="bx-card bx-kpi" style={{ background: 'color-mix(in oklab, var(--k-pri) 8%, var(--k-sf))' }}>
              <span className="bx-sm bx-dim">{t('finances.kept')}</span>
              <b className="bx-acc">{money(revenue - fees)}</b>
              <span className="bx-xs bx-dim">{t('finances.keptHint')}</span>
            </div>
          </div>

          <div className="bx-two">
            <div className="bx-card bx-stk" style={{ gap: 0, overflow: 'hidden' }}>
              <div className="bx-pad" style={{ borderBottom: '1px solid var(--k-line)' }}><b className="bx-h3">{t('finances.byMonth')}</b></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="bx-tbl">
                  <thead>
                    <tr>
                      <th scope="col">{t('finances.colMonth')}</th>
                      <th scope="col" className="r">{t('finances.colRevenue')}</th>
                      <th scope="col" className="r">{t('finances.colFee')}</th>
                      <th scope="col" className="bx-no-ph">{t('finances.colInvoice')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((row) => (
                      <tr key={row.month}>
                        <td>{monthName(row.month)}</td>
                        <td className="r bx-price">{money(row.revenue)}</td>
                        <td className="r bx-price">{money(row.feesOwed)}</td>
                        {/* Nothing is invoiced yet (no settlement exists), so
                            every month says so rather than inventing a status. */}
                        <td className="bx-no-ph"><span className="bx-chip nd c-proc">{t('finances.notInvoiced')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bx-stk" style={{ gap: 14 }}>
              <div className="bx-card bx-stk" style={{ gap: 0 }}>
                <div className="bx-pad" style={{ borderBottom: '1px solid var(--k-line)' }}><b className="bx-h3">{t('finances.whatTitle')}</b></div>
                {routes.map((r) => (
                  <div key={r.key} className="bx-li" style={{ alignItems: 'flex-start' }}>
                    <div className="bx-grow bx-stk" style={{ gap: 4 }}>
                      <div className="bx-rowb">
                        <b className="bx-sm">{t(`finances.what.${r.key}`)}</b>
                        <span className={`bx-chip nd ${r.chip}`}>{t(r.chip === 'c-done' ? 'finances.yours' : 'finances.notYours')}</span>
                      </div>
                      <span className="bx-xs bx-dim">{t(`finances.whatBody.${r.key}`)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Alert icon="card">
                <span className="bx-sm"><b>{t('finances.feeNoteLead')}</b> {t('finances.feeNote', { percent })}</span>
              </Alert>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
