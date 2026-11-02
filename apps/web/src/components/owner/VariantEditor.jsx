// The product editor's variants card (the design's P2, decision D11).
//
// Two parts, and the order matters: the axes define what combinations exist,
// the stock lives on the combinations. The card shows the stock the way the
// board draws it — a matrix, sizes down and the second axis across, a sold-out
// cell tinted — and "change" opens the axes and each combination's own price.
//
// Editing the axes regenerates the combinations, which the server does and
// answers with, so this never builds a table the backend might disagree with;
// that is saved at once. Stock typed into the matrix waits for the page's
// Save, like every other field on it: `saveRef.current()` sends it.
//
// A product must be saved before it can have variants, because the
// combinations hang off its id. The card says so rather than doing nothing.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { productApi, handleApiError } from '../../utils/api';
import { money } from '../../core/money';
import { editVariantsQuery } from '../../core/query/managerQueries';
import { Sk, Skeleton } from '../skeleton/Skeleton';
import { Alert, btn, card } from '../../manager/officeKit';
import { SkIn } from '../../manager/officeSk';

const MAX_AXES = 2;
const keyOf = (r) => r.key.join('|');

/** One axis: a name, and its values as removable pills. */
function AxisRow({ T, t, axis, index, busy, onChange, onRemove }) {
  const [draft, setDraft] = useState('');
  const addValue = () => {
    const v = draft.trim();
    if (!v || axis.values.includes(v)) { setDraft(''); return; }
    onChange({ ...axis, values: [...axis.values, v] });
    setDraft('');
  };
  const field = {
    width: '100%', height: 42, padding: '0 12px', borderRadius: 'var(--k-r-in)', boxSizing: 'border-box',
    border: '1.5px solid var(--k-in-bd)', background: 'var(--k-in-bg)', color: T.text,
    font: `400 14px ${T.font}`, outline: 'none',
  };
  return (
    <div style={{ padding: 14, borderRadius: 'var(--k-r-card)', border: `1px solid ${T.border}`, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, font: `400 12.5px ${T.font}`, color: T.textDim }}>
          {t('variants.axisName')}
          <input
            style={field} value={axis.name} disabled={busy}
            placeholder={t(`variants.axisPlaceholder.${index}`)}
            onChange={(e) => onChange({ ...axis, name: e.target.value })}
          />
        </label>
        <button type="button" disabled={busy} onClick={onRemove} style={{ ...btn(T, 'd', { size: 'sm' }), height: 42 }}>
          {t('variants.removeAxis')}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
        {axis.values.map((v) => (
          <span key={v} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, height: 34, padding: '0 4px 0 12px',
            borderRadius: 'var(--k-r-pill)', background: T.surface2, color: T.text, font: `600 12.5px ${T.font}`,
          }}>
            {v}
            <button
              type="button" disabled={busy} aria-label={t('variants.removeValue', { value: v })}
              onClick={() => onChange({ ...axis, values: axis.values.filter((x) => x !== v) })}
              style={{ width: 28, height: 28, border: 0, borderRadius: '50%', background: 'transparent', cursor: 'pointer', color: T.textDim, display: 'grid', placeItems: 'center', padding: 0 }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </span>
        ))}
        <input
          value={draft} disabled={busy} placeholder={t('variants.addValue')} aria-label={t('variants.addValue')}
          onChange={(e) => setDraft(e.target.value)}
          // Enter adds a value: this is a list being typed, and reaching
          // for a button between every size would be the slow part.
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValue(); } }}
          onBlur={addValue}
          style={{ ...field, width: 130, height: 34 }}
        />
      </div>
    </div>
  );
}

/** A stock cell: the kit's p2-cell, tinted when the combination is sold out. */
function StockCell({ T, value, label, disabled, onChange }) {
  const n = Number(value) || 0;
  return (
    <input
      type="text" inputMode="numeric" value={value ?? 0} aria-label={label} disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
      style={{
        width: 52, height: 34, padding: '0 10px', boxSizing: 'border-box', borderRadius: 9, textAlign: 'right',
        font: `600 14px ${T.font}`, fontVariantNumeric: 'tabular-nums', outline: 'none',
        border: `1px solid ${n === 0 ? 'transparent' : 'var(--k-in-bd)'}`,
        background: n === 0 ? T.dangerBg : 'var(--k-in-bg)', color: n === 0 ? T.danger : T.text,
      }}
    />
  );
}

export default function VariantEditor({ T, productId, basePrice, onChanged, onDirty, saveRef, disabled }) {
  const { t } = useTranslation('owner');
  const [doc, setDoc] = useState(null);
  const [axes, setAxes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const adopt = useCallback((d) => {
    setDoc(d);
    setAxes(d?.axes?.map((a) => ({ name: a.name, values: [...a.values] })) || []);
    setDirty(false);
    if (onChanged) onChanged(d);
    // onChanged is a parent setter; depending on it would re-run on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The product's document from the query cache (the products screen reads
  // it before the editor opens). It is taken up once per product; from then
  // on the grid on screen is the one each save answered with, so a read that
  // lands while stock is being typed changes nothing typed.
  const read = useQuery({ ...editVariantsQuery(productId), enabled: !!productId });
  const adopted = useRef(null);
  // Before paint, so a document already in the cache is the first thing drawn.
  useLayoutEffect(() => {
    if (!productId || adopted.current === productId) return;
    if (read.isSuccess) {
      adopted.current = productId;
      setError('');
      adopt(read.data);
    } else if (read.isError) {
      setError(handleApiError(read.error, t('variants.loadFailed')));
    }
  }, [productId, read.isSuccess, read.isError, read.data, read.error, t, adopt]);

  // Read again (cancelling the axes, or after a refused save) and start over from it.
  const load = async () => {
    if (!productId) return;
    const again = await read.refetch();
    if (again.isSuccess) adopt(again.data);
    else if (again.isError) setError(handleApiError(again.error, t('variants.loadFailed')));
  };

  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);

  // Every save sends the whole document and renders what comes back, so the
  // grid on screen is always the one the server generated.
  const put = useCallback(async (nextAxes, rows) => {
    const d = await productApi.putVariants(productId, {
      axes: nextAxes.map((a) => ({ name: a.name, values: a.values })),
      rows: rows || doc?.rows || [],
    });
    adopt(d);
    return d;
  }, [productId, doc, adopt]);

  // The page's Save sends the stock typed into the matrix.
  useEffect(() => {
    if (!saveRef) return undefined;
    saveRef.current = async () => {
      if (!dirty || !doc) return;
      await put(axes, doc.rows);
    };
    return () => { saveRef.current = null; };
  }, [saveRef, dirty, doc, axes, put]);

  const applyAxes = async (nextAxes) => {
    setBusy(true);
    setError('');
    try {
      await put(nextAxes);
      setEditing(false);
    } catch (e) {
      setError(handleApiError(e, t('variants.saveFailed')));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const editRow = (key, patch) => {
    setDoc((prev) => ({ ...prev, rows: prev.rows.map((r) => (keyOf(r) === key ? { ...r, ...patch } : r)) }));
    setDirty(true);
  };

  const shell = { ...card(T, 0), overflow: 'hidden', display: 'flex', flexDirection: 'column' };
  const head = (summary, action) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16,
      borderBottom: doc || editing ? `1px solid ${T.border}` : 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <h2 style={{ margin: 0, font: `600 16px/1.3 ${T.font}`, color: T.text }}>{t('variants.title')}</h2>
        <span style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>{summary}</span>
      </div>
      {action}
    </div>
  );
  const link = (label, onClick) => (
    <button type="button" onClick={onClick} disabled={busy || disabled} style={{
      minHeight: 40, padding: '0 4px', border: 0, background: 'none', cursor: 'pointer', flex: 'none',
      color: T.accentFg, font: `600 12.5px ${T.font}`,
    }}>{label}</button>
  );

  if (!productId) {
    return (
      <div style={shell}>
        {head(t('variants.sub'))}
        <div style={{ padding: '0 16px 16px' }}><Alert T={T}>{t('variants.saveProductFirst')}</Alert></div>
      </div>
    );
  }

  // The card's head, and rows where the grid goes, until the document is in.
  if (read.isPending) {
    return (
      <Skeleton style={shell}>
        {head(<SkIn w={180} />)}
        <div style={{ padding: '0 16px 16px', display: 'grid', gap: 10 }}>
          {[0, 1, 2].map((i) => <Sk key={i} h={34} r={9} />)}
        </div>
      </Skeleton>
    );
  }

  const rows = doc?.rows || [];
  const total = rows.reduce((s, r) => s + (Number(r.stock) || 0), 0);
  const summary = doc
    ? [...doc.axes.map((a) => t('editor.axisCount', { n: a.values.length, name: a.name })), t('editor.stockOnCombos')].join(' · ')
    : t('variants.sub');
  const th = {
    textAlign: 'left', font: `600 11px/1.25 ${T.font}`, letterSpacing: '.07em', color: T.textDim,
    padding: '10px 12px', borderBottom: `1px solid ${T.border}`, verticalAlign: 'bottom',
  };
  const td = { padding: '10px 12px', borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle', font: `400 13.5px ${T.font}`, color: T.text, whiteSpace: 'nowrap' };

  // The matrix: the first axis down, the second across (one column of stock
  // when there is only one axis).
  const matrix = doc && !editing && (() => {
    const [a, b] = doc.axes;
    const cols = b ? b.values : [null];
    const find = (va, vb) => rows.find((r) => r.key[0] === va && (vb == null || r.key[1] === vb));
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>{a.name}</th>
              {cols.map((c) => <th key={c ?? 'stock'} style={{ ...th, textAlign: 'right' }}>{c ?? t('variants.stock')}</th>)}
            </tr>
          </thead>
          <tbody>
            {a.values.map((va) => (
              <tr key={va}>
                <td style={td}><b>{va}</b></td>
                {cols.map((vb) => {
                  const r = find(va, vb);
                  return (
                    <td key={vb ?? 'stock'} style={{ ...td, textAlign: 'right' }}>
                      {r ? (
                        <StockCell
                          T={T} value={r.stock} disabled={disabled}
                          label={t('editor.cellLabel', { combo: r.key.join(', '), n: Number(r.stock) || 0 })}
                          onChange={(v) => editRow(keyOf(r), { stock: v })}
                        />
                      ) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td style={{ ...td, borderBottom: 0, background: T.surface2 }}><b>{t('variants.totalStock')}</b></td>
              <td colSpan={cols.length} style={{ ...td, borderBottom: 0, background: T.surface2, textAlign: 'right' }}>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>{total}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  })();

  // "Change": the axes, and each combination's own price (empty means the
  // base price), saved as one document.
  const editor = editing && (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      {axes.map((axis, i) => (
        <AxisRow
          key={i} T={T} t={t} axis={axis} index={i} busy={busy}
          onChange={(next) => setAxes((prev) => prev.map((x, j) => (j === i ? next : x)))}
          onRemove={() => setAxes((prev) => prev.filter((_, j) => j !== i))}
        />
      ))}
      {axes.length >= MAX_AXES
        ? <span style={{ font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>{t('variants.twoAxisCeiling')}</span>
        : (
          <button type="button" disabled={busy} onClick={() => setAxes((prev) => [...prev, { name: '', values: [] }])}
            style={{ ...btn(T, 's', { size: 'sm' }), justifySelf: 'start' }}>
            {t('variants.addAxis')}
          </button>
        )}
      {doc && rows.length > 0 && (
        <div style={{ borderRadius: 'var(--k-r-card)', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {doc.axes.map((ax) => <th key={ax.name} style={th}>{ax.name}</th>)}
                  <th style={{ ...th, textAlign: 'right' }}>{t('variants.price')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={keyOf(r)}>
                    {r.key.map((k, j) => <td key={j} style={td}><b>{k}</b></td>)}
                    <td style={{ ...td, textAlign: 'right' }}>
                      <input
                        type="text" inputMode="decimal" disabled={busy}
                        aria-label={t('editor.priceLabel', { combo: r.key.join(', ') })}
                        // Empty means "the product's base price", which is why
                        // the placeholder shows that price rather than a zero.
                        placeholder={money(basePrice)} value={r.price ?? ''}
                        onChange={(e) => editRow(keyOf(r), { price: e.target.value.replace(',', '.') || null })}
                        style={{
                          width: 96, height: 34, padding: '0 10px', boxSizing: 'border-box', borderRadius: 9, textAlign: 'right',
                          border: '1px solid var(--k-in-bd)', background: 'var(--k-in-bg)', color: T.text,
                          font: `600 13px ${T.font}`, outline: 'none',
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <span style={{ font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>{t('variants.stockNote')}</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" disabled={busy || !axes.length || !axes.every((x) => x.name.trim() && x.values.length)}
          onClick={() => applyAxes(axes)} style={btn(T, 'p', { size: 'sm' })}>
          {busy ? t('variants.saving') : t('variants.apply')}
        </button>
        <button type="button" disabled={busy} onClick={() => { setEditing(false); load(); }} style={btn(T, 'g', { size: 'sm' })}>
          {t('editor.cancel')}
        </button>
        {doc && (
          <button type="button" disabled={busy} style={{ ...btn(T, 'd', { size: 'sm' }), marginLeft: 'auto' }}
            onClick={() => {
              // Turning variants off hands the stock back to the product, so
              // it is not something to do by accident.
              if (window.confirm(t('variants.disableConfirm'))) applyAxes([]);
            }}>
            {t('editor.variantsOff')}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={shell}>
      {head(summary, !editing && link(doc ? t('editor.change') : t('editor.addVariants'), () => {
        setEditing(true);
        if (!doc) setAxes([{ name: '', values: [] }]);
      }))}
      {error && <div style={{ padding: '12px 16px 0' }}><Alert T={T} tone="bad" role="alert">{error}</Alert></div>}
      {matrix}
      {editor}
      {!doc && !editing && (
        <div style={{ padding: '0 16px 16px', font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>{t('variants.offNote')}</div>
      )}
    </div>
  );
}
