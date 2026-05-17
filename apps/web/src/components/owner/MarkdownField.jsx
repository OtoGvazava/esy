import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { renderMarkdown } from '../../utils/markdown';
import { glowField } from './glowForm';

// Glow-styled Markdown editor: a formatting toolbar over a textarea, plus a
// live preview. Storage stays plain text (Markdown); render is the safe
// dependency-free renderMarkdown. Used for the product description.
export default function MarkdownField({ value, onChange, rows = 5 }) {
  const { T } = useGlow();
  const { t } = useTranslation('owner');
  const ref = useRef(null);
  const [preview, setPreview] = useState(false);
  const sel = useRef(null); // [start, end] to restore after controlled update

  useLayoutEffect(() => {
    if (sel.current && ref.current) {
      const [s, e] = sel.current;
      ref.current.focus();
      ref.current.setSelectionRange(s, e);
      sel.current = null;
    }
  });

  const apply = (mut) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const v = value || '';
    const next = mut(v, start, end);
    sel.current = [next.selStart, next.selEnd];
    onChange(next.value);
  };

  const wrap = (token) => apply((v, s, e) => {
    const selected = v.slice(s, e) || t('mdSample', { defaultValue: 'text' });
    const value_ = v.slice(0, s) + token + selected + token + v.slice(e);
    return { value: value_, selStart: s + token.length, selEnd: s + token.length + selected.length };
  });

  const linePrefix = (prefix) => apply((v, s) => {
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    const value_ = v.slice(0, lineStart) + prefix + v.slice(lineStart);
    return { value: value_, selStart: s + prefix.length, selEnd: s + prefix.length };
  });

  const link = () => apply((v, s, e) => {
    const label = v.slice(s, e) || t('mdLinkText', { defaultValue: 'text' });
    const snippet = `[${label}](https://)`;
    const value_ = v.slice(0, s) + snippet + v.slice(e);
    // place caret inside the (https://) so the owner types the URL
    const caret = s + label.length + 3;
    return { value: value_, selStart: caret, selEnd: caret + 8 };
  });

  const btn = {
    height: 30, minWidth: 32, padding: '0 9px', borderRadius: 8,
    border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
    font: `600 12px ${T.font}`, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
  };
  const toggle = (on) => ({
    ...btn,
    background: on ? T.accentBg : 'transparent',
    color: on ? T.accentFg : T.textDim,
    borderColor: on ? T.accent : T.border,
  });

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        <button type="button" onClick={() => wrap('**')} style={btn} title={t('mdBold')} aria-label={t('mdBold')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4h6.5a4 4 0 0 1 2.6 7 4.2 4.2 0 0 1-2 7.9H7zm3 3v4h3a2 2 0 0 0 0-4zm0 7v4h3.2a2 2 0 0 0 0-4z" /></svg>
        </button>
        <button type="button" onClick={() => wrap('*')} style={btn} title={t('mdItalic')} aria-label={t('mdItalic')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 5h-7M12 19H5M15 5 9 19" /></svg>
        </button>
        <button type="button" onClick={() => linePrefix('## ')} style={btn} title={t('mdHeading')} aria-label={t('mdHeading')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 5v14M18 5v14M6 12h12" /></svg>
        </button>
        <button type="button" onClick={() => linePrefix('- ')} style={btn} title={t('mdList')} aria-label={t('mdList')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>
        </button>
        <button type="button" onClick={link} style={btn} title={t('mdLink')} aria-label={t('mdLink')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => setPreview(false)} style={toggle(!preview)}>{t('mdWrite')}</button>
        <button type="button" onClick={() => setPreview(true)} style={toggle(preview)}>{t('mdPreview')}</button>
      </div>

      {preview ? (
        <div
          className="glow-md"
          style={{
            ...glowField(T), height: 'auto', minHeight: rows * 24,
            padding: '12px 16px', overflowWrap: 'anywhere',
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || `<span style="opacity:.5">${t('mdEmpty')}</span>` }}
        />
      ) : (
        <textarea
          ref={ref}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          style={{ ...glowField(T), height: 'auto', padding: '12px 16px', resize: 'vertical', lineHeight: 1.5 }}
        />
      )}
    </div>
  );
}
