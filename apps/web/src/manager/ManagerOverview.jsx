// The back office's first screen (the design's MOverview).
//
// It did not exist: `/` rendered the store picker even when a store was
// already selected, so the sidebar's first entry led nowhere. The picker is a
// different job — choosing which store you are in — and now lives only at the
// host root with no store chosen.
//
// Figures come from /api/tenant/stats, the same call Statistics and Money use
// and the same one the platform bills against, so nothing here can disagree
// with what a merchant is charged.
//
// Under the figures sits the design's "waiting for you": the orders a merchant
// has to move next — placed ones to ship, shipped ones to hand to the courier,
// oldest first. A row leads into its order, where the transition is made with
// the order's details in view; the list itself changes nothing.
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Btn, Card, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { money, FEE_PERCENT } from '../core/money';
import { storeOrdersQuery } from '../core/query/managerQueries';
import { handleApiError } from '../utils/api';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import { MTop } from './ManagerShell';
import { StatCard, StatCardSk } from './ManagerStats';
import { useStoreStats } from './useStoreStats';
import { gcols } from './nav';
import { SkIn } from './officeSk';
import FirstVisit from './FirstVisit';

// The API sends status lower-cased with spaces ("out for delivery").
const enumName = (s) => String(s || 'PLACED').toUpperCase().replace(/ /g, '_');

/** The next move for each status that has one, as its button reads. */
const NEXT = { PLACED: 'overview.markShipped', SHIPPED: 'overview.markOut' };

// Latin letters are capitalised; Georgian stays as it is, because its
// "capitals" are Mtavruli, which the design never uses.
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2)
  .map((w) => Array.from(w)[0]).join('').replace(/[a-z]/g, (c) => c.toUpperCase());

/** "10 min ago", in the shopper's language; the moment itself for anything older than a week. */
function ago(iso, lang, t) {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return '';
  const min = Math.round((Date.now() - at.getTime()) / 60000);
  if (min < 1) return t('overview.justNow');
  const rtf = new Intl.RelativeTimeFormat(lang === 'ka' ? 'ka' : 'en', { numeric: 'auto', style: 'short' });
  if (min < 60) return rtf.format(-min, 'minute');
  if (min < 24 * 60) return rtf.format(-Math.round(min / 60), 'hour');
  if (min < 7 * 24 * 60) return rtf.format(-Math.round(min / 1440), 'day');
  return at.toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US', { month: 'short', day: 'numeric' });
}

/** What was ordered, as short as it can be said. */
function itemsOf(o, t) {
  const lines = Array.isArray(o.lines) ? o.lines : [];
  if (lines.length === 1) return `${lines[0].title} ×${lines[0].quantity}`;
  if (lines.length > 1) return t('overview.items', { count: lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0) });
  return '';
}

function Waiting({ T, t, lang, orders, q, isMobile }) {
  const waiting = orders
    .filter((o) => NEXT[enumName(o.status)])
    .sort((a, b) => new Date(a.placed || 0) - new Date(b.placed || 0));
  return (
    <Card T={T} pad={isMobile ? 16 : 18} style={{ marginTop: isMobile ? 14 : 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: waiting.length ? 4 : 8 }}>
        <span style={{ flex: 1, font: `700 16px ${T.font}`, color: T.text }}>
          {t('overview.todo')}{waiting.length > 0 && ` · ${waiting.length}`}
        </span>
        <Link to={`/orders${q}`} style={{ font: `600 13px ${T.font}`, color: T.accentFg, textDecoration: 'none' }}>
          {t('overview.todoAll')}
        </Link>
      </div>
      {waiting.length === 0 && (
        <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim }}>{t('overview.allDone')}</div>
      )}
      {waiting.slice(0, 3).map((o, i) => {
        const name = o.delivery?.recipient || t('orders.noBuyer');
        const meta = [itemsOf(o, t), ago(o.placed, lang, t)].filter(Boolean).join(' · ');
        return (
          <div key={o.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap',
            padding: '14px 0', borderTop: i ? `1px solid ${T.border}` : 'none',
          }}>
            <span style={{
              width: 36, height: 36, flex: 'none', borderRadius: '50%', background: T.text, color: T.bg,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `700 13px ${T.font}`,
            }}>{initials(name)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 14px ${T.font}`, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                #{o.orderNumber || o.id} · {name}
              </div>
              {meta && <div style={{ marginTop: 2, font: `400 12px ${T.font}`, color: T.textMute }}>{meta}</div>}
            </div>
            <span style={{ font: `700 14px ${T.font}`, color: T.text, whiteSpace: 'nowrap' }}>{money(o.total)}</span>
            {/* On a phone the button takes its own line, so the row's text keeps its width. */}
            <Link to={`/orders/${o.id}${q}`} style={{ textDecoration: 'none', flex: isMobile ? '1 0 100%' : 'none' }}>
              <Btn T={T} kind="quiet" size="sm" style={isMobile ? { width: '100%' } : undefined}>
                {t(NEXT[enumName(o.status)])}
              </Btn>
            </Link>
          </div>
        );
      })}
    </Card>
  );
}

/** The to-do card's stand-in: its heading and three order rows, in the same card. */
function WaitingSk({ T, isMobile }) {
  return (
    <Card T={T} pad={isMobile ? 16 : 18} style={{ marginTop: isMobile ? 14 : 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ flex: 1, font: `700 16px ${T.font}` }}><SkIn w="40%" /></span>
        <span style={{ font: `600 13px ${T.font}` }}><SkIn w={64} /></span>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap',
          padding: '14px 0', borderTop: i ? `1px solid ${T.border}` : 'none',
        }}>
          <Sk w={36} h={36} r={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 14px ${T.font}` }}><SkIn w="55%" /></div>
            <div style={{ marginTop: 2, font: `400 12px ${T.font}` }}><SkIn w="35%" /></div>
          </div>
          <span style={{ font: `700 14px ${T.font}` }}><SkIn w={56} /></span>
          <Sk w={isMobile ? '100%' : 120} h={36} r={13} style={isMobile ? { flex: '1 0 100%' } : undefined} />
        </div>
      ))}
    </Card>
  );
}

export default function ManagerOverview() {
  const { T } = useTK();
  const { t, i18n } = useTranslation('manager');
  const { isDesktop, isMobile } = useDevice();
  const [params] = useSearchParams();
  const sub = params.get('tenant');
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  const { data, loading, error } = useStoreStats();
  // The to-do list is a convenience: if it cannot load, the figures still show.
  const waiting = useQuery(storeOrdersQuery());
  const orders = waiting.isError ? [] : waiting.data ?? null;

  const mode = isDesktop ? 'desktop' : isMobile ? 'mobile' : 'tablet';
  const tiles = { display: 'grid', gridTemplateColumns: gcols(mode, 4, 2, 2), gap: isMobile ? 10 : 14 };

  // M1b: a live store that has never had an order (the count includes
  // cancelled ones) opens on what is left to do before it can take one. Its
  // first order brings the figures back. A paused or suspended store is not
  // "live", so it keeps the figures.
  const store = data?.store;
  if (data && !loading && Number(data.orders) === 0 && store?.isActive !== false && !store?.suspended) {
    return <FirstVisit T={T} mode={mode} sub={sub} q={q} stats={data} />;
  }

  return (
    <div>
      <MTop
        T={T}
        mode={mode}
        title={t('overview.title')}
        sub={sub ? `${sub}.esy.ge` : undefined}
      />

      {/* The four figures in their own grid, the note under them, the to-do
          card and the link to the statistics, until the figures are in. */}
      {loading && (
        <Skeleton label={t('overview.loading')}>
          <div style={tiles}>
            <StatCardSk T={T} />
            <StatCardSk T={T} />
            <StatCardSk T={T} hint />
            <StatCardSk T={T} />
          </div>
          <div style={{ marginTop: 10, font: `400 12px/1.5 ${T.font}` }}><SkIn w="62%" /></div>
          <WaitingSk T={T} isMobile={isMobile} />
          <Sk w={150} h={36} r={13} style={{ marginTop: 18 }} />
        </Skeleton>
      )}
      {error && !loading && (
        <Note T={T} tone="danger">{handleApiError(error, t('overview.loadFailed'))}</Note>
      )}

      {data && !loading && (
        <>
          <div style={tiles}>
            <StatCard T={T} label={t('overview.revenue')} value={money(data.revenue)} />
            <StatCard T={T} label={t('overview.orders')} value={String(data.orders ?? 0)} />
            <StatCard
              T={T} label={t('overview.feesOwed')} value={money(data.serviceFeesOwed)}
              hint={t('overview.feeHint', { percent: FEE_PERCENT })}
            />
            <StatCard T={T} label={t('overview.products')} value={String(data.products ?? 0)} />
          </div>

          <div style={{ marginTop: 10, font: `400 12px/1.5 ${T.font}`, color: T.textMute }}>
            {t('overview.excludes')}
          </div>

          {orders ? (
            <Waiting T={T} t={t} lang={i18n.language} orders={orders} q={q} isMobile={isMobile} />
          ) : (
            <Skeleton label={t('overview.loading')}><WaitingSk T={T} isMobile={isMobile} /></Skeleton>
          )}

          <div style={{ marginTop: 18 }}>
            <Link to={`/stats${q}`} style={{ textDecoration: 'none' }}>
              <Btn T={T} kind="ghost" size="sm">
                <Icons.chart width="14" height="14" /> {t('overview.seeStats')}
              </Btn>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
