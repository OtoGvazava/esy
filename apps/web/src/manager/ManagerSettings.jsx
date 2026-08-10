// Store settings — five sub-screens behind one sub-nav (the design's
// MSettings / MSetNav).
//
// Settings was one long page: shop fields, then branding, then payment keys,
// with delivery and contacts appended to the bottom as an afterthought. That
// is the drift this re-sync corrects. Each concern is now its own screen and
// its own route, so a merchant editing delivery is not scrolling past their
// bank credentials to reach it.
//
// The sub-nav is a column on desktop and a pill row on narrower screens. The
// design also gives mobile a menu-list variant; a scrollable pill row carries
// the same information in less machinery, so that is what this uses.
//
// OWNER-only, matching the API: every endpoint behind these screens refuses a
// MANAGER, so the nav entry that leads here is locked for them too.
import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Card, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { SET_TABS } from './nav';
import { MTop } from './ManagerShell';
import { ContactChannelsEditor } from '../components/store/ContactChannels';
import DeliveryRoutes from '../components/store/DeliveryRoutes';
import StoreSettings from '../pages/StoreSettings';

function SetNav({ T, t, q, column }) {
  const { pathname } = useLocation();
  const wrap = column
    ? { display: 'flex', flexDirection: 'column', gap: 4, width: 232, flexShrink: 0 }
    : { display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 };

  return (
    <div style={wrap}>
      {SET_TABS.map(([k, icon, route]) => {
        const Ic = Icons[icon];
        const on = pathname.startsWith(route);
        return (
          <Link
            key={k}
            to={`${route}${q}`}
            style={{
              display: 'flex', alignItems: column ? 'flex-start' : 'center',
              flexDirection: column ? 'column' : 'row', gap: column ? 2 : 7,
              padding: column ? '10px 12px' : '9px 14px',
              borderRadius: column ? 12 : 999,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              background: on ? T.accentBg : column ? 'transparent' : T.surface,
              border: column ? '1px solid transparent' : `1px solid ${on ? T.accent : T.border}`,
              color: on ? T.accentFg : T.textDim,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: `${on ? 700 : 500} 13px ${T.font}` }}>
              {Ic && <Ic width="15" height="15" />} {t(`settings.${k}`)}
            </span>
            {column && (
              <span style={{ font: `400 11px ${T.font}`, color: T.textMute, paddingLeft: 23 }}>
                {t(`settings.${k}Sub`)}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * One concern's fields from the store form (the design's SetShop / SetBrand /
 * SetIntegrations).
 *
 * All three used to render the WHOLE form, so a merchant on /settings/brand
 * scrolled past the shop fields and their bank credentials to reach a colour
 * picker — the exact long scroll that splitting settings into sub-screens was
 * meant to end. The form still owns its state, its save and the logo/BOG
 * handling; `section` only decides which fields this pane draws.
 */
function FormPane({ T, t, section, note }) {
  return (
    <div>
      {note && (
        <Note T={T} style={{ marginBottom: 14 }}>{t(note)}</Note>
      )}
      <Card T={T} pad={18}>
        <StoreSettings embedded section={section} />
      </Card>
    </div>
  );
}

function Pane({ T, mode, title, sub, children }) {
  return (
    <div>
      <MTop T={T} mode={mode} title={title} sub={sub} />
      {children}
    </div>
  );
}

export default function ManagerSettings() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { isDesktop } = useDevice();
  const { isStoreOwner, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sub = params.get('tenant');
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  const mode = isDesktop ? 'desktop' : 'tablet';

  // The API refuses a MANAGER on every endpoint behind these screens, so the
  // screen should not pretend otherwise.
  useEffect(() => {
    if (!loading && !isStoreOwner) navigate(`/${q}`, { replace: true });
  }, [loading, isStoreOwner, navigate, q]);

  if (!loading && !isStoreOwner) return null;

  const panes = (
    <Routes>
      <Route path="/" element={<Navigate to={`/settings/shop${q}`} replace />} />
      <Route path="/shop" element={
        <Pane T={T} mode={mode} title={t('settings.shop')} sub={t('settings.shopSub')}>
          <FormPane T={T} t={t} section="shop" />
        </Pane>
      } />
      <Route path="/brand" element={
        <Pane T={T} mode={mode} title={t('settings.brand')} sub={t('settings.brandSub')}>
          <FormPane T={T} t={t} section="brand" />
        </Pane>
      } />
      <Route path="/delivery" element={
        <Pane T={T} mode={mode} title={t('settings.delivery')} sub={t('settings.deliverySub')}>
          <Card T={T} pad={18}><DeliveryRoutes T={T} /></Card>
        </Pane>
      } />
      <Route path="/contact" element={
        <Pane T={T} mode={mode} title={t('settings.contact')} sub={t('settings.contactSub')}>
          <Card T={T} pad={18}><ContactChannelsEditor T={T} /></Card>
        </Pane>
      } />
      <Route path="/integrations" element={
        <Pane T={T} mode={mode} title={t('settings.integrations')} sub={t('settings.integrationsSub')}>
          <FormPane T={T} t={t} section="integrations" note="settings.integrationsNote" />
        </Pane>
      } />
      <Route path="*" element={<Navigate to={`/settings/shop${q}`} replace />} />
    </Routes>
  );

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <SetNav T={T} t={t} q={q} column />
        <div style={{ flex: 1, minWidth: 0 }}>{panes}</div>
      </div>
    );
  }
  return (
    <div>
      <SetNav T={T} t={t} q={q} />
      {panes}
    </div>
  );
}
