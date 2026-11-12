// The account on esy.ge (the design's U2–U7): esy.ge's own bar and footer
// around the sections every app shares (account/AccountBody). Below a desktop
// a section has a ← row under esy.ge's bar, pinned with it while the page
// scrolls, and the row carries the section's title, as a store's header does.
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatform, PTopBar, PFooter } from '../PlatformShared';
import { Glyph, usePDevice } from '../PlatformKit';
import AccountBody from '../../account/AccountBody';
import { sectionOf, sectionTitle } from '../../account/sections';

/** The way back to the overview, and where you are, under esy.ge's bar. */
function BackRow({ T, gut, title, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `2px ${gut}px 10px` }}>
      <Link
        to="/account"
        aria-label={label}
        className="esy-press"
        style={{
          width: 44, height: 44, borderRadius: 'var(--k-r-ibtn)', display: 'grid', placeItems: 'center',
          flex: 'none', background: T.surface2, color: T.text,
        }}
      >
        <Glyph name="back" />
      </Link>
      {/* The page's own heading stays in the page, read out but not drawn twice. */}
      <div aria-hidden="true" style={{
        flex: 1, minWidth: 0, margin: 0, textAlign: 'center', font: `700 15px/1.25 ${T.font}`,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
      >
        {title}
      </div>
      <span aria-hidden="true" style={{ width: 44, flex: 'none' }} />
    </div>
  );
}

export default function AccountLayout() {
  const { T } = usePlatform();
  const { desk, gut } = usePDevice();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation('account');
  const { isAuthenticated } = useAuth();
  const section = sectionOf(pathname);
  // A guest has one section and no account to go back to.
  const back = !desk && !!section && isAuthenticated;
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}` }}>
      <PTopBar
        current="account"
        below={back ? <BackRow T={T} gut={gut} title={sectionTitle(t, section)} label={t('hub.account')} /> : null}
      />
      <main style={{ flex: '1 0 auto', paddingBottom: 48 }}>
        <AccountBody app="platform" T={T} showTitle={!back} onSignedOut={() => navigate('/')} />
      </main>
      <PFooter />
    </div>
  );
}
