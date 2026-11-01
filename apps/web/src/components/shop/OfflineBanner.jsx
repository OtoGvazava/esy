// Offline (the design's E4): a notice at the top of the store while the
// browser has no connection. What it says is what is true here — the page
// keeps the products it already loaded, and the bag lives in the page, so
// nothing in it is lost.
//
// The design also draws a toast for adding to the bag while offline ("it will
// be added once you are back online"). This store's bag is kept in the page,
// not on a server, so an offline add simply happens; there is nothing to queue
// and no toast to show.
//
// "Try again" asks the store's own server rather than trusting the browser's
// flag, which can lag behind a connection that has come back.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { G, Sk } from './kit';

function useOnline() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return [online, setOnline];
}

export default function OfflineBanner() {
  const { t } = useTranslation('storefront');
  const [online, setOnline] = useOnline();
  const [checking, setChecking] = useState(false);
  if (online) return null;

  const retry = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/tenant/current', { cache: 'no-store', credentials: 'include' });
      if (res.ok) setOnline(true);
    } catch { /* still offline */ }
    setChecking(false);
  };

  return (
    <Sk style={{ position: 'relative', zIndex: 40 }}>
      <div className="gut" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)', paddingBottom: 4 }}>
        <div className="alert warn" role="status" style={{ maxWidth: 1344, margin: '0 auto' }}>
          <G name="wifiOff" />
          <div className="grow" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, rowGap: 6 }}>
            <span className="sm" style={{ flex: '0 1 auto', minWidth: 0 }}><b>{t('offline.title')}</b>{` ${t('offline.body')}`}</span>
            <button type="button" className="link sm" onClick={retry} disabled={checking} style={{ padding: '10px 0', margin: '-10px 0' }}>{t('offline.retry')}</button>
          </div>
        </div>
      </div>
    </Sk>
  );
}
