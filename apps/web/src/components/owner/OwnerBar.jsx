import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { useOwnerTools } from '../../contexts/OwnerToolsContext';

// Inline owner action bar for the storefront (Glow-styled, matches FollowPill).
// Renders nothing for shoppers (and for owners in client view). "Add product"
// opens an in-context dialog; "Settings" and "Orders" are full pages.
export default function OwnerBar() {
  const { canManage, addProduct, newOrderCount } = useOwnerTools();
  const { T } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('owner');

  if (!canManage) return null;

  const pill = (extra = {}) => ({
    height: 32, padding: '0 12px', borderRadius: 999,
    border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
    font: `600 12px ${T.font}`, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    ...extra,
  });

  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={addProduct}
        style={pill({ background: T.grad, color: '#fff', border: 'none' })}
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        {t('addProduct')}
      </button>
      <button onClick={() => navigate('/settings/store')} style={pill()}>{t('settings')}</button>
      <button onClick={() => navigate('/manage/orders')} style={pill()}>
        {t('manageOrders')}
        {newOrderCount > 0 && (
          <span
            aria-label={t('ordersNewBadge', { count: newOrderCount })}
            style={{
              minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
              background: T.grad, color: '#fff', font: `700 10px ${T.font}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {newOrderCount > 99 ? '99+' : newOrderCount}
          </span>
        )}
      </button>
    </div>
  );
}
