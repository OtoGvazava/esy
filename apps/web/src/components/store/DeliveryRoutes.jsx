// The store's delivery routes (decision D9). Four independent switches, each
// with its own price and its own promised time — not one delivery setting.
//
// The two rules the server enforces are surfaced as refusals the owner can
// read, not as controls that quietly disappear: switching off the last route,
// or the last courier while express is on, comes back as a message saying what
// the change would cost. A greyed-out switch would leave them guessing.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deliveryApi, handleApiError } from '../../utils/api';

const ROUTES = ['PICKUP', 'TBILISI', 'GEORGIA', 'EXPRESS'];

function devTenantParam() {
  try {
    return new URLSearchParams(window.location.search).get('tenant') || undefined;
  } catch {
    return undefined;
  }
}

export default function DeliveryRoutes({ T, devTenant = devTenantParam() }) {
  const { t, i18n } = useTranslation('owner');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await deliveryApi.list(devTenant);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(handleApiError(e, t('delivery.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [devTenant, t]);

  useEffect(() => { load(); }, [load]);

  const write = async (route, payload) => {
    setBusy(route);
    setError('');
    try {
      const updated = await deliveryApi.update(route, payload, devTenant);
      setRows((prev) => prev.map((r) => (r.route === route ? { ...r, ...updated } : r)));
      return true;
    } catch (e) {
      // The refusal text is the useful part — it names which rule was hit.
      setError(handleApiError(e, t('delivery.saveFailed')));
      // Re-read: a refused toggle must not leave the switch showing the state
      // the owner asked for rather than the one the server kept.
      await load();
      return false;
    } finally {
      setBusy('');
    }
  };

  const label = { font: `600 11px ${T.font}`, color: T.textMute, marginBottom: 5 };
  const field = {
    width: '100%', height: 40, padding: '0 11px', borderRadius: 11,
    border: `1px solid ${T.border}`, background: T.surface, color: T.text,
    font: `500 13px ${T.font}`, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div>
      <div style={{ font: `700 14px ${T.font}`, color: T.text, marginBottom: 4 }}>
        {t('delivery.title')}
      </div>
      <div style={{ font: `400 12.5px/1.5 ${T.font}`, color: T.textDim, marginBottom: 14 }}>
        {t('delivery.sub')}
      </div>

      {error && (
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 12,
          border: `1px solid ${T.danger}44`, color: T.dangerFg,
          font: `500 12.5px ${T.font}`,
        }}>{error}</div>
      )}

      {loading ? (
        <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('delivery.loading')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {ROUTES.map((route) => {
            const r = rows.find((x) => x.route === route);
            if (!r) return null;
            const on = !!r.enabled;
            const working = busy === route;
            return (
              <div key={route} style={{
                padding: '12px 14px', borderRadius: 14,
                border: `1px solid ${on ? T.accent : T.border}`,
                background: on ? `${T.accent}0d` : 'transparent',
                opacity: working ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ font: `700 13.5px ${T.font}`, color: T.text }}>
                      {t(`delivery.route.${route}`)}
                    </div>
                    <div style={{ font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>
                      {t(`delivery.routeHint.${route}`)}
                    </div>
                  </div>
                  <button
                    type="button" disabled={working}
                    onClick={() => write(route, { enabled: !on })}
                    style={{
                      padding: '7px 14px', borderRadius: 999,
                      border: `1px solid ${on ? T.accent : T.border}`,
                      background: on ? T.accentBg : 'transparent',
                      color: on ? T.accentFg : T.textDim,
                      font: `700 12px ${T.font}`, cursor: working ? 'wait' : 'pointer',
                    }}
                  >
                    {on ? t('delivery.on') : t('delivery.off')}
                  </button>
                </div>

                {on && (
                  <div style={{
                    display: 'grid', gap: 10, marginTop: 12,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  }}>
                    {route !== 'PICKUP' && (
                      <>
                        <div>
                          <div style={label}>{t('delivery.price')}</div>
                          <input
                            type="number" min="0" step="0.01" style={field}
                            defaultValue={r.price ?? 0}
                            onBlur={(e) => write(route, { price: e.target.value || '0' })}
                          />
                        </div>
                        <div>
                          <div style={label}>{t('delivery.freeOver')}</div>
                          <input
                            type="number" min="0" step="0.01" style={field}
                            placeholder={t('delivery.freeOverNever')}
                            defaultValue={r.freeOverTotal ?? ''}
                            onBlur={(e) => write(route, { freeOverTotal: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <div style={label}>{t('delivery.eta')}</div>
                      <input
                        style={field}
                        defaultValue={(i18n.language === 'ka' ? r.etaKa : r.etaEn) ?? ''}
                        onBlur={(e) => write(route, i18n.language === 'ka'
                          ? { etaKa: e.target.value } : { etaEn: e.target.value })}
                      />
                    </div>
                    {route === 'PICKUP' && (
                      <>
                        <div>
                          <div style={label}>{t('delivery.pickupAddress')}</div>
                          <input
                            style={field} defaultValue={r.pickupAddress ?? ''}
                            onBlur={(e) => write(route, { pickupAddress: e.target.value })}
                          />
                        </div>
                        <div>
                          <div style={label}>{t('delivery.pickupHours')}</div>
                          <input
                            style={field} defaultValue={r.pickupHours ?? ''}
                            onBlur={(e) => write(route, { pickupHours: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
