// Bulk product upload from a CSV file (decision D7), as the design's P3: a
// back-office page in three steps — the template, the file, the result.
//
// Choosing a file checks it without writing anything (a dry run), so the
// merchant sees the rows that will become products — or every problem, by
// line — before committing. The import itself is all or nothing: one bad row
// rejects the file, so there is no state where half of it has landed.
//
// The design's result also counts "updates to existing products"; the
// importer only creates, so the screen says what it really does.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTK } from '../../core/useTK';
import { useDevice } from '../../contexts/DeviceContext';
import { money } from '../../core/money';
import { alpha } from '../../core/tokens';
import { productApi, handleApiError } from '../../utils/api';
import { PageHead } from '../../manager/officeKit';

// The columns the importer reads (ProductImportService.COLUMNS), named as the
// header row must name them. They are file syntax, not words to translate.
const COLUMNS = 'title, price, quantity, category, description';
const MAX_ROWS = 500;
// Longest cell a column takes, for the "too long" problem.
const MAX_LENGTH = { title: 255, category: 60 };
// Rows shown before "show all", and problems shown at all.
const PREVIEW = 10;
const ERRORS_SHOWN = 50;

const I = {
  back: 'M15 5 8 12l7 7',
  download: 'M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  check: 'm5 12.5 4.5 4.5L19 7.5',
};

function Glyph({ size = 20, children }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: 'none', strokeWidth: 'var(--k-ic-w, 1.8)' }}>
      {children}
    </svg>
  );
}

const kb = (bytes) => `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`;

export default function ImportProductsDialog({ onClose, onImported }) {
  const { t, i18n } = useTranslation(['owner', 'common']);
  const { T } = useTK();
  const { isMobile, isDesktop } = useDevice();
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [done, setDone] = useState(0);
  const [allRows, setAllRows] = useState(false);
  const [drag, setDrag] = useState(false);
  // The file input is hidden inside the drop zone, so the zone shows its focus.
  const [zoneFocus, setZoneFocus] = useState(false);

  // A file refused outright (empty, a missing column, too many rows) comes
  // with a code and the values in its sentence, so it is said in the
  // merchant's language; anything else shows the server's words.
  const fileProblem = (err, fallbackKey) => {
    if (err?.code && i18n.exists(`owner:import.file.${err.code}`)) {
      const d = err.details || {};
      return t(`import.file.${err.code}`, {
        columns: COLUMNS, column: d.column, rows: d.rows, max: d.max ?? MAX_ROWS,
        field: d.column ? t(`import.field.${d.column}`, { defaultValue: d.column }) : '',
      });
    }
    return handleApiError(err, t(fallbackKey));
  };

  const check = async (picked) => {
    if (!picked) return;
    setFile(picked);
    setReport(null);
    setApiError('');
    setDone(0);
    setAllRows(false);
    setBusy(true);
    try {
      setReport(await productApi.importCsv(picked, { dryRun: true }));
    } catch (err) {
      setApiError(fileProblem(err, 'import.checkFailed'));
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (busy || !file || !report?.ok) return;
    setBusy(true);
    setApiError('');
    try {
      const result = await productApi.importCsv(file, { dryRun: false });
      setReport(result);
      if (result?.ok) {
        setDone(result.imported || 0);
        onImported?.(result);
      }
    } catch (err) {
      setApiError(fileProblem(err, 'import.failed'));
    } finally {
      setBusy(false);
    }
  };

  const choose = () => fileRef.current?.click();
  const again = () => {
    setFile(null);
    setReport(null);
    setApiError('');
    setDone(0);
    choose();
  };

  // ---- styles, after the design's kit (card, chip, btn, alert, tbl)
  const card = {
    background: T.surface, border: 'var(--k-card-bd)', boxShadow: 'var(--k-card-sh)',
    borderRadius: 'var(--k-r-card)', boxSizing: 'border-box',
  };
  const step = {
    display: 'inline-grid', placeItems: 'center', minWidth: 26, height: 26, padding: '0 8px',
    boxSizing: 'border-box', borderRadius: 'var(--k-r-pill)', background: T.surface2, color: T.text,
    font: `600 12px ${T.font}`, flex: 'none',
  };
  const btn = (kind, extra) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48,
    padding: '0 22px', borderRadius: 'var(--k-r-btn)', border: 0, cursor: 'pointer', flex: 'none',
    font: `600 15px ${T.font}`, whiteSpace: 'nowrap', textDecoration: 'none', boxSizing: 'border-box',
    overflow: 'hidden', textOverflow: 'ellipsis',
    ...(kind === 'p' && { background: T.grad, color: T.onAccent }),
    ...(kind === 's' && { background: T.surface2, color: T.text }),
    ...(kind === 'g' && { background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}` }),
    // The kit's unavailable button: filled grey, never a faded primary.
    ...(kind === 'off' && {
      background: `color-mix(in srgb, ${T.text} 9%, ${T.surface})`,
      color: `color-mix(in srgb, ${T.text} 56%, ${T.surface})`, cursor: 'default',
    }),
    ...extra,
  });
  const alert = (tone) => ({
    display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 'var(--k-r-card)',
    color: T.text, font: `400 12.5px/1.5 ${T.font}`,
    background: { info: 'var(--k-info-bg)', ok: T.successBg, bad: T.dangerBg }[tone],
  });
  const alertIcon = (tone) => ({ color: { info: 'var(--k-info)', ok: T.successFg, bad: T.danger }[tone], display: 'inline-flex', marginTop: -1 });
  const th = {
    textAlign: 'left', font: `600 11px ${T.font}`, letterSpacing: '0.07em', color: T.textDim,
    padding: '12px 16px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
  };
  const td = {
    padding: '13px 16px', borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle',
    font: `400 13.5px ${T.font}`, color: T.text, whiteSpace: 'nowrap',
  };
  const num = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  // ---- the problems, in the merchant's language when the server named them
  const problem = (e) => {
    if (!e.code) return e.message;
    const field = t(`import.field.${e.column}`, { defaultValue: e.column });
    return t(`import.err.${e.code}`, { field, value: e.value, max: MAX_LENGTH[e.column], defaultValue: e.message });
  };

  const errors = report && !report.ok ? report.errors || [] : [];
  const badLines = new Set(errors.map((e) => e.line)).size;
  const okLines = Math.max((report?.parsed || 0) - badLines, 0);
  const rows = report?.ok ? report.rows || [] : [];
  const shownRows = allRows ? rows : rows.slice(0, PREVIEW);
  const hiddenRows = (report?.parsed || 0) - shownRows.length;

  // ---- step 2's drop zone says what it holds
  let zoneTitle = t('import.choose');
  let zoneMeta = t('import.chooseHint', { max: MAX_ROWS });
  if (file) {
    zoneTitle = file.name;
    zoneMeta = busy && !report ? t('import.fileChecking', { size: kb(file.size) })
      : report ? t('import.fileChecked', { count: report.parsed, size: kb(file.size) })
        : t('import.fileFailed', { size: kb(file.size) });
  }

  const result = () => {
    if (done > 0) {
      return (
        <>
          <div role="status" style={alert('ok')}>
            <span style={alertIcon('ok')}><Glyph><path d={I.check} /></Glyph></span>
            <span><b>{t('import.doneLead', { count: done })}</b> {t('import.doneBody')}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" onClick={onClose} style={btn('p')}>{t('import.back')}</button>
            <button type="button" onClick={again} style={btn('g')}>{t('import.another')}</button>
          </div>
        </>
      );
    }
    if (apiError) {
      return (
        <div role="alert" style={alert('bad')}>
          <span style={alertIcon('bad')}><Glyph><path d="M12 4 2.5 20h19z" /><path d="M12 10v4M12 17v.5" /></Glyph></span>
          <span>{apiError}</span>
        </div>
      );
    }
    if (busy && !report) {
      return <div role="status" style={{ font: `500 13px ${T.font}`, color: T.textDim }}>{t('import.checking')}</div>;
    }
    if (!report) {
      return (
        <div style={{ ...card, padding: 16, font: `400 13px/1.5 ${T.font}`, color: T.textDim }}>
          {t('import.waiting')}
        </div>
      );
    }
    if (!report.ok) {
      return (
        <>
          <div role="alert" style={alert('bad')}>
            <span style={alertIcon('bad')}><Glyph><path d="M12 4 2.5 20h19z" /><path d="M12 10v4M12 17v.5" /></Glyph></span>
            <span>
              <b>{t('import.errorsLead', { count: badLines })}</b>{' '}
              {okLines > 0 ? t('import.errorsBody', { count: okLines }) : t('import.errorsBodyNone')}
            </span>
          </div>
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>{t('import.colLine')}</th>
                    <th style={th}>{t('import.colColumn')}</th>
                    <th style={th}>{t('import.colProblem')}</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.slice(0, ERRORS_SHOWN).map((e, i) => (
                    <tr key={`${e.line}-${e.column}-${i}`}>
                      <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{e.line}</td>
                      <td style={{ ...td, font: `400 13px ${T.mono}` }}>{e.column}</td>
                      <td style={{ ...td, whiteSpace: 'normal' }}>{problem(e)}</td>
                    </tr>
                  ))}
                  {errors.length > ERRORS_SHOWN && (
                    <tr>
                      <td colSpan={3} style={{ ...td, color: T.textDim, borderBottom: 0 }}>
                        {t('import.moreErrors', { count: errors.length - ERRORS_SHOWN })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" onClick={choose} disabled={busy} style={btn('p', isMobile ? { flex: '1 1 100%' } : undefined)}>
              {t('import.reupload')}
            </button>
            <button type="button" disabled aria-disabled="true" style={btn('off', isMobile ? { flex: '1 1 100%' } : undefined)}>
              {t('import.importBtn')}
            </button>
          </div>
        </>
      );
    }
    return (
      <>
        <div role="status" style={alert('ok')}>
          <span style={alertIcon('ok')}><Glyph><path d={I.check} /></Glyph></span>
          <span>
            <b>{t('import.readyLead', { count: report.parsed })}</b>{' '}
            {t('import.readyBody', { count: report.parsed })}
          </span>
        </div>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>{t('import.colName')}</th>
                  {isDesktop && <th style={th}>{t('import.colCategory')}</th>}
                  <th style={{ ...th, textAlign: 'right' }}>{t('import.colPrice')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('import.colStock')}</th>
                </tr>
              </thead>
              <tbody>
                {shownRows.map((r) => (
                  <tr key={r.line}>
                    <td style={{ ...td, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{r.title}</td>
                    {isDesktop && <td style={{ ...td, color: T.textDim }}>{r.category || '—'}</td>}
                    <td style={{ ...num, fontWeight: 600 }}>{money(r.price)}</td>
                    <td style={num}>{r.quantity}</td>
                  </tr>
                ))}
                {hiddenRows > 0 && (
                  <tr>
                    <td colSpan={isDesktop ? 4 : 3} style={{ ...td, borderBottom: 0, color: T.textDim }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        {t('import.moreRows', { count: hiddenRows })}
                        {!allRows && rows.length > shownRows.length && (
                          <button
                            type="button" onClick={() => setAllRows(true)}
                            style={{
                              minHeight: 40, padding: '0 4px', border: 0, background: 'none', cursor: 'pointer',
                              color: T.accentFg, font: `600 12.5px ${T.font}`,
                            }}
                          >{t('import.showAll')}</button>
                        )}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <button type="button" onClick={commit} disabled={busy} style={btn('p', { width: '100%', opacity: busy ? 0.7 : 1 })}>
          {busy ? t('import.working') : t('import.importN', { count: report.parsed })}
        </button>
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>
      {/* In the back office this heading is the shell's header bar. */}
      <PageHead
        T={T} title={t('import.pageTitle')} sub={t('import.pageSub')} mobile={isMobile}
        onBack={busy && !!report?.ok ? undefined : onClose} backLabel={t('import.back')}
      />

      <div style={{
        display: 'grid', gap: 20, alignItems: 'start',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={step}>1</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 12.5px ${T.font}`, color: T.text }}>{t('import.step1')}</div>
              <div style={{ marginTop: 2, font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>
                {t('import.columns', { columns: COLUMNS })}
              </div>
            </div>
            <a href={productApi.importTemplateUrl()} download style={btn('s', { height: 40, padding: '0 15px', font: `600 13.5px ${T.font}` })}>
              <Glyph><path d={I.download} /></Glyph>
              {t('import.template')}
            </a>
          </div>

          <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={step}>2</span>
              <span style={{ font: `600 12.5px ${T.font}`, color: T.text }}>{t('import.step2')}</span>
            </div>
            <label
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (!busy) check(e.dataTransfer.files?.[0] || null);
              }}
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: 26, textAlign: 'center', cursor: busy ? 'default' : 'pointer', color: T.textDim,
                borderRadius: 'var(--k-r-card)', border: `2px dashed ${drag ? T.accent : T.border}`,
                background: drag ? T.accentBg : T.surface,
                boxShadow: zoneFocus ? `0 0 0 3px ${alpha(T.accent, 0.35)}` : 'none',
              }}
            >
              <Glyph size={28}><path d={I.upload} /></Glyph>
              <b style={{ color: T.text, font: `600 14px ${T.font}`, overflowWrap: 'anywhere' }}>{zoneTitle}</b>
              <span style={{ font: `400 12px ${T.font}` }}>{zoneMeta}</span>
              <input
                ref={fileRef} type="file" accept=".csv,text/csv" aria-label={t('import.fileLabel')} disabled={busy}
                onFocus={() => setZoneFocus(true)} onBlur={() => setZoneFocus(false)}
                onChange={(e) => {
                  check(e.target.files?.[0] || null);
                  // The same file chosen again after an edit is a new check.
                  e.target.value = '';
                }}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
              />
            </label>
          </div>

          <div style={alert('info')}>
            <span style={alertIcon('info')}>
              <Glyph><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" /></Glyph>
            </span>
            <span>{t('import.note')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={step}>3</span>
            <span style={{ font: `600 12.5px ${T.font}`, color: T.text }}>{t('import.step3')}</span>
          </div>
          {result()}
        </div>
      </div>
    </div>
  );
}
