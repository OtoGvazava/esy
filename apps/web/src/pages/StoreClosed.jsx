// What a shopper sees when the platform has suspended this store (D15; the
// design's E2, "suspended").
//
// A suspended store has no storefront of its own, so the page is esy's: the
// platform's bar and the esy theme in the platform's blue (App.jsx ThemeRoot
// switches the theme for it), not the store's colours. It points at the two
// places that still work — the shopper's orders in their esy account, and the
// other stores — on the platform's own host.
//
// What it deliberately does NOT say: why. The suspension reason is typed by an
// administrator for the platform's own record and the owner's notice; showing
// it to every passing shopper would publish an accusation about a merchant on
// their own address. The owner is told the rest by email.
//
// The design's other closed state, a store on holiday ("paused", with a
// reopening date and "tell me when it opens"), has no counterpart in the data:
// a store cannot pause itself, so it is not drawn.
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { TenantContext } from '../contexts/TenantContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { platformUrl, managerUrl } from '../utils/hosts';
import { EsyBag, G, Sk, initials, useDev } from '../components/shop/kit';

export default function StoreClosed() {
  const dev = useDev();
  const { t } = useTranslation('storefront');
  const { tenant } = useContext(TenantContext);
  const { user, isAuthenticated } = useAuth();
  const { language, setLanguage } = useThemeMode();
  const domain = tenant?.subdomain ? `${tenant.subdomain}.esy.ge` : 'esy.ge';
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  return (
    <Sk style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--k-bg)' }}>
      <header className="p-nav">
        <a href={platformUrl('/')} className="logo" aria-label="esy">
          <EsyBag size={30} color="var(--k-brand)" />
          {'esy'}
        </a>
        {dev !== 'ph' && (
          <nav className="p-links" aria-label="esy">
            <a href={platformUrl('/stores')}>{t('closed.stores')}</a>
            <a href={platformUrl('/help')} target="_blank" rel="noopener noreferrer">{t('closed.help')}</a>
          </nav>
        )}
        <div className="row" style={{ marginLeft: 'auto', gap: 10 }}>
          {dev !== 'ph' && setLanguage && (
            <button type="button" className="btn btn-g btn-sm" aria-label={t('closed.langToggle')} onClick={() => setLanguage(language === 'ka' ? 'en' : 'ka')}>
              {'ქა · EN'}
            </button>
          )}
          {isAuthenticated ? (
            <span className="av sm u" role="img" aria-label={name}>{initials(name)}</span>
          ) : (
            <a href={platformUrl('/signin')} className="btn btn-g btn-sm">{t('closed.signIn')}</a>
          )}
          {/* the owner's way to the notice and the rest of the store */}
          {isAuthenticated && user?.ownsCurrentStore && dev !== 'ph' && (
            <a href={managerUrl(`/?tenant=${encodeURIComponent(tenant?.subdomain || '')}`)} className="btn btn-s btn-sm">{t('closed.myStore')}</a>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px 72px' }}>
        <div className="empty" style={{ maxWidth: 460, gap: 16 }}>
          <span className="empty-ic" style={{ background: 'var(--k-mute-bg)', color: 'var(--k-mute)' }}><G name="store" /></span>
          <h1 className="h1">{t('closed.title')}</h1>
          <p className="dim">{t('closed.body', { domain })}</p>
          <div className="stk" style={{ gap: 10, width: '100%' }}>
            <a href={platformUrl('/account/orders')} className="btn btn-p btn-lg btn-b">{t('closed.myOrders')}</a>
            <a href={platformUrl('/stores')} className="btn btn-g btn-b">{t('closed.otherStores')}</a>
          </div>
        </div>
      </main>
    </Sk>
  );
}
