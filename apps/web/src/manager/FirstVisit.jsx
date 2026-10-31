// A store's first days in the back office: the design's M1b ("the store is
// live" checklist on the overview) and M2's empty orders screen.
//
// Every tick is read from the store itself, never assumed:
//   name and link   — the store exists, so it has both
//   design          — the theme its storefront draws: the published design, or
//                     Liquid Glass, which a store without one is drawn in
//   first product   — the store's product count (/api/tenant/stats)
//   delivery prices — the routes shoppers are offered (/api/delivery/public):
//                     a courier route, or collection with an address to come
//                     to. Collection with nowhere named is the untouched
//                     default every store starts with.
//   card payments   — whether the store has connected Bank of Georgia, as its
//                     settings report it (bogConfigured)
//   share the link  — nothing records that a link was shared, so it is never
//                     ticked; the store's first order is what completes it, and
//                     the overview returns to its figures then.
// The actions lead to the screen that does the job. Delivery and payments are
// the owner's settings, so a manager is shown whose they are instead.
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTenant } from '../contexts/TenantContext';
import { Card, Chip } from '../core/primitives';
import { money } from '../core/money';
import { track } from '../core/tokens';
import { normalizeDesign } from '../core/design/normalize';
import { deliveryApi } from '../utils/api';
import { MTop } from './ManagerShell';
import { StatCard } from './ManagerStats';
import { useStoreLink } from './storeLink';

const glyph = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
};

const Receipt = ({ size = 40 }) => (
  <svg {...glyph} width={size} height={size}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

const Done = () => (
  <svg {...glyph} style={{ flex: 'none' }}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8 12.5 3 3 5-6" />
  </svg>
);

const LinkGlyph = () => (
  <svg {...glyph}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);

/**
 * The design's button: its small one (btn-sm, 40px here so it is still a
 * phone-sized target) or, with `regular`, the 48px one.
 */
const btnStyle = (T, primary, regular) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  height: regular ? 48 : 40, padding: regular ? '0 22px' : '0 15px', borderRadius: 12,
  flex: 'none', boxSizing: 'border-box',
  font: `600 ${regular ? 15 : 13.5}px ${T.font}`, whiteSpace: 'nowrap', textDecoration: 'none', cursor: 'pointer',
  border: 'none',
  ...(primary
    ? { background: T.accent, color: T.onAccent }
    : { background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}` }),
});

/** The design's empty state: a glyph in a soft disc, a heading, a line. */
function Empty({ T, disc, title, small, body, children, pad }) {
  const { i18n } = useTranslation();
  const Heading = small ? 'h3' : 'h2';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      gap: 12, padding: pad,
    }}>
      <span aria-hidden="true" style={{
        width: disc, height: disc, borderRadius: '50%', background: T.surface2, color: T.accentFg,
        display: 'grid', placeItems: 'center', flex: 'none',
      }}><Receipt /></span>
      <Heading style={{
        margin: 0, color: T.text,
        font: small ? `600 16px/1.3 ${T.font}` : `700 20px/1.22 ${T.font}`,
        letterSpacing: small ? undefined : track(i18n.language, '-0.015em'),
      }}>{title}</Heading>
      <p style={{
        margin: 0, maxWidth: 420, color: T.textDim,
        font: small ? `400 12.5px/1.45 ${T.font}` : `400 14px/1.45 ${T.font}`,
      }}>{body}</p>
      {children}
    </div>
  );
}

/**
 * M2's empty state: a store with no orders at all is told where they will
 * appear, and given its link to share.
 */
export function NoOrders({ T, sub }) {
  const { t } = useTranslation('manager');
  const { copied, copy } = useStoreLink(sub);
  return (
    <Card T={T} pad={22}>
      <Empty T={T} disc={96} title={t('orders.empty')} body={t('firstVisit.noOrdersBody')} pad="32px 16px">
        <button type="button" onClick={copy} disabled={!sub} style={btnStyle(T, true, true)}>
          <LinkGlyph />
          <span aria-live="polite">{copied ? t('firstVisit.copied') : t('firstVisit.copyLink')}</span>
        </button>
      </Empty>
    </Card>
  );
}

function Step({ T, n, first, step }) {
  const { t } = useTranslation('manager');
  const action = (() => {
    if (step.done) return <span style={{ color: T.successFg, display: 'inline-flex' }}><Done /></span>;
    if (step.ownerOnly) {
      // The owner's setting: say whose it is rather than offer a locked screen.
      return <span style={{ font: `500 12px ${T.font}`, color: T.textDim, flex: 'none' }}>{t('role.OWNER')}</span>;
    }
    if (step.to) return <Link to={step.to} style={btnStyle(T, step.primary)}>{step.act}</Link>;
    return (
      <button type="button" onClick={step.onClick} style={btnStyle(T, step.primary)}>
        <span aria-live="polite">{step.act}</span>
      </button>
    );
  })();
  return (
    <li style={{
      display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, boxSizing: 'border-box',
      padding: '12px 16px', borderTop: first ? 'none' : `1px solid ${T.border}`,
    }}>
      <Chip T={T} style={{
        height: 26, minWidth: 26, padding: '0 10px', boxSizing: 'border-box', justifyContent: 'center',
        font: `600 12px ${T.font}`,
        background: step.done ? T.successBg : T.surface2,
        color: step.done ? T.successFg : T.text,
      }}>{n}</Chip>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `700 12.5px/1.35 ${T.font}`, color: step.done ? T.textDim : T.text }}>{step.title}</div>
        <div style={{ marginTop: 2, font: `400 12px/1.4 ${T.font}`, color: T.textDim, overflowWrap: 'anywhere' }}>
          {step.sub}
        </div>
      </div>
      {action}
    </li>
  );
}

/**
 * The overview of a live store that has had no order yet (M1b). `stats` is
 * the /api/tenant/stats answer the overview already holds.
 */
export default function FirstVisit({ T, mode, sub, q, stats }) {
  const { t, i18n } = useTranslation('manager');
  const { t: td } = useTranslation('design');
  const { isStoreOwner } = useAuth();
  const { isMobile } = useDevice();
  const { tenant } = useTenant();
  const { copied, share } = useStoreLink(sub);
  const titleId = useId();
  const store = stats?.store || {};

  // What shoppers are offered. Unknown until it loads, and a failed read is
  // never counted as done.
  const [delivery, setDelivery] = useState(null);
  useEffect(() => {
    const ac = new AbortController();
    deliveryApi.listPublic(sub, { signal: ac.signal })
      .then((d) => { if (!ac.signal.aborted) setDelivery(d || {}); })
      .catch(() => { if (!ac.signal.aborted) setDelivery({}); });
    return () => ac.abort();
  }, [sub]);

  const deliveryDone = !!delivery && (delivery.requiresAddress === true
    || (delivery.routes || []).some((r) => r.route === 'pickup' && String(r.pickupAddress || '').trim()));
  const theme = normalizeDesign(tenant?.designEnabled ? tenant?.design : null).theme;

  const steps = [
    { key: 'name', done: true, sub: `${store.subdomain || sub}.esy.ge` },
    { key: 'design', done: true, sub: t('firstVisit.designSub', { theme: td(`theme.${theme}`) }) },
    {
      key: 'product', done: Number(stats?.products) > 0,
      sub: t('firstVisit.productSub'), act: t('firstVisit.productAct'), to: `/products${q}`,
    },
    {
      key: 'delivery', done: deliveryDone, ownerOnly: !isStoreOwner,
      sub: t('firstVisit.deliverySub'), act: t('firstVisit.deliveryAct'), to: `/settings/delivery${q}`,
    },
    {
      key: 'card', done: !!store.bogConfigured, ownerOnly: !isStoreOwner,
      sub: t('firstVisit.cardSub'), act: t('firstVisit.cardAct'), to: `/settings/integrations${q}`,
    },
    {
      key: 'share', done: false,
      sub: t('firstVisit.shareSub'),
      act: copied ? t('firstVisit.copied') : t('firstVisit.shareAct'),
      // A phone hands the link to its share sheet (Instagram, WhatsApp…);
      // anything else copies it.
      onClick: () => share(isMobile),
    },
  ].map((s) => ({ ...s, title: t(`firstVisit.${s.key}`) }));

  // The next thing to do is the one drawn as primary.
  const next = steps.find((s) => !s.done && !s.ownerOnly);
  if (next) next.primary = true;

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const desktop = mode === 'desktop';
  const gap = desktop ? 20 : mode === 'tablet' ? 18 : 14;

  return (
    <div>
      <MTop T={T} mode={mode} title={t('overview.title')} sub={store.displayName || store.name || undefined} />

      {!delivery && (
        <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('overview.loading')}</div>
      )}

      {delivery && (
        <>
          <Card T={T} pad={22} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <h2 id={titleId} style={{
                  margin: 0, color: T.text, font: `700 20px/1.22 ${T.font}`,
                  letterSpacing: track(i18n.language, '-0.015em'),
                }}>{t('firstVisit.title')}</h2>
                <span style={{ font: `400 12.5px/1.45 ${T.font}`, color: T.textDim }}>
                  {t('firstVisit.left', { count: total - done })}
                </span>
              </div>
              <Chip T={T} tone="accent" style={{
                height: 26, padding: '0 10px', boxSizing: 'border-box', font: `600 12px ${T.font}`, flex: 'none',
              }}>{t('firstVisit.progress', { done, total })}</Chip>
            </div>
            <div
              role="progressbar" aria-labelledby={titleId}
              aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
              aria-valuetext={t('firstVisit.progress', { done, total })}
              style={{ height: 6, borderRadius: 3, background: T.surface2, overflow: 'hidden', flex: 'none' }}
            >
              <i style={{
                display: 'block', height: '100%', width: `${Math.round((done / total) * 100)}%`,
                background: T.accent, borderRadius: 3,
              }} />
            </div>
          </Card>

          <div style={{
            display: 'grid', gap: 20, marginTop: gap, alignItems: 'start',
            gridTemplateColumns: desktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          }}>
            <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {steps.map((s, i) => <Step key={s.key} T={T} n={i + 1} first={i === 0} step={s} />)}
              </ol>
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: isMobile ? 12 : 16 }}>
                <StatCard T={T} label={t('overview.revenue')} value={money(stats?.revenue ?? 0)} hint={t('firstVisit.revenueHint')} />
                <StatCard T={T} label={t('overview.orders')} value={String(stats?.orders ?? 0)} hint={t('firstVisit.ordersHint')} />
              </div>
              <Card T={T} pad={16}>
                <Empty T={T} disc={72} small title={t('orders.empty')} body={t('firstVisit.emptyBody')} pad="16px 8px" />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
