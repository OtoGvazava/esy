// The store's contact list (decision D10). A phone number is not a special
// field on the store — it is one entry here, alongside a second phone,
// WhatsApp, Facebook and Instagram.
//
// Two components, because the two audiences want opposite things: the shopper
// wants the fastest way to reach the shop, the owner wants to see everything
// including what is currently hidden.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contactApi, handleApiError } from '../../utils/api';
import { CHANNEL_TYPES, PHONE_TYPES, channelHref } from './channelLinks';


// The dev store-switch parameter, read here rather than threaded down as a
// prop: in production the backend resolves the store from the Host header and
// this is absent, so a caller that forgot to pass it would work everywhere
// except the one environment where it matters.
function devTenantParam() {
  try {
    return new URLSearchParams(window.location.search).get('tenant') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The shopper-facing strip. Renders nothing at all when a store has listed no
 * public channels — an empty "Contact" heading is worse than no heading, since
 * it implies the shop is unreachable rather than that it has not said yet.
 */
export function StoreContacts({ T, devTenant = devTenantParam(), style = {} }) {
  const { t } = useTranslation('storefront');
  const [channels, setChannels] = useState([]);
  const abortRef = useRef(null);

  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    contactApi.listPublic(devTenant, { signal: ac.signal })
      .then((rows) => { if (!ac.signal.aborted) setChannels(Array.isArray(rows) ? rows : []); })
      // A store that cannot list its channels still sells: fall back to showing
      // nothing rather than an error the shopper can do nothing about.
      .catch(() => { if (!ac.signal.aborted) setChannels([]); });
    return () => ac.abort();
  }, [devTenant]);

  if (channels.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', ...style }}>
      <span style={{ font: `600 12px ${T.font}`, color: T.textMute }}>{t('contact.title')}</span>
      {channels.map((c) => {
        const href = channelHref(c.type, c.value);
        const label = c.value;
        const chip = {
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 999, textDecoration: 'none',
          border: `1px solid ${c.isPrimary ? T.accent : T.border}`,
          background: c.isPrimary ? T.accentBg : 'transparent',
          color: c.isPrimary ? T.accentFg : T.textDim,
          font: `600 12px ${T.font}`,
        };
        return href ? (
          <a key={c.id} href={href} target={c.type === 'PHONE' ? undefined : '_blank'}
             rel="noreferrer" style={chip}>
            {t(`contact.type.${c.type}`)} · {label}
          </a>
        ) : (
          <span key={c.id} style={chip}>{t(`contact.type.${c.type}`)} · {label}</span>
        );
      })}
    </div>
  );
}

/**
 * The owner's editor. Hiding is offered next to deleting because they mean
 * different things: a shop closing a channel for the season keeps the number
 * and switches it off, rather than retyping it when it reopens.
 */
export function ContactChannelsEditor({ T, devTenant = devTenantParam() }) {
  const { t } = useTranslation('owner');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ type: 'PHONE', value: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await contactApi.list(devTenant);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(handleApiError(e, t('contacts.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [devTenant, t]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn, fallbackKey) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(handleApiError(e, t(fallbackKey)));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    const value = draft.value.trim();
    if (!value) return;
    const ok = await run(
      () => contactApi.create({ type: draft.type, value, isPublic: true }, devTenant),
      'contacts.saveFailed',
    );
    if (ok) setDraft({ type: 'PHONE', value: '' });
  };

  const label = { font: `600 11.5px ${T.font}`, color: T.textDim, marginBottom: 6 };
  const field = {
    width: '100%', height: 42, padding: '0 12px', borderRadius: 12,
    border: `1px solid ${T.border}`, background: T.surface, color: T.text,
    font: `500 13.5px ${T.font}`, outline: 'none', boxSizing: 'border-box',
  };
  const smallBtn = (active) => ({
    padding: '7px 12px', borderRadius: 10, cursor: busy ? 'not-allowed' : 'pointer',
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? T.accentBg : 'transparent',
    color: active ? T.accentFg : T.textDim,
    font: `600 12px ${T.font}`,
  });

  return (
    <div>
      <div style={{ font: `700 14px ${T.font}`, color: T.text, marginBottom: 4 }}>
        {t('contacts.title')}
      </div>
      <div style={{ font: `400 12.5px/1.5 ${T.font}`, color: T.textDim, marginBottom: 14 }}>
        {t('contacts.sub')}
      </div>

      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 12,
          border: `1px solid ${T.danger}44`, color: T.dangerFg,
          font: `500 12.5px ${T.font}`,
        }}>{error}</div>
      )}

      {loading ? (
        <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('contacts.loading')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          {rows.length === 0 && (
            <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('contacts.empty')}</div>
          )}
          {rows.map((c) => (
            <div key={c.id} style={{
              display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
              padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.border}`,
              opacity: c.isPublic ? 1 : 0.6,
            }}>
              <span style={{ font: `600 12px ${T.font}`, color: T.textDim, minWidth: 74 }}>
                {t(`contacts.type.${c.type}`)}
              </span>
              <span style={{ flex: 1, minWidth: 140, font: `500 13.5px ${T.font}`, color: T.text }}>
                {c.value}
              </span>
              {c.isPrimary && (
                <span style={{
                  padding: '3px 9px', borderRadius: 999, background: T.accentBg,
                  color: T.accentFg, font: `700 10.5px ${T.font}`,
                }}>{t('contacts.primary')}</span>
              )}
              {PHONE_TYPES.includes(c.type) && !c.isPrimary && (
                <button type="button" disabled={busy} style={smallBtn(false)}
                        onClick={() => run(() => contactApi.update(c.id, { isPrimary: true }, devTenant), 'contacts.saveFailed')}>
                  {t('contacts.makePrimary')}
                </button>
              )}
              <button type="button" disabled={busy} style={smallBtn(c.isPublic)}
                      onClick={() => run(() => contactApi.update(c.id, { isPublic: !c.isPublic }, devTenant), 'contacts.saveFailed')}>
                {c.isPublic ? t('contacts.shown') : t('contacts.hidden')}
              </button>
              <button type="button" disabled={busy}
                      style={{ ...smallBtn(false), color: T.dangerFg, borderColor: `${T.danger}44` }}
                      onClick={() => {
                        if (window.confirm(t('contacts.deleteConfirm', { value: c.value }))) {
                          run(() => contactApi.remove(c.id, devTenant), 'contacts.deleteFailed');
                        }
                      }}>
                {t('contacts.delete')}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CHANNEL_TYPES.map((ty) => (
            <button key={ty} type="button" style={smallBtn(draft.type === ty)}
                    onClick={() => setDraft((d) => ({ ...d, type: ty }))}>
              {t(`contacts.type.${ty}`)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={label}>{t(`contacts.placeholder.${draft.type}`)}</div>
            <input
              value={draft.value}
              onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              style={field}
            />
          </div>
          <button type="submit" disabled={busy || !draft.value.trim()} style={{
            height: 42, padding: '0 18px', borderRadius: 12, border: 'none',
            background: T.text, color: T.bg, font: `700 13px ${T.font}`,
            cursor: busy || !draft.value.trim() ? 'not-allowed' : 'pointer',
            opacity: busy || !draft.value.trim() ? 0.55 : 1,
          }}>
            {t('contacts.add')}
          </button>
        </div>
      </form>
    </div>
  );
}
