// <store>.esy.ge/about — the store's own page about itself.
//
// This is where contact channels belong (D10). They were briefly rendered on
// the home hero because this page did not exist; the design puts them here,
// in a card of their own, alongside the long description and the location.
//
// Everything here is public: no sign-in, no store data that a shopper could
// not already see on the storefront.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { useTenant } from '../contexts/TenantContext';
import { GlowScreen, GlowTopNav } from '../components/glow/GlowChrome';
import { Icon } from '../components/glow/GlowPrimitives';
import { Card, Note } from '../core/primitives';
import { Mark } from '../core/domain';
import { StoreContacts } from '../components/store/ContactChannels';
import { deliveryApi } from '../utils/api';

export default function StoreAbout() {
  const { T, tenant } = useGlow();
  const { tenant: store } = useTenant();
  const { t, i18n } = useTranslation('storefront');
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);

  // How a shopper receives goods is part of what they want to know about a
  // shop, so the About page states it rather than saving it for checkout.
  useEffect(() => {
    const ac = new AbortController();
    deliveryApi.listPublic(undefined, { signal: ac.signal })
      .then((res) => { if (!ac.signal.aborted) setRoutes(Array.isArray(res?.routes) ? res.routes : []); })
      .catch(() => { if (!ac.signal.aborted) setRoutes([]); });
    return () => ac.abort();
  }, []);

  const pad = 18;
  const label = { font: `700 14px ${T.font}`, color: T.text, marginBottom: 12 };

  return (
    <GlowScreen T={T} padBottom={40}>
      <GlowTopNav T={T} title={t('about.title')} onBack={() => navigate(-1)} />

      <div style={{ padding: `0 ${pad}px`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card
          T={T}
          pad={24}
          style={{
            textAlign: 'center',
            background: `linear-gradient(135deg, ${T.accent}1c, transparent 65%), ${T.surface}`,
          }}
        >
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <Mark T={T} store={{ name: tenant?.name, accent: T.accent }} size={64} radius={20} />
          </div>
          <div style={{ font: `700 22px ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>
            {tenant?.name}
          </div>
          {store?.addressCity && (
            <div style={{
              marginTop: 6, font: `500 12.5px ${T.font}`, color: T.textDim,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon.pin /> {[store.addressStreet, store.addressCity].filter(Boolean).join(', ')}
            </div>
          )}
        </Card>

        {store?.description && (
          <Card T={T} pad={pad}>
            <div style={{ font: `400 13.5px/1.7 ${T.font}`, color: T.textDim }}>
              {store.description}
            </div>
          </Card>
        )}

        {/* Contacts render nothing at all when the store has published none,
            so this card would be an empty promise — it is only drawn once
            there is something in it. */}
        <ContactsCard T={T} t={t} label={label} pad={pad} />

        {routes.length > 0 && (
          <Card T={T} pad={pad}>
            <div style={label}>{t('about.delivery')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {routes.map((r) => {
                const eta = i18n.language === 'ka' ? r.etaKa : r.etaEn;
                const free = Number(r.price) === 0;
                return (
                  <div key={r.route} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: T.accentFg, display: 'inline-flex' }}>
                      {r.courier ? <Icon.truck /> : <Icon.pin />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', font: `600 13px ${T.font}`, color: T.text }}>
                        {t(`checkout.route.${r.route}`)}
                      </span>
                      {(eta || r.pickupAddress) && (
                        <span style={{ display: 'block', font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>
                          {[eta, r.pickupAddress, r.pickupHours].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    <span style={{
                      font: `700 12.5px ${T.font}`,
                      color: free ? T.success : T.text,
                      flexShrink: 0,
                    }}>
                      {free ? t('checkout.free') : `${r.price} ₾`}
                    </span>
                  </div>
                );
              })}
            </div>
            <Note T={T} style={{ marginTop: 12 }}>{t('about.deliveryNote')}</Note>
          </Card>
        )}
      </div>
    </GlowScreen>
  );
}

/**
 * Wraps StoreContacts so the heading shares its fate: StoreContacts renders
 * null when nothing is published, and a "Contact" card with nothing under it
 * reads as "you cannot reach this shop" rather than "it has not said yet".
 */
function ContactsCard({ T, t, label, pad }) {
  const [hasAny, setHasAny] = useState(false);
  return (
    <div style={{ display: hasAny ? 'block' : 'none' }}>
      <Card T={T} pad={pad}>
        <div style={label}>{t('about.contact')}</div>
        <StoreContacts T={T} onLoaded={setHasAny} />
      </Card>
    </div>
  );
}
