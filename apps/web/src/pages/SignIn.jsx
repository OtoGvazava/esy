import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { platformUrl, storefrontSubdomain } from '../utils/hosts';
import { isAdminHost, isManagerHost } from '../hooks/usePlatformHost';
import { EsyBag, G, GoogleMark, Sk, useDev } from '../components/shop/kit';
import Home from './Home';

// Sign in (the design's B1): a sheet on a phone and a dialog elsewhere, over
// the store itself — the shopper never leaves the shop to sign in. Google is
// the only way in; the line under the button says what comes next (name and
// date of birth, then the number by SMS), which is the registration gate.
//
// Its title follows why it opened: with something in the bag it is the step
// before paying ("sign in and place the order"), otherwise a plain sign-in.
//
// The same page answers /signin on the admin host and the store's account tab
// while signed out; off a storefront it draws over the plain page ground.
// An OAuth round trip that failed comes back here as ?error=…, and says so.
export default function SignIn() {
  const navigate = useNavigate();
  const { key } = useLocation();
  const dev = useDev();
  const { t } = useTranslation('storefront');
  const { signInWithGoogle } = useAuth();
  const { getTotalItems } = useCart();
  const [params] = useSearchParams();
  const oauthError = params.get('error');
  const box = useRef(null);
  const onStore = !!storefrontSubdomain() && !isAdminHost() && !isManagerHost();

  const close = () => (key === 'default' ? navigate('/') : navigate(-1));

  // A modal: the page under it holds still, Escape closes it, and focus
  // starts inside it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    box.current?.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // close reads the location key, which cannot change while this is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {onStore && <div aria-hidden="true" inert><Home /></div>}
      <Sk>
        <div className="scrim" onClick={close} />
        <section
          ref={box}
          tabIndex={-1}
          className="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-title"
          style={{ gap: 18, textAlign: 'center', alignItems: 'center', outline: 'none' }}
        >
          {dev === 'ph' && <span className="grab" />}
          <button type="button" className="ibtn" aria-label={t('signin.close')} onClick={close} style={{ position: 'absolute', top: 14, right: 14, background: 'var(--k-sf2)' }}>
            <G name="x" cls="" />
          </button>
          <EsyBag size={52} />
          <div className="stk" style={{ gap: 8, alignItems: 'center' }}>
            <h1 id="signin-title" className="h1">{getTotalItems() > 0 ? t('signin.titleOrder') : t('signin.title')}</h1>
            <p className="dim" style={{ maxWidth: 380 }}>{t('signin.body')}</p>
          </div>

          {oauthError && (
            <div className="alert bad" role="alert" style={{ width: '100%', textAlign: 'left' }}>
              <G name="warn" />
              <div className="grow stk" style={{ gap: 4 }}>
                <b className="sm">{t('signin.errorTitle')}</b>
                <span className="sm">{t('signin.errorBody')}</span>
                {/* the raw code is the one thing worth quoting when someone reports it */}
                <span className="xs dim mono">{`error: ${oauthError}`}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-lg btn-b"
            onClick={signInWithGoogle}
            style={{ background: '#fff', color: '#1f1f1f', boxShadow: 'inset 0 0 0 1.5px #dadce0' }}
          >
            <GoogleMark />
            <span><Trans t={t} i18nKey="signin.google" components={{ nc: <span className="nc" /> }} /></span>
          </button>
          <p className="sm dim" style={{ maxWidth: 420 }}>{t('signin.next')}</p>
          <p className="xs dim">
            <Trans
              t={t}
              i18nKey="signin.terms"
              components={{
                terms: <a className="link" href={platformUrl('/terms')} />,
                privacy: <a className="link" href={platformUrl('/privacy')} />,
              }}
            />
          </p>
        </section>
      </Sk>
    </>
  );
}
