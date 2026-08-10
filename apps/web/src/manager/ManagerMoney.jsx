// Money — what the store earned and what it owes the platform (the design's
// MMoney).
//
// This screen exists to answer one question honestly: how much of what came in
// is the merchant's. Three figures that are easy to conflate are kept apart:
//
//   revenue     goods sold, refunds and cancellations excluded (D2)
//   delivery    collected and passed to a courier — never counted as revenue
//   service fee 2% of goods, frozen per order, owed to the platform (D9)
//
// The settlement half does not exist yet. Rather than draw an invoice list
// with nothing behind it, the screen says the fee accrues and no statement is
// sent — which is the true and more useful thing for a merchant to know.
import { useTranslation } from 'react-i18next';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Card, Note } from '../core/primitives';
import { money, FEE_PERCENT } from '../core/money';
import { handleApiError } from '../utils/api';
import { MTop } from './ManagerShell';
import { gcols } from './nav';
import { StatCard } from './ManagerStats';
import { useStoreStats } from './useStoreStats';

export default function ManagerMoney() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { isDesktop, isMobile } = useDevice();
  const devTenant = new URLSearchParams(window.location.search).get('tenant') || undefined;
  const { data, loading, error } = useStoreStats(devTenant);

  const mode = isDesktop ? 'desktop' : isMobile ? 'mobile' : 'tablet';
  const revenue = Number(data?.revenue ?? 0);
  const fees = Number(data?.serviceFeesOwed ?? 0);
  const kept = revenue - fees;

  return (
    <div>
      <MTop T={T} mode={mode} title={t('money.title')} sub={t('money.sub', { percent: FEE_PERCENT })} />

      {loading && (
        <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('money.loading')}</div>
      )}
      {error && !loading && (
        <Note T={T} tone="danger">{handleApiError(error, t('money.loadFailed'))}</Note>
      )}

      {data && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: gcols(mode, 3, 3, 1), gap: isMobile ? 10 : 14 }}>
            <StatCard T={T} label={t('money.revenue')} value={money(revenue)} hint={t('money.revenueHint')} />
            <StatCard T={T} label={t('money.fees', { percent: FEE_PERCENT })} value={money(fees)} tone={T.warnFg} />
            {/* The figure a merchant actually cares about, spelled out rather
                than left as a subtraction for them to do. */}
            <StatCard T={T} label={t('money.kept')} value={money(kept)} tone={T.successFg} hint={t('money.keptHint')} />
          </div>

          <Card T={T} pad={18} style={{ marginTop: 16 }}>
            <div style={{ font: `700 14px ${T.font}`, color: T.text, marginBottom: 8 }}>
              {t('money.howTitle')}
            </div>
            <div style={{ font: `400 13px/1.65 ${T.font}`, color: T.textDim }}>
              {t('money.howBody', { percent: FEE_PERCENT })}
            </div>
          </Card>

          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            <Note T={T}>{t('money.deliveryNote')}</Note>
            {/* The largest gap in the whole scope, stated to the person it
                affects instead of only in the decision log. */}
            <Note T={T} tone="warn">{t('money.noSettlement')}</Note>
          </div>
        </>
      )}
    </div>
  );
}
