// The store's contact list (decision D10). A phone number is not a special
// field on the store — it is one entry here, alongside a second phone,
// WhatsApp, Facebook and Instagram.
//
// Two components, because the two audiences want opposite things: the shopper
// wants the fastest way to reach the shop, the owner wants to see everything
// including what is currently hidden.
//
// The shopper's side renders the design's ChannelBtn, which colours each entry
// with that channel's own brand. This replaced a set of generic accent chips:
// a row of contacts is meant to be recognised before it is read, and green
// WhatsApp does that where a uniform accent does not.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contactApi, handleApiError } from '../../utils/api';
import { CHANNEL_TYPES, CHANNELS, PHONE_TYPES } from '../../core/channels';
import { ChannelBtn } from '../../core/domain';
import { Toggle } from '../../core/primitives';

function devTenantParam() {
  try {
    return new URLSearchParams(window.location.search).get('tenant') || undefined;
  } catch {
    return undefined;
  }
}

/** The action word under a value: a number is dialled, a handle is opened. */
function actionFor(t, type) {
  if (type === 'whatsapp') return t('contact.write');
  return CHANNELS[type]?.kind === 'tel' ? t('contact.call') : t('contact.open');
}

/**
 * The shopper-facing row. Renders nothing when a store has listed no public
 * channels — an empty "Contact" heading is worse than no heading, since it
 * implies the shop is unreachable rather than that it has not said yet.
 */
export function StoreContacts({ T, devTenant = devTenantParam(), compact, onLoaded, style = {} }) {
  const { t } = useTranslation('storefront');
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    const ac = new AbortController();
    // onLoaded lets a caller share this component's fate — a heading above an
    // empty contact list reads as "unreachable", so the wrapper hides too.
    const settle = (rows) => {
      if (ac.signal.aborted) return;
      setChannels(rows);
      if (onLoaded) onLoaded(rows.length > 0);
    };
    contactApi.listPublic(devTenant, { signal: ac.signal })
      .then((rows) => settle(Array.isArray(rows) ? rows : []))
      // A store that cannot list its channels still sells: show nothing rather
      // than an error the shopper can do nothing about.
      .catch(() => settle([]));
    return () => ac.abort();
    // onLoaded is intentionally not a dependency: callers pass an inline
    // setState, and re-running the fetch on every render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devTenant]);

  if (channels.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', ...style }}>
      {channels.map((c) => (
        <ChannelBtn
          key={c.id}
          T={T}
          channel={c}
          action={actionFor(t, c.type)}
          compact={compact}
        />
      ))}
    </div>
  );
}

/**
 * The owner's editor. Hiding sits next to deleting because they mean different
 * things: a shop closing a channel for the season keeps the number and
 * switches it off, rather than retyping it when it reopens.
 */
export function ContactChannelsEditor({ T, devTenant = devTenantParam() }) {
  const { t } = useTranslation('owner');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ type: 'phone', value: '' });

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
    if (ok) setDraft({ type: 'phone', value: '' });
  };

  const label = { font: `600 11.5px ${T.font}`, color: T.textDim, marginBottom: 6 };
  const field = {
    width: '100%', height: 42, padding: '0 12px', borderRadius: 12,
    border: `1px solid ${T.border}`, background: T.surface, color: T.text,
    font: `500 13.5px ${T.font}`, outline: 'none', boxSizing: 'border-box',
  };
  const chipBtn = (active, brand) => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '7px 12px', borderRadius: 10, cursor: busy ? 'not-allowed' : 'pointer',
    border: `1px solid ${active ? brand : T.border}`,
    background: active ? `${brand}14` : 'transparent',
    color: active ? brand : T.textDim,
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
          {rows.map((c) => {
            const brand = CHANNELS[c.type]?.brand || T.accent;
            return (
              <div key={c.id} style={{
                display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.border}`,
                opacity: c.isPublic ? 1 : 0.6,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: brand, flexShrink: 0,
                }} />
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
                  <button type="button" disabled={busy} style={chipBtn(false, brand)}
                          onClick={() => run(() => contactApi.update(c.id, { isPrimary: true }, devTenant), 'contacts.saveFailed')}>
                    {t('contacts.makePrimary')}
                  </button>
                )}
                {/* The switch is the design's Toggle, and it renders the state
                    the server confirmed — not the one that was clicked. */}
                <span title={c.isPublic ? t('contacts.shown') : t('contacts.hidden')}>
                  <Toggle
                    T={T}
                    on={!!c.isPublic}
                    disabled={busy}
                    onClick={() => run(
                      () => contactApi.update(c.id, { isPublic: !c.isPublic }, devTenant),
                      'contacts.saveFailed',
                    )}
                  />
                </span>
                <button type="button" disabled={busy}
                        style={{ ...chipBtn(false, T.danger), color: T.dangerFg, borderColor: `${T.danger}44` }}
                        onClick={() => {
                          if (window.confirm(t('contacts.deleteConfirm', { value: c.value }))) {
                            run(() => contactApi.remove(c.id, devTenant), 'contacts.deleteFailed');
                          }
                        }}>
                  {t('contacts.delete')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={add} style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CHANNEL_TYPES.map((ty) => (
            <button key={ty} type="button"
                    style={chipBtn(draft.type === ty, CHANNELS[ty].brand)}
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
              placeholder={CHANNELS[draft.type].ph}
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
