// The merchant's variant editor (the design's VarAxis + VarTable, D11).
//
// Two parts, and the order matters: the axes define what combinations exist,
// the grid below is where stock actually lives. Editing the axes regenerates
// the grid — the server does that and returns it, so this never has to build
// a combination table the backend might disagree with.
//
// One deliberate constraint: a product must be saved before it can have
// variants, because the combinations hang off its id. The editor says so
// rather than silently doing nothing.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { productApi, handleApiError } from '../../utils/api';
import { Btn, Card, Note, Toggle } from '../../core/primitives';
import { money } from '../../core/money';

const MAX_AXES = 2;

/** One axis: a name, and its values as removable pills (the design's VarAxis). */
function AxisRow({ T, t, axis, index, busy, onChange, onRemove }) {
  const [draft, setDraft] = useState('');

  const addValue = () => {
    const v = draft.trim();
    if (!v || axis.values.includes(v)) { setDraft(''); return; }
    onChange({ ...axis, values: [...axis.values, v] });
    setDraft('');
  };

  const field = {
    width: '100%', height: 42, padding: '0 12px', borderRadius: 12,
    border: `1px solid ${T.border}`, background: T.surface, color: T.text,
    font: `500 13.5px ${T.font}`, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: 15, borderRadius: 14, border: `1px solid ${T.border}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 11 }}>
        <div>
          <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
            {t('variants.axisName')}
          </div>
          <input
            style={field}
            value={axis.name}
            disabled={busy}
            placeholder={t(`variants.axisPlaceholder.${index}`)}
            onChange={(e) => onChange({ ...axis, name: e.target.value })}
          />
        </div>

        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            font: `600 10.5px ${T.font}`, color: T.textMute,
            letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            <span>{t('variants.axisValues')}</span>
            <button type="button" disabled={busy} onClick={onRemove}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer',
                      color: T.dangerFg, font: `600 10.5px ${T.font}`, textTransform: 'none', letterSpacing: 0 }}>
              {t('variants.removeAxis')}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            {axis.values.map((v) => (
              <span key={v} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 999,
                background: T.surface2, color: T.text, font: `600 12.5px ${T.font}`,
              }}>
                {v}
                <button
                  type="button" disabled={busy}
                  onClick={() => onChange({ ...axis, values: axis.values.filter((x) => x !== v) })}
                  aria-label={t('variants.removeValue', { value: v })}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: T.textMute, padding: 0, font: `600 12px ${T.font}` }}
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              value={draft}
              disabled={busy}
              placeholder={t('variants.addValue')}
              onChange={(e) => setDraft(e.target.value)}
              // Enter adds a value: this is a list being typed, and reaching
              // for a button between every size would be the slow part.
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValue(); } }}
              onBlur={addValue}
              style={{ ...field, width: 130, height: 38 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The combination table — where stock actually lives (the design's VarTable). */
function Grid({ T, t, doc, basePrice, busy, onRow }) {
  const th = {
    font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.07em',
    textTransform: 'uppercase', textAlign: 'left', padding: '11px 14px',
  };
  const td = { padding: '9px 14px', font: `500 13px ${T.font}`, color: T.text, borderTop: `1px solid ${T.border}` };
  const cell = {
    width: 92, height: 34, padding: '0 9px', borderRadius: 9,
    border: `1px solid ${T.border}`, background: T.surface, color: T.text,
    font: `600 12.5px ${T.font}`, outline: 'none', textAlign: 'right',
  };
  const total = doc.rows.reduce((s, r) => s + (Number(r.stock) || 0), 0);

  return (
    <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {doc.axes.map((a) => <th key={a.name} style={th}>{a.name}</th>)}
              <th style={{ ...th, textAlign: 'right' }}>{t('variants.stock')}</th>
              <th style={{ ...th, textAlign: 'right' }}>{t('variants.price')}</th>
            </tr>
          </thead>
          <tbody>
            {doc.rows.map((r, i) => (
              // A sold-out row is tinted, so the holes in a grid are visible
              // without reading every number.
              <tr key={r.key.join('|')} style={{ background: Number(r.stock) === 0 ? T.dangerBg : 'transparent' }}>
                {r.key.map((k, j) => <td key={j} style={{ ...td, fontWeight: 700 }}>{k}</td>)}
                <td style={{ ...td, textAlign: 'right' }}>
                  <input
                    type="number" min="0" style={cell} disabled={busy}
                    value={r.stock ?? 0}
                    onChange={(e) => onRow(i, { stock: e.target.value })}
                  />
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <input
                    type="number" min="0" step="0.01" style={cell} disabled={busy}
                    // Empty means "use the product's base price", which is why
                    // the placeholder shows that price rather than a zero.
                    placeholder={money(basePrice)}
                    value={r.price ?? ''}
                    onChange={(e) => onRow(i, { price: e.target.value })}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, fontWeight: 800 }} colSpan={doc.axes.length}>
                {t('variants.totalStock')}
              </td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 800 }}>{total}</td>
              <td style={td} />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function VariantEditor({ T, productId, basePrice, onChanged }) {
  const { t } = useTranslation('owner');
  const [doc, setDoc] = useState(null);
  const [axes, setAxes] = useState([]);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    try {
      const d = await productApi.getVariants(productId);
      setDoc(d);
      setAxes(d?.axes?.map((a) => ({ name: a.name, values: [...a.values] })) || []);
      setOn(!!d);
      if (onChanged) onChanged(!!d);
    } catch (e) {
      setError(handleApiError(e, t('variants.loadFailed')));
    }
    // onChanged is excluded on purpose: callers pass an inline setState and
    // depending on it would re-fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, t]);

  useEffect(() => { load(); }, [load]);

  // Every save sends the whole document and renders what comes back, so the
  // grid on screen is always the one the server generated — never a guess at
  // what it would have produced.
  const save = async (nextAxes, rows) => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const d = await productApi.putVariants(productId, {
        axes: nextAxes.map((a) => ({ name: a.name, values: a.values })),
        rows: rows || doc?.rows || [],
      });
      setDoc(d);
      setAxes(d?.axes?.map((a) => ({ name: a.name, values: [...a.values] })) || []);
      setOn(!!d);
      setSaved(true);
      if (onChanged) onChanged(!!d);
    } catch (e) {
      setError(handleApiError(e, t('variants.saveFailed')));
      // Re-read so a refused save does not leave the editor showing axes the
      // server never accepted.
      await load();
    } finally {
      setBusy(false);
    }
  };

  const editRow = (i, patch) => {
    setDoc((prev) => ({
      ...prev,
      rows: prev.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }));
    setSaved(false);
  };

  if (!productId) {
    return <Note T={T}>{t('variants.saveProductFirst')}</Note>;
  }

  const ready = axes.length > 0 && axes.every((a) => a.name.trim() && a.values.length);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ font: `700 14px ${T.font}`, color: T.text }}>{t('variants.title')}</div>
          <div style={{ font: `400 12.5px/1.5 ${T.font}`, color: T.textDim, marginTop: 2 }}>
            {t('variants.sub')}
          </div>
        </div>
        <Toggle
          T={T} on={on} disabled={busy}
          onClick={() => {
            if (on) {
              // Turning it off hands stock back to the product, so it is not
              // something to do by accident.
              if (window.confirm(t('variants.disableConfirm'))) save([], []);
            } else {
              setOn(true);
              setAxes([{ name: '', values: [] }]);
            }
          }}
        />
      </div>

      {!on ? (
        <Note T={T} style={{ marginTop: 10 }}>{t('variants.offNote')}</Note>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {error && <Note T={T} tone="danger">{error}</Note>}

          {axes.map((axis, i) => (
            <AxisRow
              key={i} T={T} t={t} axis={axis} index={i} busy={busy}
              onChange={(next) => setAxes((prev) => prev.map((a, j) => (j === i ? next : a)))}
              onRemove={() => setAxes((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {axes.length < MAX_AXES && (
              <Btn T={T} kind="quiet" size="sm" disabled={busy}
                   onClick={() => setAxes((prev) => [...prev, { name: '', values: [] }])}>
                {t('variants.addAxis')}
              </Btn>
            )}
            <Btn T={T} kind="dark" size="sm" disabled={busy || !ready}
                 onClick={() => save(axes)}>
              {busy ? t('variants.saving') : t('variants.apply')}
            </Btn>
            {saved && (
              <span style={{ alignSelf: 'center', font: `600 12px ${T.font}`, color: T.successFg }}>
                {t('variants.saved')}
              </span>
            )}
          </div>

          {axes.length >= MAX_AXES && (
            <Note T={T}>{t('variants.twoAxisCeiling')}</Note>
          )}

          {doc?.rows?.length > 0 && (
            <>
              <Grid T={T} t={t} doc={doc} basePrice={basePrice} busy={busy} onRow={editRow} />
              <div>
                <Btn T={T} kind="dark" size="sm" disabled={busy}
                     onClick={() => save(axes, doc.rows)}>
                  {busy ? t('variants.saving') : t('variants.saveStock')}
                </Btn>
              </div>
              <Note T={T}>{t('variants.stockNote')}</Note>
            </>
          )}
        </div>
      )}
    </div>
  );
}
