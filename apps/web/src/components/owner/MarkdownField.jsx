import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTK } from '../../core/useTK';
import { useIndicator } from '../../core/useIndicator';
import { renderMarkdown } from '../../utils/markdown';
import { input } from '../../manager/officeKit';

// The product description: the kit's textarea, with a small row of Markdown
// tools above it and a preview. Storage stays plain text (Markdown); render is
// the safe dependency-free renderMarkdown. The board draws a bare textarea;
// the tools stay because descriptions are Markdown on the storefront, and
// typing ** by hand is the slow way to bold a word.
export default function MarkdownField({ value, onChange, rows = 5 }) {
  const { T } = useTK();
  const { t } = useTranslation('owner');
  const ref = useRef(null);
  const [preview, setPreview] = useState(false);
  const [focus, setFocus] = useState(false);
  const sel = useRef(null); // [start, end] to restore after controlled update
  const tabs = useRef(null);
  const ind = useIndicator(tabs, preview ? 'preview' : 'write');

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

  const tool = {
    height: 32, minWidth: 30, padding: '0 6px', borderRadius: 8, border: 0, flex: 'none',
    background: 'transparent', color: T.textDim, font: `600 12px ${T.font}`, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
  // The chosen tab's ground is the marker under the two (useIndicator), not its own.
  const tab = (on) => ({
    ...tool, position: 'relative', zIndex: 1, padding: '0 8px', color: on ? T.text : T.textDim,
    transition: 'color var(--m-base) ease, transform var(--m-quick) var(--m-ease)',
  });
  const box = {
    ...input(T, { focus: focus && !preview }), height: 'auto', minHeight: Math.max(110, rows * 24),
    padding: '13px 15px', lineHeight: 1.5,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 6, minWidth: 0 }}>
        <button type="button" onClick={() => wrap('**')} style={tool} title={t('mdBold')} aria-label={t('mdBold')} disabled={preview}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4h6.5a4 4 0 0 1 2.6 7 4.2 4.2 0 0 1-2 7.9H7zm3 3v4h3a2 2 0 0 0 0-4zm0 7v4h3.2a2 2 0 0 0 0-4z" /></svg>
        </button>
        <button type="button" onClick={() => wrap('*')} style={tool} title={t('mdItalic')} aria-label={t('mdItalic')} disabled={preview}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 5h-7M12 19H5M15 5 9 19" /></svg>
        </button>
        <button type="button" onClick={() => linePrefix('## ')} style={tool} title={t('mdHeading')} aria-label={t('mdHeading')} disabled={preview}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 5v14M18 5v14M6 12h12" /></svg>
        </button>
        <button type="button" onClick={() => linePrefix('- ')} style={tool} title={t('mdList')} aria-label={t('mdList')} disabled={preview}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>
        </button>
        <button type="button" onClick={link} style={tool} title={t('mdLink')} aria-label={t('mdLink')} disabled={preview}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></svg>
        </button>
        <span style={{ flex: 1 }} />
        {/* Write and preview: the chosen one's ground slides to the other. */}
        <span ref={tabs} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 2, flex: 'none' }}>
          <span aria-hidden="true" className="esy-ind" data-still={ind.still || undefined} style={{ ...ind.style, borderRadius: 8, background: T.surface2 }} />
          <button type="button" onClick={() => setPreview(false)} data-ind="write" className="esy-press" style={tab(!preview)} aria-pressed={!preview}>{t('mdWrite')}</button>
          <button type="button" onClick={() => setPreview(true)} data-ind="preview" className="esy-press" style={tab(preview)} aria-pressed={preview}>{t('mdPreview')}</button>
        </span>
      </div>

      {preview ? (
        <div
          className="glow-md"
          style={{ ...box, overflowWrap: 'anywhere', font: `400 14px/1.5 ${T.font}` }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || `<span style="opacity:.5">${t('mdEmpty')}</span>` }}
        />
      ) : (
        <textarea
          ref={ref}
          value={value || ''}
          aria-label={t('fieldDescription')}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          rows={rows}
          style={{ ...box, resize: 'vertical', display: 'block' }}
        />
      )}
    </div>
  );
}
