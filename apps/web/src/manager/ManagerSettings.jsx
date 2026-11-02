// Store settings — six tabs behind one row of pills (the design's Z1–Z7):
// shop, brand, design, delivery, contact and card payments, each its own
// route, so a merchant editing delivery is not scrolling past their bank
// credentials to reach it.
//
// Every tab under one header, "Settings · owner only", as the boards draw
// it; the pills wrap on a narrow screen rather than scroll. The four form
// tabs end in one save bar each (SaveBar); the design tab keeps its own draft
// and publish controls, and payments its connect button.
//
// OWNER-only, matching the API: every endpoint behind these screens refuses a
// MANAGER, so the nav entry that leads here is locked for them too.
import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePendingLocation } from '../core/useIndicator';
import { useTK } from '../core/useTK';
import { SET_TABS } from './nav';
import { MTop } from './ManagerShell';
import ManagerDesign from './ManagerDesign';
import { BrandTab, PaymentsTab, ShopTab } from './SettingsStore';
import DeliveryTab from './SettingsDelivery';
import ContactTab from './SettingsContact';

function Pills({ t, q }) {
  // The tab being opened is the one marked, so a tap is answered while its
  // reads are still on the way. Leaving settings altogether keeps the tab on
  // screen marked until the next screen takes its place.
  const going = usePendingLocation().pathname;
  const here = useLocation().pathname;
  const pathname = going.startsWith('/settings') ? going : here;
  return (
    <nav className="bx-pills" aria-label={t('settingsTabs.tabs')}>
      {SET_TABS.map(([k, , route]) => {
        const on = pathname.startsWith(route);
        return (
          <Link key={k} to={`${route}${q}`} className={`bx-pill esy-press${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
            {t(`settingsTabs.tab.${k}`)}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ManagerSettings() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { isStoreOwner, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sub = params.get('tenant');
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';

  // The API refuses a MANAGER on every endpoint behind these screens, so the
  // screen should not pretend otherwise.
  useEffect(() => {
    if (!loading && !isStoreOwner) navigate(`/${q}`, { replace: true });
  }, [loading, isStoreOwner, navigate, q]);

  if (!loading && !isStoreOwner) return null;

  return (
    <div className="bx-page fill">
      <MTop T={T} title={t('settingsTabs.title')} sub={t('settingsTabs.sub')} />
      <Pills t={t} q={q} />
      <Routes>
        <Route path="/" element={<Navigate to={`/settings/shop${q}`} replace />} />
        <Route path="/shop" element={<ShopTab />} />
        <Route path="/brand" element={<BrandTab />} />
        <Route path="/design" element={<div><ManagerDesign /></div>} />
        <Route path="/delivery" element={<DeliveryTab />} />
        <Route path="/contact" element={<ContactTab />} />
        <Route path="/integrations" element={<PaymentsTab />} />
        <Route path="*" element={<Navigate to={`/settings/shop${q}`} replace />} />
      </Routes>
    </div>
  );
}
