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
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Btn, Card, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { money } from '../core/money';
import { handleApiError } from '../utils/api';
import { MTop } from './ManagerShell';
import { StatCard } from './ManagerStats';
import { useStoreStats } from './useStoreStats';
import { gcols } from './nav';

export default function ManagerOverview() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { isDesktop, isMobile } = useDevice();
  const [params] = useSearchParams();
  const sub = params.get('tenant');
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  const { data, loading, error } = useStoreStats(sub || undefined);

  const mode = isDesktop ? 'desktop' : isMobile ? 'mobile' : 'tablet';

  return (
    <div>
      <MTop
        T={T}
        mode={mode}
        title={t('overview.title')}
        sub={sub ? `${sub}.esy.ge` : undefined}
      />

      {loading && (
        <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('overview.loading')}</div>
      )}
      {error && !loading && (
        <Note T={T} tone="danger">{handleApiError(error, t('overview.loadFailed'))}</Note>
      )}

      {data && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: gcols(mode, 4, 2, 2), gap: isMobile ? 10 : 14 }}>
            <StatCard T={T} label={t('overview.revenue')} value={money(data.revenue)} />
            <StatCard T={T} label={t('overview.orders')} value={String(data.orders ?? 0)} />
            <StatCard
              T={T} label={t('overview.feesOwed')} value={money(data.serviceFeesOwed)}
              tone={T.warnFg}
            />
            <StatCard T={T} label={t('overview.products')} value={String(data.products ?? 0)} />
          </div>

          <Note T={T} style={{ marginTop: 14 }}>{t('overview.excludes')}</Note>

          {/* The design puts a sales-by-day chart and a top-products list
              here. Both need per-day and per-product aggregates the stats
              endpoint does not return, so the space says what is missing
              rather than showing an empty chart frame that reads as "no
              sales". */}
          <Note T={T} tone="warn" style={{ marginTop: 10 }}>{t('overview.chartsPending')}</Note>

          <div style={{
            display: 'grid', gap: 10, marginTop: 18,
            gridTemplateColumns: gcols(mode, 3, 2, 1),
          }}>
            {[
              ['products', 'box', t('nav.products')],
              ['orders', 'bag', t('nav.orders')],
              ['settings', 'gear', t('nav.settings')],
            ].map(([key, icon, label]) => {
              const Ic = Icons[icon];
              return (
                <Link key={key} to={`/${key}${q}`} style={{ textDecoration: 'none' }}>
                  <Card T={T} pad={16} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: T.accentFg, display: 'inline-flex' }}>
                      {Ic && <Ic width="17" height="17" />}
                    </span>
                    <span style={{ flex: 1, font: `600 13.5px ${T.font}`, color: T.text }}>{label}</span>
                    <Icons.arrowR width="14" height="14" />
                  </Card>
                </Link>
              );
            })}
          </div>

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
