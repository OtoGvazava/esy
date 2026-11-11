// The back office's front door (the design's M0). Signed out, it asks for the
// Google account; signed in, it lists the stores this account may run — the
// OWNER and MANAGER tiers from /api/account — or, with none, says how to open
// one. ManagerShell shows it on every visit that has no store this account may
// manage, so a link into a store's page works signed out too: signing in keeps
// the path, and ManagerCallback below returns to it.
//
// Choosing a store is a full page load on purpose (see ManagerShell): the
// permission snapshot /api/auth/user returns is computed for ?tenant=.
//
// The colour is esy's own, not a store's: no store is chosen here yet.
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { TK, PLATFORM_BRAND, safeAccent, onColor, track } from '../core/tokens';
import { Chip, Note } from '../core/primitives';
import { EsyMark } from '../core/domain';
import { Icons } from '../core/icons';
import { accountQuery } from '../core/query/queries';
import { platformUrl } from '../utils/hosts';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import { SkIn } from './officeSk';
import { markIfComplete, markLoaded } from '../core/imgFade';

// Where AuthContext's signInWithGoogle keeps the path to come back to. The
// shared AuthCallback only restores ?tenant= and lands on /account, which the
// back office has no screen for; this host returns to the page itself.
const POST_LOGIN = 'esy_post_login';

/**
 * Up to two initials. Latin letters are capitalised; Georgian is left as it
 * is, because its "capitals" are Mtavruli, which the design never uses.
 */
const initials = (text) => String(text || '').trim().split(/\s+/)
  .map((w) => Array.from(w).find((c) => /\p{L}/u.test(c))).filter(Boolean).slice(0, 2).join('')
  .replace(/[a-z]/g, (c) => c.toUpperCase());

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const cardEdge = '0 1px 2px rgba(16,16,24,0.04)';

/** A button-shaped link: 48px, or 54px for `lg`. Never grows taller than that. */
const linkBtn = (T, kind, lg) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', height: lg ? 54 : 48, flex: 'none', boxSizing: 'border-box',
  padding: '0 22px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap',
  font: `600 ${lg ? 16 : 15}px ${T.font}`, cursor: 'pointer',
  ...(kind === 'primary'
    ? { background: T.accent, color: T.onAccent }
    : { background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}` }),
});

/** esy's tokens: the platform blue, whatever store the page last resolved. */
function usePlatformTokens() {
  const { dark } = useTK();
  return useMemo(() => TK(dark, PLATFORM_BRAND), [dark]);
}

/**
 * The page: centred on every device, drawn as a card from tablet up and bare
 * on a phone, with the esy mark and "back office" on top.
 */
function Frame({ T, wide, children }) {
  const { t } = useTranslation('manager');
  return (
    <div style={{
      minHeight: '100vh', boxSizing: 'border-box', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: wide ? 28 : 'calc(env(safe-area-inset-top) + 20px) 16px calc(env(safe-area-inset-bottom) + 20px)',
      background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}`,
    }}>
      <div style={{
        width: '100%', maxWidth: 460, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 20,
        ...(wide ? {
          padding: 22, borderRadius: 16, background: T.surface,
          border: `1px solid ${T.border}`, boxShadow: cardEdge,
        } : null),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <EsyMark T={T} size={21} />
          <span style={{ font: `400 12.5px ${T.font}`, color: T.textDim }}>{t('access.panel')}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The design's h1 (26px, 30 on desktop), or its h2 at 20px with `small`. */
function Title({ T, as, small, children }) {
  const { i18n } = useTranslation();
  const { isDesktop } = useDevice();
  const Tag = as || 'h1';
  return (
    <Tag style={{
      margin: 0, color: T.text,
      font: small ? `700 20px/1.22 ${T.font}` : `700 ${isDesktop ? 30 : 26}px/1.15 ${T.font}`,
      letterSpacing: track(i18n.language, small ? '-0.015em' : '-0.02em'), textWrap: 'balance',
    }}>{children}</Tag>
  );
}

/** Who is signed in, with the way out. */
function Account({ T, user, onSignOut }) {
  const { t } = useTranslation('manager');
  const name = user?.name || user?.email || '';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px 12px 16px', borderRadius: 16,
      background: T.surface, border: `1px solid ${T.border}`, boxShadow: cardEdge,
    }}>
      <span aria-hidden="true" style={{
        width: 34, height: 34, borderRadius: '50%', flex: 'none', background: T.text, color: T.surface,
        display: 'grid', placeItems: 'center', font: `700 12px ${T.font}`,
      }}>{initials(name)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `700 12.5px/1.4 ${T.font}`, color: T.text, ...ellipsis }}>{name}</div>
        {user?.email && user.email !== name && (
          <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim, ...ellipsis }}>{user.email}</div>
        )}
      </div>
      <button type="button" onClick={onSignOut} style={{
        minHeight: 44, padding: '0 6px', border: 'none', background: 'none', cursor: 'pointer',
        font: `600 12.5px ${T.font}`, color: T.accentFg, flex: 'none',
      }}>{t('access.signOut')}</button>
    </div>
  );
}

/** A store's mark: its logo, or its initials on its own colour. */
function StoreMark({ T, store }) {
  if (store.logoUrl) {
    return (
      <img src={store.logoUrl} alt="" width={34} height={34}
        className="esy-img" ref={markIfComplete} onLoad={markLoaded}
        style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
    );
  }
  const bg = safeAccent(store.primaryColor, PLATFORM_BRAND);
  return (
    <span aria-hidden="true" style={{
      width: 34, height: 34, borderRadius: '50%', flex: 'none', background: bg, color: onColor(bg),
      display: 'grid', placeItems: 'center', font: `700 12px ${T.font}`,
    }}>{initials(store.displayName || store.name || store.subdomain)}</span>
  );
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

const StoreGlyph = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9.5 5.5 4h13L20 9.5" />
    <path d="M4 9.5h16v1a3 3 0 0 1-5.3 1.9 3 3 0 0 1-5.4 0A3 3 0 0 1 4 10.5z" />
    <path d="M5.5 13v7h13v-7" />
    <path d="M10 20v-4h4v4" />
  </svg>
);

/** The pick state: every store this account may run, with its role. */
function StoreList({ T, stores }) {
  const { t } = useTranslation('manager');
  return (
    <ul style={{
      listStyle: 'none', margin: 0, padding: 0, borderRadius: 16, overflow: 'hidden',
      background: T.surface, border: `1px solid ${T.border}`, boxShadow: cardEdge,
    }}>
      {stores.map((s, i) => {
        const owner = s.myRole === 'OWNER';
        const host = `${s.subdomain}.esy.ge`;
        return (
          <li key={`${s.subdomain}-${s.myRole}`} style={{ borderTop: i ? `1px solid ${T.border}` : 'none' }}>
            <a href={`/?tenant=${encodeURIComponent(s.subdomain)}`} style={{
              display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, boxSizing: 'border-box',
              padding: '11px 12px 11px 16px', color: T.text, textDecoration: 'none',
            }}>
              <StoreMark T={T} store={s} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, ...ellipsis }}>
                  {s.displayName || s.name}
                </span>
                <span style={{ display: 'block', font: `400 12px/1.4 ${T.font}`, color: T.textDim, ...ellipsis }}>
                  {host}
                </span>
              </span>
              {/* The membership role in words, owner in blue and manager in grey
                  as the design draws them — never the stored code. */}
              <Chip T={T} style={{
                height: 26, padding: '0 10px', boxSizing: 'border-box', font: `600 12px ${T.font}`,
                background: owner ? 'var(--k-info-bg)' : T.surface2,
                color: owner ? 'var(--k-info)' : T.text,
              }}>{t(owner ? 'role.OWNER' : 'role.MANAGER')}</Chip>
              <span style={{ color: T.textDim, display: 'inline-flex' }}><Chevron /></span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** The picker while the account's stores load: its heading and rows in the list's own card. */
function StoreListSk({ T }) {
  const { t } = useTranslation('manager');
  const { isDesktop } = useDevice();
  return (
    <Skeleton label={t('overview.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ font: `700 ${isDesktop ? 30 : 26}px/1.15 ${T.font}` }}><SkIn w="70%" /></div>
      <div style={{
        borderRadius: 16, overflow: 'hidden', background: T.surface, border: `1px solid ${T.border}`, boxShadow: cardEdge,
      }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, boxSizing: 'border-box',
            padding: '11px 12px 11px 16px', borderTop: i ? `1px solid ${T.border}` : 'none',
          }}>
            <Sk w={34} h={34} r={17} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}` }}><SkIn w="45%" /></span>
              <span style={{ display: 'block', font: `400 12px/1.4 ${T.font}` }}><SkIn w="35%" /></span>
            </span>
            <Sk w={64} h={26} r={13} />
          </div>
        ))}
      </div>
      <Sk h={48} r={12} />
    </Skeleton>
  );
}

/**
 * The back office for someone without a store to be in: the sign-in, the
 * store picker, or the way to open a first store.
 */
export default function ManagerHome() {
  const { t } = useTranslation('manager');
  const { user, isAuthenticated, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const { isMobile } = useDevice();
  const T = usePlatformTokens();
  const [params] = useSearchParams();
  const oauthError = params.get('error');
  // The account's stores, OWNER and MANAGER tiers alike, each with its role.
  const account = useQuery({ ...accountQuery(), enabled: !authLoading && isAuthenticated });
  const stores = useMemo(() => (account.data ? [
    ...(account.data.ownedStores || []).map((s) => ({ ...s, myRole: 'OWNER' })),
    ...(account.data.managedStores || []).map((s) => ({ ...s, myRole: 'MANAGER' })),
  ] : null), [account.data]);
  const error = account.isError && !stores ? handleApiError(account.error, t('access.loadFailed')) : '';

  if (authLoading) return <Frame T={T} wide={!isMobile} />;

  if (!isAuthenticated) {
    return (
      <Frame T={T} wide={!isMobile}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Title T={T}>{t('access.title')}</Title>
          <p style={{ margin: 0, color: T.textDim }}>{t('access.body')}</p>
        </div>
        {/* A round trip that came back with ?error= failed somewhere between
            here and Google; the storefront's sign-in says the same. */}
        {oauthError && (
          <Note T={T} tone="danger">
            <b style={{ color: T.text }}>{t('signin.errorTitle', { ns: 'storefront' })}</b>{' '}
            {t('signin.errorBody', { ns: 'storefront' })}
          </Note>
        )}
        <button type="button" onClick={signInWithGoogle} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', height: 54, flex: 'none', padding: '0 22px', borderRadius: 12,
          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          // Google's own button: white with its grey edge, in either mode.
          background: '#fff', color: '#1f1f1f', boxShadow: 'inset 0 0 0 1.5px #dadce0',
          font: `600 16px ${T.font}`,
        }}>
          <Icons.google size={20} />
          {t('access.google')}
        </button>
        <p style={{ margin: 0, font: `400 12.5px/1.45 ${T.font}`, color: T.textDim }}>
          {t('access.noStore')}{' '}
          <a href={platformUrl('/sell')} style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>
            {t('access.openOnEsy')}
          </a>
        </p>
      </Frame>
    );
  }

  return (
    <Frame T={T} wide={!isMobile}>
      <Account T={T} user={user} onSignOut={logout} />

      {error && <Note T={T} tone="danger">{error}</Note>}
      {!stores && !error && <StoreListSk T={T} />}

      {stores && stores.length > 0 && (
        <>
          <Title T={T}>{t('access.pickTitle')}</Title>
          <StoreList T={T} stores={stores} />
          <a href={platformUrl('/sell')} style={linkBtn(T, 'ghost')}>
            <Icons.plus size={20} />
            {t('access.newStore')}
          </a>
        </>
      )}

      {stores && stores.length === 0 && (
        <>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            gap: 12, padding: '12px 0',
          }}>
            <span aria-hidden="true" style={{
              width: 96, height: 96, borderRadius: '50%', background: T.surface2, color: T.accentFg,
              display: 'grid', placeItems: 'center',
            }}><StoreGlyph /></span>
            <Title T={T} as="h2" small>{t('access.noneTitle')}</Title>
            <p style={{ margin: 0, color: T.textDim }}>{t('access.noneBody')}</p>
          </div>
          <a href={platformUrl('/sell')} style={linkBtn(T, 'primary', true)}>{t('access.openStore')}</a>
          <p style={{ margin: 0, font: `400 12px/1.45 ${T.font}`, color: T.textDim, textAlign: 'center' }}>
            {t('access.noneHint')}
          </p>
        </>
      )}
    </Frame>
  );
}

/**
 * Where Google sends the back office after signing in. The session cookie is
 * already set; this returns to the page the sign-in started from — a store's
 * order, say — with a full load so the session is read afresh. Only a path on
 * this same host is followed.
 */
export function ManagerCallback() {
  const { t } = useTranslation('manager');
  const { isMobile } = useDevice();
  const T = usePlatformTokens();

  useEffect(() => {
    let dest = '/';
    try {
      const saved = sessionStorage.getItem(POST_LOGIN);
      sessionStorage.removeItem(POST_LOGIN);
      if (saved) {
        const url = new URL(saved, window.location.origin);
        if (url.origin === window.location.origin && !/^\/(signin|auth\/callback)/.test(url.pathname)) {
          dest = `${url.pathname}${url.search}${url.hash}`;
        }
      }
    } catch { /* storage blocked, or not a path: the front door */ }
    window.location.replace(dest);
  }, []);

  return (
    <Frame T={T} wide={!isMobile}>
      <div style={{ font: `500 14px ${T.font}`, color: T.textDim }}>
        {t('authCallback.signingIn', { ns: 'storefront' })}
      </div>
    </Frame>
  );
}
