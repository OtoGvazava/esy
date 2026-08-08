// The storefront's ONLY management affordance (scope rule: no admin functions
// in the store). Shown to OWNER/MANAGER accounts; a click leaves the shop and
// opens the back office scoped to this store. Full page load — different host.
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useGlow } from '../styles/glow';
import { useTenant } from '../contexts/TenantContext';
import { managerUrl } from '../hooks/usePlatformHost';

export default function ManageButton() {
  const { canManageStore } = useAuth();
  const { tenant } = useTenant();
  const { T } = useGlow();
  const { t } = useTranslation('owner');
  if (!canManageStore || !tenant?.subdomain) return null;
  return (
    <a
      href={managerUrl(`/products?tenant=${encodeURIComponent(tenant.subdomain)}`)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 999, textDecoration: 'none',
        border: `1px solid ${T.accent}`, background: T.accentBg,
        color: T.accentFg, font: `600 12px ${T.font}`, whiteSpace: 'nowrap',
      }}
    >
      {t('manageStore')}
    </a>
  );
}
