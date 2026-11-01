// /billing — one month's sales and commission per store (the design's AD5).
//
// Three figures across the top, each a step the fee takes: sales before
// refunds, the commission they accrued, and what is still payable once
// refunds have written their commission off. Below them, one row per store
// with sales and commission, the platform total, and a CSV of the same rows.
//
// The rules the numbers obey:
//   - Every figure is the server's (GET /api/admin/billing?month=), summed per
//     order there. Nothing is added up in the browser — a client-side total
//     quietly disagrees with the server the moment a list is paged or rounded.
//   - Nothing is invoiced and nothing is paid out: the platform only records
//     what has accrued, and the screen says so instead of drawing an invoice
//     list with nothing behind it. Every row's status is therefore "accrued".
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi, handleApiError } from '../utils/api';
import { useAdminTokens } from './adminTokens';
import { SectionTitle } from '../core/primitives';
import { useDevice } from '../contexts/DeviceContext';
import { Empty, Failed, Loading, count, lari } from './AdminUI';
import { Alert, Glyph, KitBtn, KitChip, Kpi, List, Seg } from './AdminKit';

const PAGE = 20;

/** 'YYYY-MM' for a month `back` months before today, on this browser's clock. */
function monthId(back) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** The fee rate as the design writes it: "2%", "2,5%" in Georgian, "2.5%" in English. */
function percent(rate, lang) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return null;
  const p = Math.round(n * 10000) / 100;
  const text = String(p);
  return `${String(lang || '').startsWith('ka') ? text.replace('.', ',') : text}%`;
}

/** A CSV cell: quoted when it must be, so a store called "A, B" stays one cell. */
const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const plain = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? '' : Number(v).toFixed(2));

export default function AdminBilling() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;
  const { isMobile, isDesktop } = useDevice();

  // The design offers this month and the one before it.
  const months = useMemo(() => [monthId(1), monthId(0)], []);
  const [month, setMonth] = useState(months[1]);
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const load = useCallback(async (m) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getBilling({ month: m, signal: ac.signal });
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
    load(month);
    return () => abortRef.current?.abort();
  }, [load, month]);

  const monthName = (id) => t(`billing.month.${Number(id.slice(5, 7))}`);
  const period = `${monthName(month)} ${month.slice(0, 4)}`;
  const rate = percent(data?.serviceFeeRate, lang);
  const sub = rate ? t('billing.sub', { rate, period }) : period;

  const pick = (id) => {
    if (id === month) return;
    setPage(0);
    setMonth(id);
  };

  const totals = data?.totals || {};
  const rows = Array.isArray(data?.stores) ? data.stores : [];

  // The download is the month's rows — every page, not just this one — and
  // the server's total line, in plain numbers a spreadsheet can add up.
  const exportCsv = () => {
    const header = [
      t('billing.csv.store'), t('billing.csv.subdomain'), t('billing.csv.sales'),
      t('billing.csv.feesAccrued'), t('billing.csv.feesWrittenOff'), t('billing.csv.refunds'),
      t('billing.csv.feesOwed'), t('billing.csv.status'),
    ];
    const lines = rows.map((r) => [
      r.displayName || r.name || r.subdomain, r.subdomain, plain(r.sales), plain(r.feesAccrued),
      plain(r.feesWrittenOff), r.refundCount ?? '', plain(r.feesOwed), t('billing.statusAccrued'),
    ]);
    lines.push([
      t('billing.csv.total'), '', plain(totals.sales), plain(totals.feesAccrued),
      plain(totals.feesWrittenOff), totals.refundCount ?? '', plain(totals.feesOwed), '',
    ]);
    const text = [header, ...lines].map((l) => l.map(cell).join(',')).join('\r\n');
    // The BOM makes a spreadsheet read the Georgian as UTF-8.
    const blob = new Blob([String.fromCharCode(0xfeff), text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esy-billing-${data?.month || month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const head = (
    <>
      <SectionTitle T={T} lang={lang} title={t('billing.title')} sub={sub} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Seg
          T={T}
          phone={isMobile}
          label={t('billing.monthLabel')}
          value={month}
          onChange={pick}
          options={months.map((id) => ({ id, label: monthName(id) }))}
          style={{ flex: isMobile ? '1 1 100%' : '0 1 320px', minWidth: 0 }}
        />
        <KitBtn
          T={T}
          size="sm"
          disabled={!rows.length}
          onClick={exportCsv}
          style={isMobile ? { height: 40 } : undefined}
        >
          <Glyph name="download" />
          {t('billing.export')}
        </KitBtn>
      </div>
    </>
  );

  // On a phone the shell's own 16px gutter is the design's; more would leave
  // the table too narrow for its three columns.
  const wrap = { padding: isMobile ? 0 : 20, maxWidth: 1040, margin: '0 auto' };

  if (loading && !data) {
    return <div style={wrap}>{head}<Loading T={T} /></div>;
  }
  if (error || !data) {
    return (
      <div style={wrap}>
        {head}
        <Failed T={T} message={error || t('billing.loadFailed')} onRetry={() => load(month)} />
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = rows.slice(at * PAGE, at * PAGE + PAGE);
  const refunds = Number(totals.refundCount) || 0;

  const th = {
    textAlign: 'left', padding: '12px 16px', font: `600 12px ${T.font}`, color: T.textDim,
    borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
  };
  const td = {
    padding: isMobile ? '13px 12px' : '13px 16px', borderBottom: `1px solid ${T.border}`,
    font: `500 13.5px ${T.font}`, color: T.text, verticalAlign: 'middle',
  };
  const num = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600 };
  const pad = isMobile ? { paddingLeft: 12, paddingRight: 12 } : null;

  return (
    <div style={wrap}>
      {head}

      <div style={{ opacity: loading ? 0.55 : 1, display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 16 }}>
        <div style={{
          display: 'grid', gap: isMobile ? 12 : 16,
          gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, minmax(0, 1fr))`,
        }}>
          <Kpi T={T} big={isDesktop} label={t('billing.kpiSales')} value={lari(totals.sales)} hint={t('billing.kpiSalesHint')} />
          <Kpi
            T={T}
            big={isDesktop}
            label={t('billing.kpiFees')}
            value={lari(totals.feesAccrued)}
            hint={t('billing.kpiFeesHint', { count: Number(totals.storeCount) || 0, n: count(totals.storeCount, lang) })}
          />
          <Kpi
            T={T}
            big={isDesktop}
            label={t('billing.kpiOwed')}
            value={lari(totals.feesOwed)}
            hint={refunds > 0
              ? t('billing.kpiOwedHint', { count: refunds, n: count(refunds, lang), amount: lari(totals.feesWrittenOff) })
              : t('billing.kpiOwedNone')}
            style={isMobile ? { gridColumn: '1 / -1' } : undefined}
          />
        </div>

        <Alert T={T} tone="warn">{t('billing.notInvoiced')}</Alert>

        {rows.length === 0 ? (
          <Empty T={T} title={t('billing.empty', { period })} body={t('billing.emptyBody')} />
        ) : (
          <List T={T}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, ...pad }}>{t('billing.colStore')}</th>
                  <th style={{ ...th, ...pad, textAlign: 'right' }}>{t('billing.colSales')}</th>
                  <th style={{ ...th, ...pad, textAlign: 'right' }}>{t('billing.colFees')}</th>
                  {!isMobile && <th style={th}>{t('billing.colStatus')}</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.subdomain}>
                    <td style={{ ...td, minWidth: 0 }}>
                      <Link
                        to={`/stores/${encodeURIComponent(r.subdomain)}`}
                        style={{ font: `700 12.5px/1.35 ${T.font}`, color: T.text, textDecoration: 'none', overflowWrap: 'anywhere' }}
                      >
                        {r.displayName || r.name || r.subdomain}
                      </Link>
                    </td>
                    <td style={num}>{lari(r.sales) ?? '—'}</td>
                    <td style={num}>{lari(r.feesAccrued) ?? '—'}</td>
                    {!isMobile && (
                      <td style={td}><KitChip T={T} tone="mute" dot>{t('billing.statusAccrued')}</KitChip></td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...td, background: T.surface2, fontWeight: 700, borderBottom: 'none' }}>
                    {t('billing.totalRow', { count: Number(totals.storeCount) || 0, n: count(totals.storeCount, lang) })}
                  </td>
                  <td style={{ ...num, background: T.surface2, borderBottom: 'none' }}>{lari(totals.sales) ?? '—'}</td>
                  <td style={{ ...num, background: T.surface2, borderBottom: 'none' }}>{lari(totals.feesAccrued) ?? '—'}</td>
                  {!isMobile && <td style={{ ...td, background: T.surface2, borderBottom: 'none' }} />}
                </tr>
              </tfoot>
            </table>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '10px 16px', borderTop: `1px solid ${T.border}`, flexWrap: 'wrap',
            }}>
              <span style={{ font: `500 12.5px ${T.font}`, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
                {t('billing.range', {
                  from: count(at * PAGE + 1, lang), to: count(at * PAGE + shown.length, lang), total: count(rows.length, lang),
                })}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <KitBtn T={T} size="sm" disabled={at === 0} onClick={() => setPage(at - 1)} style={isMobile ? { height: 40 } : undefined}>
                  <Glyph name="chevL" />{t('billing.prev')}
                </KitBtn>
                <KitBtn T={T} size="sm" disabled={at >= pages - 1} onClick={() => setPage(at + 1)} style={isMobile ? { height: 40 } : undefined}>
                  {t('billing.next')}<Glyph name="chevR" />
                </KitBtn>
              </div>
            </div>
          </List>
        )}
      </div>
    </div>
  );
}
