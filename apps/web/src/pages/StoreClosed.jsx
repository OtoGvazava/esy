// What a shopper sees when the platform has suspended this store (D15).
//
// The design does not draw this screen — its storefront set assumes an open
// shop — but D15 and the admin screens require it: suspending is described as
// "closes the storefront and leaves the data", and until now it did only the
// second half. `suspendedAt` was set, the admin list showed the shop as
// suspended, and the storefront went on serving products and taking orders.
//
// What it deliberately does NOT say: why. The suspension reason is typed by an
// administrator for the platform's own record and the owner's notice; showing
// it to every passing shopper would publish an accusation about a merchant on
// their own address. The shopper is told the shop is closed and pointed at the
// rest of the platform; the owner is told the rest by email.
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { Icons } from '../core/icons';
import { platformUrl } from '../utils/hosts';

export default function StoreClosed() {
  const { T, tenant } = useGlow();
  const { t } = useTranslation('storefront');

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 26px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, background: T.surface2, color: T.textMute,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <Icons.shield size={26} />
        </div>
        <div style={{ font: `700 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>
          {t('closed.title', { name: tenant.name })}
        </div>
        <div style={{ marginTop: 8, font: `400 13.5px/1.6 ${T.font}`, color: T.textDim }}>
          {t('closed.body')}
        </div>
        <a
          href={platformUrl()}
          style={{
            marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 46, padding: '0 20px', borderRadius: 14, textDecoration: 'none',
            background: T.grad, color: '#fff', font: `700 13.5px ${T.font}`,
            boxShadow: `0 10px 24px ${T.accent}55`,
          }}
        >
          {t('closed.browse')} <Icons.arrowR size={14} />
        </a>
      </div>
    </div>
  );
}
