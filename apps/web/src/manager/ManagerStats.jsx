// Analytics for one store (the design's X1 board): a 7, 30 or 90 day window
// or all time, four figures against the window before, revenue day by day,
// and the best sellers.
//
// Built on /api/tenant/stats/period, which applies the same revenue and
// refund rules as the admin billing screen to one window's orders, so a
// day's bar and the platform's month can never disagree. Revenue and the
// average leave out cancelled and refunded orders and delivery; the footnote
// says so where the numbers are read.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../contexts/TenantContext';
import { useTK } from '../core/useTK';
import { Card } from '../core/primitives';
import { money } from '../core/money';
import { handleApiError } from '../utils/api';
import { usePeriodStats } from './useStoreStats';
import { MTop } from './ManagerShell';
import { Alert, BxIcon } from './officeBx';

/** A figure on a card. Kept for the overview and first-visit screens. */
export function StatCard({ T, label, value, tone, hint }) {
  return (
    <Card T={T} pad={16}>
      {/* Sentence case at 13px: 10.5px capitals turned Georgian into tiny Mtavruli. */}
      <div style={{ font: `500 13px ${T.font}`, color: T.textDim }}>
        {label}
      </div>
      <div style={{ marginTop: 8, font: `800 24px ${T.font}`, color: tone || T.text, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {hint && (
        <div style={{ marginTop: 4, font: `500 12px ${T.font}`, color: T.textMute }}>{hint}</div>
      )}
    </Card>
  );
}

const PERIODS = [7, 30, 90, null];

/** "2026-10-02" as a local date, with no time zone shift. */
const day = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/**
 * A share to one place, with the Georgian decimal comma ("0,7") or the
 * English point. Written out rather than left to Intl, whose Georgian Chrome
 * does not have.
 */
const pct1 = (n, lang) => String(Math.round(n * 10) / 10).replace('.', String(lang || '').startsWith('ka') ? ',' : '.');

/** An average order as the board writes it: whole lari. */
const wholeLari = (v) => money(Math.round(Number(v)));

/** The step that splits `max` into three even intervals at round numbers. */
function niceTop(max) {
  if (!(max > 0)) return 30;
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) || raw;
  return Math.max(step, 10) * 3;
}

/** Change against the window before, as the board's delta line, or null. */
function delta(t, cur, prev, days, what) {
  if (prev == null) return null;
  const c = Number(cur || 0);
  const p = Number(prev || 0);
  if (p === 0) return { text: t(what === 'orders' ? 'analytics.noneBeforeOrders' : 'analytics.noneBefore', { days }), dim: true };
  const change = Math.round(((c - p) / p) * 100);
  return {
    text: t('analytics.vsBefore', { arrow: change < 0 ? '▼' : '▲', pct: Math.abs(change), days }),
    down: change < 0,
  };
}

function Kpi({ label, value, sub }) {
  return (
    <div className="bx-card bx-kpi">
      <span className="bx-sm bx-dim">{label}</span>
      <b>{value}</b>
      {sub && (sub.dim
        ? <span className="bx-xs bx-dim">{sub.text}</span>
        : <span className={`bx-delta${sub.down ? ' down' : ''}`}>{sub.text}</span>)}
    </div>
  );
}

/** The bar chart: the board's plot, a bar per day (or month), the peak picked out. */
/**
 * A window's dates in words, from the locale's own month names: Chrome's
 * Intl has no Georgian dates ("ka" comes out in English), so they are not
 * left to it. "2–31 ოქტომბერი", "3 ოქტომბერი – 1 ნოემბერი", "აგვისტო – ოქტომბერი".
 */
function rangeWords(t, from, to, monthly) {
  const years = from.getFullYear() !== to.getFullYear();
  const month = (d) => {
    const name = t(`finances.month.${d.getMonth() + 1}`);
    return years ? t('finances.monthYear', { month: name, year: d.getFullYear() }) : name;
  };
  if (monthly) {
    const same = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
    return same ? month(from) : t('analytics.monthRange', { from: month(from), to: month(to) });
  }
  if (!years && from.getMonth() === to.getMonth()) {
    return t('analytics.rangeSameMonth', { from: from.getDate(), to: to.getDate(), month: month(from) });
  }
  return t('analytics.rangeTwoMonths', { from: from.getDate(), fromMonth: month(from), to: to.getDate(), toMonth: month(to) });
}

function Chart({ t, data }) {
  const points = data.series || [];
  const monthly = data.unit === 'month';
  const vals = points.map((p) => Number(p.revenue || 0));
  const max = Math.max(0, ...vals);
  const top = niceTop(max);
  const peakAt = max > 0 ? vals.indexOf(max) : -1;
  const n = points.length;
  const short = (iso) => {
    const d = day(monthly ? `${iso}-01` : iso);
    const m = t(`analytics.monthShort.${d.getMonth() + 1}`);
    return monthly ? m : t('analytics.dayMonth', { day: d.getDate(), month: m });
  };
  const long = (iso) => {
    const d = day(iso);
    return t('analytics.dayLong', { day: d.getDate(), month: t(`finances.month.${d.getMonth() + 1}`) });
  };
  const range = rangeWords(t, day(data.from), day(data.to), monthly);
  const k = Math.max(1, Math.round(n / 5));
  const mid = Math.floor((n - 1) / 2);
  const midSpan = 2 * Math.floor(k / 2) + 1;
  // The board's three dates (first, middle, last) under a long run of bars;
  // under a few, each bar its own, centred on it.
  const labels = [];
  if (n <= 6) {
    points.forEach((p, i) => labels.push({ i, col: `${i + 1} / span 1`, align: 'center' }));
  } else {
    labels.push({ i: 0, col: `1 / span ${Math.min(k, n)}`, align: 'left' });
    labels.push({ i: mid, col: `${Math.max(1, mid + 1 - Math.floor(midSpan / 2))} / span ${midSpan}`, align: 'center' });
    labels.push({ i: n - 1, col: `${Math.max(1, n - k + 1)} / span ${Math.min(k, n)}`, align: 'right' });
  }
  const peak = peakAt >= 0 ? points[peakAt] : null;
  const aria = t(monthly ? 'analytics.chartAriaMonths' : 'analytics.chartAria', {
    range, total: money(data.revenue),
    peak: peak ? t('analytics.chartPeak', { when: monthly ? short(peak.date) : long(peak.date), amount: money(max) }) : '',
  });
  const ticks = [1, 2 / 3, 1 / 3, 0];

  return (
    <div className="bx-card bx-padl bx-stk" style={{ gap: 14 }}>
      <div className="bx-stk" style={{ gap: 2 }}>
        <b className="bx-h3">{t(monthly ? 'analytics.byMonth' : 'analytics.byDay')}</b>
        <span className="bx-xs bx-dim">{t(monthly ? 'analytics.rangeMonths' : 'analytics.rangeDays', { range })}</span>
      </div>
      <div className="bx-plot" role="img" aria-label={aria}>
        <div className="bx-plot-y" aria-hidden="true">
          {ticks.map((f) => <span key={f} style={{ bottom: `${f * 100}%` }}>{money(Math.round(top * f))}</span>)}
        </div>
        <div className="bx-plot-area">
          {ticks.slice(0, 3).map((f) => <i key={f} className="bx-plot-g" style={{ bottom: `${f * 100}%` }} />)}
          <div className={`bx-bars${n > 45 ? ' dense' : ''}`}>
            {vals.map((v, i) => (
              <i
                key={points[i].date}
                className={i === peakAt ? 'hi' : v === 0 ? 'zero' : undefined}
                style={{ height: `${Math.round((v / top) * 1000) / 10}%` }}
              >
                {i === peakAt && <em className="bx-bar-v">{money(v)}</em>}
              </i>
            ))}
          </div>
        </div>
      </div>
      <div className="bx-plot-x bx-xs bx-dim" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${Math.max(1, n)}, minmax(0, 1fr))` }}>
        {labels.map((l) => (
          <span key={l.i} style={{ gridColumn: l.col, gridRow: 1, textAlign: l.align }}>{short(points[l.i].date)}</span>
        ))}
      </div>
      <p className="bx-xs bx-dim">{t('analytics.excludes')}</p>
    </div>
  );
}

function TopSellers({ t, rows }) {
  return (
    <div className="bx-card bx-stk" style={{ gap: 0 }}>
      <div className="bx-pad" style={{ borderBottom: '1px solid var(--k-line)' }}>
        <b className="bx-h3">{t('analytics.top')}</b>
      </div>
      {rows.length === 0 && <div className="bx-li bx-sm bx-dim">{t('analytics.topNone')}</div>}
      {rows.map((r) => (
        <div key={`${r.productId ?? ''}|${r.title}`} className="bx-li">
          <span className="bx-ph" style={{ width: 40, borderRadius: 10 }}>
            {r.imageUrl ? <img src={r.imageUrl} alt="" loading="lazy" /> : <BxIcon name="products" style={{ width: 18, height: 18 }} />}
          </span>
          <div className="bx-grow">
            <b className="bx-sm" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</b>
            <div className="bx-xs bx-dim">{t('analytics.sold', { count: Number(r.quantity || 0) })}</div>
          </div>
          <b className="bx-price">{money(r.revenue)}</b>
        </div>
      ))}
    </div>
  );
}

export default function ManagerStats() {
  const { T } = useTK();
  const { t, i18n } = useTranslation('manager');
  const lang = i18n.language;
  const { tenant } = useTenant();
  const [params, setParams] = useSearchParams();
  const devTenant = params.get('tenant') || undefined;
  // The window rides the URL (?days=7|30|90|all), so a reload or a shared
  // link keeps it; 30 days when none is given, as the board opens.
  const asked = params.get('days');
  const [days, setDays] = useState(asked === 'all' ? null : PERIODS.includes(Number(asked)) ? Number(asked) : 30);
  const { data, loading, error } = usePeriodStats(days, devTenant);
  const name = tenant?.displayName || tenant?.name || devTenant || '';

  const choose = (d) => {
    setDays(d);
    const next = new URLSearchParams(params);
    next.set('days', d ? String(d) : 'all');
    setParams(next, { replace: true });
  };

  const prev = data?.previous;
  const refundShare = data && Number(data.sales) > 0 ? (Number(data.refunded || 0) / Number(data.sales)) * 100 : 0;

  return (
    <div className="bx-page">
      <MTop T={T} title={t('analytics.title')} sub={name ? t('analytics.sub', { name }) : undefined} />

      <div className="bx-seg" role="group" aria-label={t('analytics.period')} style={{ maxWidth: 360, width: '100%' }}>
        {PERIODS.map((d) => (
          <button key={d || 'all'} type="button" className={d === days ? 'on' : undefined} aria-pressed={d === days} onClick={() => choose(d)}>
            {d ? t('analytics.days', { count: d }) : t('analytics.all')}
          </button>
        ))}
      </div>

      {loading && <div className="bx-sm bx-dim">{t('analytics.loading')}</div>}
      {error && !loading && <Alert tone="bad" icon="warn"><span className="bx-sm">{handleApiError(error, t('analytics.loadFailed'))}</span></Alert>}

      {data && !loading && (
        <>
          <div className="bx-kpis">
            <Kpi label={t('analytics.revenue')} value={money(data.revenue)} sub={delta(t, data.revenue, prev?.revenue, days, 'revenue')} />
            <Kpi label={t('analytics.orders')} value={String(data.orders ?? 0)} sub={delta(t, data.orders, prev?.orders, days, 'orders')} />
            <Kpi
              label={t('analytics.average')}
              value={data.average == null ? '—' : wholeLari(data.average)}
              sub={data.average == null ? null : {
                dim: true,
                text: prev?.average != null
                  ? t('analytics.averageOfBefore', { count: Number(data.counted || 0), before: wholeLari(prev.average) })
                  : t('analytics.averageOf', { count: Number(data.counted || 0) }),
              }}
            />
            <Kpi
              label={t('analytics.refunds')}
              value={String(data.refundCount ?? 0)}
              sub={Number(data.refundCount) > 0
                ? { dim: true, text: t('analytics.refundsOf', { amount: money(data.refunded), pct: pct1(refundShare, lang) }) }
                : null}
            />
          </div>

          <div className="bx-two">
            <Chart t={t} data={data} />
            <TopSellers t={t} rows={data.top || []} />
          </div>
        </>
      )}
    </div>
  );
}
