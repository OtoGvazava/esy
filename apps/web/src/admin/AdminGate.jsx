// The two states a visitor to admin.esy.ge can be in before the screens
// (the design's AD0): signed out, and signed in with an account that is not
// an administrator.
//
// Both are drawn rather than left to a redirect, because the likely visitor
// in the second state is a merchant who followed a link: they are told
// plainly that admin access comes only from the server's ADMIN_EMAILS list,
// shown which account they are signed in with, and offered the two ways on —
// another account, or the back office where their shop lives.
//
// Phone: the content sits at the top of the page. Tablet and desktop: one
// centred card, 460px at most.
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { EsyMark } from '../core/domain';
import { IconGoogle } from '../core/icons';
import { Glyph, KitBtn, KitChip, Mono } from './AdminKit';

/** manager.<base> on the same scheme and port as this host. */
function managerUrl() {
  const { hostname, port, protocol } = window.location;
  const p = port ? `:${port}` : '';
  const base = hostname.endsWith('lvh.me') ? 'lvh.me'
    : hostname.endsWith('localhost') ? 'localhost' : 'esy.ge';
  return `${protocol}//manager.${base}${p}/`;
}

/** Two initials from the profile name, else the first letter of the email. */
function initials(user) {
  const parts = [user?.firstName, user?.lastName].filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
  if (parts.length) return parts.map((s) => s.charAt(0)).join('').slice(0, 2).toUpperCase();
  return String(user?.email || '?').charAt(0).toUpperCase();
}

export default function AdminGate({ T, kind }) {
  const { t } = useTranslation('admin');
  const { user, signInWithGoogle, logout } = useAuth();
  const { isMobile } = useDevice();
  const denied = kind === 'denied';
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const mono = <Mono T={T} />;

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <EsyMark T={T} size={21} />
        <KitChip T={T} tone="brand">{t('gate.badge')}</KitChip>
      </div>

      {!denied ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{ margin: 0, font: `700 26px/1.15 ${T.font}`, letterSpacing: '-0.02em', color: T.text }}>
              {t('gate.signInTitle')}
            </h1>
            <p style={{ margin: 0, font: `400 14px/1.55 ${T.font}`, color: T.textDim }}>
              <Trans t={t} i18nKey="gate.signInBody" components={{ mono }} />
            </p>
          </div>
          {/* Google's own button colours, as the design draws it. */}
          <button
            type="button"
            onClick={signInWithGoogle}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', height: 54, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#fff', color: '#1f1f1f', boxShadow: 'inset 0 0 0 1.5px #dadce0',
              font: `600 16px/1 ${T.font}`,
            }}
          >
            <IconGoogle size={20} />
            {t('gate.signIn')}
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: '8px 0' }}>
            <span style={{
              width: 72, height: 72, borderRadius: '50%', background: T.surface2, color: T.accentFg,
              display: 'grid', placeItems: 'center',
            }}>
              <Glyph name="lock" size={34} />
            </span>
            <h1 style={{ margin: 0, font: `700 20px/1.22 ${T.font}`, letterSpacing: '-0.015em', color: T.text }}>
              {t('gate.deniedTitle')}
            </h1>
            <p style={{ margin: 0, font: `400 14px/1.55 ${T.font}`, color: T.textDim }}>
              <Trans t={t} i18nKey="gate.deniedBody" components={{ mono }} />
            </p>
          </div>

          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16,
              background: T.surface, border: `1px solid ${T.border}`,
            }}>
              <span aria-hidden="true" style={{
                width: 34, height: 34, borderRadius: '50%', background: T.text, color: T.bg,
                display: 'grid', placeItems: 'center', font: `700 12px ${T.font}`, flex: 'none',
              }}>
                {initials(user)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {name && <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, color: T.text }}>{name}</b>}
                <div style={{
                  font: `500 12px/1.4 ${T.font}`, color: T.textDim,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user.email}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', padding: '12px 0',
                  margin: '-12px 0', color: T.accentFg, font: `600 12.5px ${T.font}`, flex: 'none',
                }}
              >
                {t('gate.otherAccount')}
              </button>
            </div>
          )}

          <KitBtn
            T={T}
            kind="primary"
            size="lg"
            full
            onClick={() => { window.location.href = managerUrl(); }}
            style={{ fontSize: 16 }}
          >
            {t('gate.backToManager')}
          </KitBtn>
        </>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', boxSizing: 'border-box', background: T.bg, color: T.text,
      font: `400 14px ${T.font}`, display: 'flex', justifyContent: 'center',
      alignItems: isMobile ? 'flex-start' : 'center',
      padding: isMobile ? '40px 16px 24px' : 28,
    }}>
      <div style={{
        width: '100%', maxWidth: 460, boxSizing: 'border-box',
        ...(isMobile ? null : {
          padding: 22, borderRadius: 16, background: T.surface,
          border: `1px solid ${T.border}`, boxShadow: '0 1px 2px rgba(16,16,24,0.04)',
        }),
      }}>
        {body}
      </div>
    </div>
  );
}
