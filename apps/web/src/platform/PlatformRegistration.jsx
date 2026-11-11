// Opening a store (esy.ge/sell), the design's O2–O10 and the store plan's
// Phase 5 quick setup:
//
//   gates   sign in with Google (O2) → the account's profile, when it has
//           none → the seller's phone with an SMS code (O2b)
//   setup   name and link (O3) → what you sell (O4) → a look with its quick
//           changes (O5), or any of them (O6) → logo and colour (O7)
//   finish  review and the seller terms (O8) → creating (O9) → live (O10)
//
// The gates follow the account, so someone who already shops on esy goes
// straight to naming the store. Each setup step is a history entry, so a
// phone's back gesture steps back through the flow instead of leaving it.
// The store is created in one request with its design (POST /api/tenant);
// the logo, kept in memory until then, is uploaded right after, because it
// needs a store to belong to. If that upload fails, the store is open anyway
// and the live screen points to Brand settings, which takes it again.
//
// With the design switch off (app.design.enabled), there is no look step and
// no design is sent: the store opens with today's storefront.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDisplayPrefs } from '../contexts/DisplayPrefsContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { tenantApi } from '../utils/api';
import { storeUrl } from './platformData';
import { lookById, suggestedLooks } from '../core/design/looks';
import { DEFAULT_DESIGN, normalizeDesign } from '../core/design/normalize';
import schema from '../core/design/schema.json';
import { initialsOf, useDev } from './sell/kit';
import { SellPhone, SellProfile, SellSignIn } from './sell/SellGates';
import { SellCategory, SellName } from './sell/SellBasics';
import { SellLook, SellMoreLooks } from './sell/SellLook';
import { SellBrand } from './sell/SellBrand';
import { SellCheck, SellCreating, SellLive } from './sell/SellFinish';
import { QUICK, STORE_CATEGORY, linkChars, slugify } from './sell/setup';

// The setup steps in order; `more` (every look) opens from `look`.
const SETUP = ['name', 'category', 'look', 'brand'];
const ORDER = ['name', 'category', 'look', 'more', 'brand', 'check'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default function PlatformRegistration() {
  const { t } = useTranslation('platform');
  const { t: td } = useTranslation('design');
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { isAuthenticated, user, loading, signInWithGoogle } = useAuth();
  const { mode } = useThemeMode();
  const still = !!useDisplayPrefs()?.motion;
  const dev = useDev();

  // The design switch rides every /api/tenant/current, the platform's too.
  const [designOn, setDesignOn] = useState(null);
  useEffect(() => {
    let alive = true;
    tenantApi.current()
      .then((cur) => { if (alive) setDesignOn(cur?.designEnabled === true); })
      .catch(() => { if (alive) setDesignOn(false); });
    return () => { alive = false; };
  }, []);
  const lookOn = designOn !== false;
  const setup = lookOn ? SETUP : SETUP.filter((s) => s !== 'look');

  // ---- name and link ----
  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [subTouched, setSubTouched] = useState(false);
  const subdomain = subTouched ? sub : slugify(name);
  const [subState, setSubState] = useState('invalid');
  const checkSeq = useRef(0);
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) { setSubState('invalid'); return undefined; }
    setSubState('checking');
    const seq = ++checkSeq.current;
    const id = setTimeout(() => {
      tenantApi.checkSubdomain(subdomain)
        .then((r) => { if (seq === checkSeq.current) setSubState(r?.status || 'invalid'); })
        .catch(() => { if (seq === checkSeq.current) setSubState('invalid'); });
    }, 400);
    return () => clearTimeout(id);
  }, [subdomain]);
  const onSub = (v) => {
    const clean = linkChars(v);
    // Emptied, the link follows the name again.
    setSubTouched(!!clean);
    setSub(clean);
  };

  // ---- what you sell, and the look ----
  const [group, setGroup] = useState('');
  // A look picked on the landing page (/sell?look=<id>) leads the row, and
  // so does one picked from the wall that is not among the three.
  const presetLook = lookById(params.get('look'))?.id || null;
  const [pinned, setPinned] = useState(presetLook);
  const [lookId, setLookId] = useState(presetLook);
  const [remix, setRemix] = useState({});
  const suggested = suggestedLooks(group);
  const three = pinned && !suggested.some((l) => l.id === pinned) ? [lookById(pinned), ...suggested.slice(0, 2)] : suggested;
  const look = three.find((l) => l.id === lookId) || three[0];
  const designOf = useCallback((l) => normalizeDesign({ ...l.design, ...(remix[l.id] || {}), look: l.id }), [remix]);
  const design = lookOn ? designOf(look) : DEFAULT_DESIGN;
  const selectLook = (id) => {
    if (!three.some((l) => l.id === id)) setPinned(id);
    setLookId(id);
  };
  const remixLook = (key, value) => setRemix((r) => ({ ...r, [look.id]: { ...(r[look.id] || {}), [key]: value } }));

  // ---- logo and colour ----
  const [colour, setColour] = useState(QUICK[0].hex);
  const [logo, setLogo] = useState(null);
  const logoRef = useRef(null);
  useEffect(() => () => { if (logoRef.current) URL.revokeObjectURL(logoRef.current.url); }, []);
  const chooseLogo = (next) => {
    if (logoRef.current) URL.revokeObjectURL(logoRef.current.url);
    logoRef.current = next;
    setLogo(next);
    if (next.hex) setColour(next.hex);
  };
  const removeLogo = () => {
    if (logoRef.current) URL.revokeObjectURL(logoRef.current.url);
    logoRef.current = null;
    setLogo(null);
  };
  const shuffle = () => {
    const o = schema.options;
    setRemix((r) => ({ ...r, [look.id]: { theme: pick(o.theme), menu: pick(o.menu), productLayout: pick(o.productLayout), header: pick(o.header) } }));
    setColour(pick(QUICK).hex);
  };

  // ---- the step on screen, kept in history ----
  const asked = location.state?.sell;
  const incomplete = !name.trim() || subState !== 'available' ? 'name' : !group ? 'category' : null;
  let step = ORDER.includes(asked) ? asked : 'name';
  if (!lookOn && (step === 'look' || step === 'more')) step = 'brand';
  // A step whose earlier answers are missing (a reload, a link) starts at the first gap.
  if (incomplete && ORDER.indexOf(step) > ORDER.indexOf(incomplete)) step = incomplete;
  const here = `${location.pathname}${location.search}`;
  const depth = location.state?.depth || 0;
  useEffect(() => {
    if (asked && asked !== step) navigate(here, { replace: true, state: { ...location.state, sell: step } });
  }, [asked, step, here, navigate, location.state]);
  const go = (to) => navigate(here, { state: { sell: to, depth: depth + 1 } });
  const back = () => (depth > 0 ? navigate(-1) : navigate('/'));
  const leave = () => navigate('/');

  // ---- creating ----
  const [agreed, setAgreed] = useState(false);
  const [phase, setPhase] = useState(null);
  const [created, setCreated] = useState(null);
  const [progress, setProgress] = useState({ link: false, style: false, logo: null });
  const [error, setError] = useState(null);
  const publish = async () => {
    setError(null);
    setProgress({ link: false, style: false, logo: logo ? 'busy' : null });
    setPhase('creating');
    let store;
    try {
      store = await tenantApi.create({
        name: name.trim(),
        subdomain,
        primaryColor: colour,
        category: STORE_CATEGORY[group] || undefined,
        // The look goes with the store, so it opens already designed.
        design: lookOn ? { ...design, colours: { primary: colour } } : undefined,
      });
    } catch (e) {
      let kind = 'network';
      let fix = null;
      if (e?.status === 409) {
        // Taken while the seller was choosing: the link, or else the name.
        kind = 'name';
        fix = 'name';
        try {
          const r = await tenantApi.checkSubdomain(subdomain);
          if (r?.status === 'taken') { kind = 'taken'; setSubState('taken'); }
        } catch { /* keep "name" */ }
      } else if (e?.code === 'PHONE_REQUIRED') {
        kind = 'phone';
      } else if (e?.status === 400) {
        kind = 'invalid';
        fix = 'name';
      }
      setError({ kind, step: fix });
      setPhase(null);
      return;
    }
    setCreated(store);
    setProgress((p) => ({ ...p, link: true, style: true }));
    if (logo) {
      try {
        const after = await tenantApi.uploadLogoTo(store.subdomain, logo.file);
        setCreated((s) => ({ ...s, logoUrl: after?.logoUrl || s.logoUrl }));
        setProgress((p) => ({ ...p, logo: 'done' }));
      } catch {
        setProgress((p) => ({ ...p, logo: 'failed' }));
      }
    }
  };

  // A refusal belongs to the review it was shown on: leaving it to fix the
  // name or link, or verifying the phone it asked for, clears it.
  useEffect(() => { if (step !== 'check') setError(null); }, [step]);
  useEffect(() => { if (error?.kind === 'phone' && user?.phoneVerified) setError(null); }, [error, user]);

  // Whether this visit asked for the profile, so the progress card can say so.
  const [askedProfile, setAskedProfile] = useState(false);
  useEffect(() => { if (user && !user.profileComplete) setAskedProfile(true); }, [user]);

  const host = `${subdomain || '…'}.esy.ge`;
  const own = { name: name.trim() || t('open.name.yourStore'), initials: initialsOf(name), logo: logo?.url };
  const groupLabel = group ? td(`group.${group}`) : '';

  if (phase === 'live' && created) {
    // A logo that did not upload is not the store's: it shows its initials until Brand settings takes one.
    const failed = progress.logo === 'failed';
    return <SellLive dev={dev} store={created} url={storeUrl(created)} colour={colour} own={failed ? { ...own, logo: null } : own} logoFailed={failed} lookOn={lookOn} />;
  }
  if (phase === 'creating') {
    return (
      <SellCreating
        dev={dev} host={host} progress={progress} lookOn={lookOn} design={design} lookId={look.id} colour={colour} mode={mode} still={still}
        store={{ name: name.trim(), displayName: name.trim(), subdomain, logoUrl: logo?.url || null }}
        onDone={() => setPhase('live')}
      />
    );
  }

  // Nothing until the session is known: a signed-in seller should not see the sign-in screen flash.
  if (loading) return <div className="sl" />;
  if (!isAuthenticated) return <SellSignIn dev={dev} setup={setup} onGoogle={signInWithGoogle} onHome={leave} />;
  if (!user.profileComplete) return <SellProfile dev={dev} setup={setup} onHome={leave} />;
  if (!user.phoneVerified) return <SellPhone dev={dev} setup={setup} needsProfile={askedProfile} onHome={leave} />;

  const total = setup.length;
  const at = (key) => ({ on: setup.indexOf(key) + 1, total });
  const stepTop = (key) => ({ label: t('open.stepOf', { n: setup.indexOf(key) + 1, total }), onBack: back, onCancel: leave, steps: at(key) });

  switch (step) {
    case 'category':
      return <SellCategory dev={dev} top={stepTop('category')} value={group} onPick={setGroup} onNext={() => go(lookOn ? 'look' : 'brand')} />;
    case 'look':
      return (
        <SellLook
          dev={dev} top={stepTop('look')} three={three} look={look} designOf={designOf} colour={colour} own={own} group={group} groupLabel={groupLabel}
          onSelect={selectLook} onRemix={remixLook} onColour={setColour} onShuffle={shuffle} onMore={() => go('more')} onNext={() => go('brand')}
        />
      );
    case 'more':
      return (
        <SellMoreLooks
          dev={dev} current={look.id} designOf={designOf} colour={colour} own={own}
          top={{ label: t('open.stepMore', { n: setup.indexOf('look') + 1, total }), onBack: back, backLabel: t('open.backLooks'), steps: at('look') }}
          onPick={(id) => { selectLook(id); back(); }}
        />
      );
    case 'brand':
      return (
        <SellBrand
          dev={dev} top={stepTop('brand')} logo={logo} logoHex={logo?.hex || null} onLogo={chooseLogo} onRemoveLogo={removeLogo}
          colour={colour} onColour={setColour} lookId={lookOn ? look.id : null} design={design} own={own} group={group} onNext={() => go('check')}
        />
      );
    case 'check':
      return (
        <SellCheck
          dev={dev} top={{ label: t('open.stepCheck'), onBack: back, onCancel: leave, steps: { on: total, total } }}
          name={name.trim()} host={host} group={group} groupLabel={groupLabel} lookId={lookOn ? look.id : null} design={design}
          colour={colour} fromLogo={!!logo?.hex && colour === logo.hex} logoName={logo?.name} own={own}
          agreed={agreed} onAgree={setAgreed} onEdit={go} onPublish={publish} error={error}
        />
      );
    default:
      return (
        <SellName
          dev={dev} top={stepTop('name')} name={name} onName={setName} subdomain={subdomain} onSub={onSub}
          subState={subState} touched={subTouched || !!name.trim()} colour={colour} onNext={() => go('category')}
        />
      );
  }
}
