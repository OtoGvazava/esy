// Statistics for one store (the design's MStats).
//
// Built on /api/tenant/stats, which is the merchant's own view of the same
// figures the platform bills against — revenue here and fees owed on the admin
// billing screen come from one calculation, so the two can never disagree.
//
// The design also shows top products and a 7/30/90-day window. Neither is
// built: the endpoint returns lifetime totals only. The screen says so rather
// than drawing a period selector that changes nothing.
import { useTranslation } from 'react-i18next';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Card, Note } from '../core/primitives';
import { money } from '../core/money';
import { handleApiError } from '../utils/api';
import { useStoreStats } from './useStoreStats';
import { MTop } from './ManagerShell';
import { gcols } from './nav';

export function StatCard({ T, label, value, tone, hint }) {
  return (
    <Card T={T} pad={16}>
      <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ marginTop: 8, font: `800 24px ${T.font}`, color: tone || T.text, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {hint && (
        <div style={{ marginTop: 4, font: `500 11px ${T.font}`, color: T.textMute }}>{hint}</div>
      )}
    </Card>
  );
}

export default function ManagerStats() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { isDesktop, isMobile } = useDevice();
  const devTenant = new URLSearchParams(window.location.search).get('tenant') || undefined;
  const { data, loading, error } = useStoreStats(devTenant);

  const mode = isDesktop ? 'desktop' : isMobile ? 'mobile' : 'tablet';

  return (
    <div>
      <MTop T={T} mode={mode} title={t('stats.title')} sub={t('stats.sub')} />

      {loading && (
        <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('stats.loading')}</div>
      )}
      {error && !loading && (
        <Note T={T} tone="danger">{handleApiError(error, t('stats.loadFailed'))}</Note>
      )}

      {data && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: gcols(mode, 4, 2, 2), gap: isMobile ? 10 : 14 }}>
            <StatCard T={T} label={t('stats.revenue')} value={money(data.revenue)} />
            <StatCard T={T} label={t('stats.orders')} value={String(data.orders ?? 0)} />
            <StatCard T={T} label={t('stats.products')} value={String(data.products ?? 0)} />
            <StatCard
              T={T} label={t('stats.feesOwed')} value={money(data.serviceFeesOwed)}
              tone={T.accentFg} hint={t('stats.feesHint')}
            />
          </div>

          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {/* D2 and D9, stated where the numbers are read rather than only
                in the decision log. */}
            <Note T={T}>{t('stats.excludes')}</Note>
            <Note T={T} tone="warn">{t('stats.lifetimeOnly')}</Note>
          </div>
        </>
      )}
    </div>
  );
}
