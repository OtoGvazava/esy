import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { productApi, handleApiError } from '../../utils/api';
import GlowModal from './GlowModal';
import { glowGhostBtn, glowError } from './glowForm';

// Bulk product upload from a CSV file (decision D7).
//
// Two steps on purpose. Picking a file checks it without writing anything
// (dryRun), so the merchant sees "12 products will be added" — or the list of
// what is wrong — before committing. The import itself is all-or-nothing, so
// there is no state where half a file has landed and the rest has not.
export default function ImportProductsDialog({ open, onClose, onImported }) {
  const { t } = useTranslation(['owner', 'common']);
  const { T } = useGlow();
  const fileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (open) {
      setFile(null);
      setReport(null);
      setApiError('');
      setDone(0);
    }
  }, [open]);

  const check = async (picked) => {
    setFile(picked);
    setReport(null);
    setApiError('');
    if (!picked) return;
    setBusy(true);
    try {
      setReport(await productApi.importCsv(picked, { dryRun: true }));
    } catch (err) {
      setApiError(handleApiError(err, t('import.checkFailed')));
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (busy || !file) return;
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
      setApiError(handleApiError(err, t('import.failed')));
    } finally {
      setBusy(false);
    }
  };

  const primaryBtn = (disabled) => ({
    height: 50, padding: '0 22px', borderRadius: 14, border: 'none',
    background: disabled ? T.surface2 : T.grad, color: disabled ? T.textMute : '#fff',
    font: `700 14px ${T.font}`, cursor: disabled ? 'default' : 'pointer',
  });

  const canCommit = !!report && report.ok && !done;

  const footer = done ? (
    <button onClick={onClose} style={primaryBtn(false)}>
      {t('import.close')}
    </button>
  ) : (
    <>
      <button onClick={onClose} disabled={busy} style={glowGhostBtn(T, busy)}>
        {t('cancel', { ns: 'common', defaultValue: 'Cancel' })}
      </button>
      <button onClick={commit} disabled={busy || !canCommit} style={primaryBtn(busy || !canCommit)}>
        {busy ? t('import.working')
          : report?.ok ? t('import.commit', { count: report.parsed })
          : t('import.commitIdle')}
      </button>
    </>
  );

  const note = { font: `400 12.5px/1.6 ${T.font}`, color: T.textDim };

  return (
    <GlowModal open={open} title={t('import.title')} onClose={onClose} busy={busy} footer={footer}>
      {apiError && <div style={glowError(T)}>{apiError}</div>}

      {done > 0 ? (
        <div style={{ font: `600 14px/1.6 ${T.font}`, color: T.success }}>
          {t('import.doneBody', { count: done })}
        </div>
      ) : (
        <>
          <div style={{ ...note, marginBottom: 12 }}>{t('import.intro')}</div>

          <div style={{ marginBottom: 14 }}>
            <a
              href={productApi.importTemplateUrl()}
              download
              style={{ font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' }}
            >
              {t('import.downloadTemplate')}
            </a>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => check(e.target.files?.[0] || null)}
            style={{ font: `500 13px ${T.font}`, color: T.textDim, marginBottom: 12 }}
          />

          {busy && <div style={note}>{t('import.checking')}</div>}

          {report && report.ok && (
            <div style={{ font: `600 13px ${T.font}`, color: T.success }}>
              {t('import.willAdd', { count: report.parsed })}
            </div>
          )}

          {report && !report.ok && (
            <div>
              <div style={{ font: `700 12.5px ${T.font}`, color: T.danger, marginBottom: 8 }}>
                {t('import.problems', { count: report.errors.length })}
              </div>
              {/* Every problem, not the first: the point is one editing pass
                  over the file rather than upload-fix-upload for each row. */}
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {report.errors.map((e, i) => (
                  <div key={i} style={{ font: `500 12px ${T.mono || T.font}`, color: T.textDim }}>
                    {t('import.lineError', { line: e.line, message: e.message })}
                  </div>
                ))}
              </div>
              <div style={{ ...note, marginTop: 10 }}>{t('import.nothingWritten')}</div>
            </div>
          )}
        </>
      )}
    </GlowModal>
  );
}
