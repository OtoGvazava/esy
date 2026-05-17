import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform, PTopBar, PFooter, StoreMark, StatusPill } from './PlatformShared';
import { storeUrl } from './platformData';
import { accountApi, handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const money = (v) => {
  if (v == null) return '₾0';
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? String(v) : `₾${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0 })}`;
};

function MyStoreCard({ T, t, store }) {
  const c = store.primaryColor || '#6366f1';
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.dark ? 'none' : '0 4px 18px rgba(20,20,60,0.04)' }}>
      <div style={{ height: 60, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${c} 0%, ${store.secondaryColor || c} 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 14px, transparent 14px 28px)' }} />
        <div style={{ position: 'absolute', right: 12, top: 12 }}><StatusPill T={T} kind={store.status === 'live' ? 'live' : 'draft'}>{store.status || t('directory.live')}</StatusPill></div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ marginTop: -28, marginBottom: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', color: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `800 17px ${T.font}`, border: '2px solid #fff', boxShadow: '0 8px 22px rgba(0,0,0,0.18)' }}>{(store.name || '?').slice(0, 2).toUpperCase()}</span>
        </div>
        <div style={{ font: `700 16px ${T.font}`, color: T.text, letterSpacing: '-0.025em' }}>{store.name}</div>
        <div style={{ font: `500 11px ${T.mono}`, color: T.textMute, marginTop: 1 }}>{store.subdomain}.esy.ge</div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, padding: '12px 0', borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          {[[t('account.statOrders'), store.orders ?? 0], [t('account.statRevenue'), money(store.revenue)], [t('account.statViews'), store.views || '—']].map(([k, v]) => (
            <div key={k}>
              <div style={{ font: `700 14px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{v}</div>
              <div style={{ font: `500 9.5px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => { window.location.href = storeUrl(store); }} style={{ flex: 1, height: 38, borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${c} 0%, ${store.secondaryColor || c} 100%)`, color: '#fff', font: `700 12.5px ${T.font}`, cursor: 'pointer' }}>{t('account.manage')}</button>
          <button onClick={() => { window.location.href = storeUrl(store); }} style={{ height: 38, padding: '0 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, font: `600 12px ${T.font}`, cursor: 'pointer' }}>{t('account.view')}</button>
        </div>
      </div>
    </div>
  );
}

export default function PlatformAccount() {
  const { T, isDesktop } = usePlatform();
  const { t } = useTranslation('platform');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let alive = true;
    accountApi.get()
      .then((d) => alive && setState({ loading: false, data: d, error: null }))
      .catch((e) => alive && setState({ loading: false, data: null, error: e }));
    return () => { alive = false; };
  }, []);

  const { loading, data, error } = state;
  const notSignedIn = !loading && error && (error.status === 401);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
        <PTopBar current="account" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '120px 22px', color: T.textDim }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'pfspin 1s linear infinite' }} />
          {t('account.loading')}
          <style>{'@keyframes pfspin{to{transform:rotate(360deg)}}'}</style>
        </div>
      </div>
    );
  }

  if (notSignedIn) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
        <PTopBar current="account" />
        <div style={{ maxWidth: 440, margin: '0 auto', padding: '80px 22px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </div>
          <h1 style={{ font: `700 24px ${T.font}`, color: T.text, letterSpacing: '-0.03em', margin: '0 0 8px' }}>{t('account.signInTitle')}</h1>
          <div style={{ font: `400 13.5px/1.55 ${T.font}`, color: T.textDim, marginBottom: 22 }}>{t('account.signInBody')}</div>
          <button onClick={() => navigate('/signin')} style={{ height: 50, padding: '0 22px', borderRadius: 14, border: 'none', background: T.grad, color: '#fff', font: `700 14px ${T.font}`, cursor: 'pointer', boxShadow: `0 12px 28px ${T.accent}55` }}>{t('account.signIn')}</button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
        <PTopBar current="account" />
        <div style={{ textAlign: 'center', padding: '100px 22px', color: T.danger, font: `500 13px ${T.font}` }}>{handleApiError(error, t('account.loadError'))}</div>
      </div>
    );
  }

  const { user, ownedStores = [], orders = [], saved = [], followed = [], role } = data;
  const showShopping = role !== 'seller';

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <PTopBar current="account" />

      <div style={{ position: 'relative', padding: isDesktop ? '40px 56px 28px' : '22px 22px 18px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, left: 0, right: 0, height: 280, background: `radial-gradient(40% 80% at 30% 30%, ${T.accent}30, transparent 70%)`, filter: 'blur(36px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: isDesktop ? 22 : 14 }}>
          <span style={{ width: isDesktop ? 72 : 60, height: isDesktop ? 72 : 60, borderRadius: 22, background: T.grad, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `800 ${isDesktop ? 28 : 22}px ${T.font}`, boxShadow: `0 18px 40px ${T.accent}55`, flexShrink: 0 }}>{user.initials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 10.5px ${T.font}`, color: T.accentFg, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>{role === 'both' ? t('account.roleBoth') : (role === 'seller' ? t('account.roleSeller') : t('account.roleShopper'))}</div>
            <h1 style={{ font: `700 ${isDesktop ? 36 : 22}px/1 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 6px' }}>{user.name}</h1>
            <div style={{ font: `500 12px ${T.font}`, color: T.textDim }}>{user.email}{ownedStores.length > 0 && ` · ${t(ownedStores.length > 1 ? 'account.storeCountPlural' : 'account.storeCount', { n: ownedStores.length })}`}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {isDesktop && (
              <button onClick={() => navigate('/sell')} style={{ height: 38, padding: '0 14px', borderRadius: 12, border: 'none', background: T.grad, color: '#fff', font: `700 12.5px ${T.font}`, cursor: 'pointer', boxShadow: `0 10px 28px ${T.accent}55` }}>+ {t('account.openStore')}</button>
            )}
            <button onClick={() => { logout(); navigate('/'); }} style={{ height: 38, padding: '0 14px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, font: `600 12.5px ${T.font}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('account.signOut')}</button>
          </div>
        </div>
      </div>

      {/* MY STORES */}
      <div style={{ padding: isDesktop ? '28px 56px 16px' : '6px 22px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ font: `700 ${isDesktop ? 22 : 16}px ${T.font}`, color: T.text, letterSpacing: '-0.03em', margin: 0 }}>
            {t('account.yourStores')}{ownedStores.length > 0 && <span style={{ marginLeft: 8, font: `500 13px ${T.font}`, color: T.textMute }}>· {ownedStores.length}</span>}
          </h2>
          {ownedStores.length > 0 && <span onClick={() => navigate('/sell')} style={{ font: `600 12px ${T.font}`, color: T.accentFg, cursor: 'pointer' }}>{t('account.openAnother')} →</span>}
        </div>
        {ownedStores.length === 0 ? (
          <div style={{ padding: isDesktop ? '32px' : '18px 16px', borderRadius: 20, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: isDesktop ? 22 : 12, flexWrap: 'wrap' }}>
            <div style={{ width: isDesktop ? 72 : 44, height: isDesktop ? 72 : 44, borderRadius: 16, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width={isDesktop ? 30 : 20} height={isDesktop ? 30 : 20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 9 12 3l9 6v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2Z" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ font: `700 ${isDesktop ? 20 : 14.5}px ${T.font}`, color: T.text, letterSpacing: '-0.025em', marginBottom: 6 }}>{t('account.sellPromptTitle')}</div>
              <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim }}>{t('account.sellPromptBody')}</div>
            </div>
            <button onClick={() => navigate('/sell')} style={{ height: 44, padding: '0 18px', borderRadius: 12, border: 'none', background: T.grad, color: '#fff', font: `700 13px ${T.font}`, cursor: 'pointer', boxShadow: `0 10px 28px ${T.accent}55` }}>+ {t('account.openStore')}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr', gap: isDesktop ? 16 : 10 }}>
            {ownedStores.map((s) => <MyStoreCard key={s.subdomain} T={T} t={t} store={s} />)}
            <button onClick={() => navigate('/sell')} style={{ borderRadius: 18, padding: '20px 18px', border: `1.5px dashed ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', minHeight: isDesktop ? 220 : 64, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
              <span style={{ font: `700 15px ${T.font}`, color: T.text }}>{t('account.openAnother')}</span>
            </button>
          </div>
        )}
      </div>

      {/* MY SHOPPING */}
      {showShopping && (
        <div style={{ padding: isDesktop ? '36px 56px 32px' : '20px 22px 32px' }}>
          <h2 style={{ font: `700 ${isDesktop ? 22 : 16}px ${T.font}`, color: T.text, letterSpacing: '-0.03em', margin: '0 0 16px' }}>{t('account.myShopping')}</h2>
          {orders.length === 0 && saved.length === 0 && followed.length === 0 ? (
            <div style={{ padding: '28px 22px', borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, textAlign: 'center', color: T.textDim, font: `400 13px ${T.font}` }}>
              {t('account.noShopping0')} <span onClick={() => navigate('/stores')} style={{ color: T.accentFg, fontWeight: 700, cursor: 'pointer' }}>{t('account.browseStores')}</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders.map((o) => {
                  const s = o.store || {};
                  return (
                    <div key={o.orderNumber} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, background: T.surface, border: `1px solid ${T.border}` }}>
                      <StoreMark store={s} size={40} radius={10} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ font: `700 13px ${T.mono}`, color: T.text }}>{o.orderNumber}</span>
                          <StatusPill T={T} kind={o.status}>{o.status}</StatusPill>
                        </div>
                        <div style={{ marginTop: 2, font: `500 11.5px ${T.font}`, color: T.textDim }}>{s.name} · {t(o.items > 1 ? 'account.itemsPlural' : 'account.items', { n: o.items })}</div>
                      </div>
                      <div style={{ font: `700 14px ${T.font}`, color: T.text }}>{money(o.total)}</div>
                    </div>
                  );
                })}
              </div>
              {saved.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ font: `700 12px ${T.font}`, color: T.text, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{t('account.saved')} · {saved.length}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {saved.map((it) => (
                      <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: T.surface, border: `1px solid ${T.border}` }}>
                        <StoreMark store={it.store || {}} size={28} radius={8} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ font: `700 13px ${T.font}`, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title || `#${it.productId}`}</div>
                          <div style={{ font: `500 11px ${T.font}`, color: T.textDim }}>{(it.store || {}).name}</div>
                        </div>
                        <div style={{ font: `700 13px ${T.font}`, color: T.text }}>{money(it.price)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {followed.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ font: `700 12px ${T.font}`, color: T.text, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{t('account.followed')} · {followed.length}</div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {followed.map((s) => (
                      <div key={s.subdomain} onClick={() => { window.location.href = storeUrl(s); }} style={{ flex: '0 0 auto', width: 152, padding: 12, borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
                        <div style={{ height: 56, borderRadius: 10, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${s.primaryColor}28 0%, ${(s.secondaryColor || s.primaryColor)}18 100%)`, marginBottom: 8 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <StoreMark store={s} size={22} radius={6} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ font: `700 11.5px ${T.font}`, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                            <div style={{ font: `500 9px ${T.mono}`, color: T.textMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.subdomain}.esy.ge</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <PFooter compact />
    </div>
  );
}
