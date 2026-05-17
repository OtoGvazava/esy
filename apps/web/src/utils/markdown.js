// Tiny, dependency-free Markdown → safe HTML for product descriptions.
//
// Security model: the ENTIRE input is HTML-escaped first, so no user text can
// ever become a tag or attribute. Only the small set of tags we emit below
// (from recognised Markdown) ever reaches the DOM, and link hrefs are limited
// to http(s)/mailto. Output is therefore safe for dangerouslySetInnerHTML.
// This is intentionally a minimal subset (bold, italic, code, headings,
// lists, links) — enough to "style" a description without a heavy editor.

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// `text` is already HTML-escaped. We only add our own tags around it.
const inline = (text) => {
  let s = text;
  // [label](url) — url scheme allow-listed; otherwise keep just the label.
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const safe = /^(https?:\/\/|mailto:)/i.test(url);
    return safe
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>`
      : label;
  });
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  return s;
};

const isUl = (l) => /^[-*]\s+/.test(l);
const isOl = (l) => /^\d+\.\s+/.test(l);

export const renderMarkdown = (src) => {
  if (!src || !String(src).trim()) return '';
  const escaped = escapeHtml(String(src).replace(/\r\n?/g, '\n'));
  const blocks = escaped.split(/\n\s*\n/);
  const html = [];

  for (const raw of blocks) {
    const block = raw.replace(/^\n+|\n+$/g, '');
    if (!block) continue;
    const lines = block.split('\n');

    if (lines.every(isUl)) {
      html.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')}</ul>`);
      continue;
    }
    if (lines.every(isOl)) {
      html.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`);
      continue;
    }
    const h = lines.length === 1 && lines[0].match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const tag = h[1].length === 1 ? 'h3' : h[1].length === 2 ? 'h4' : 'h5';
      html.push(`<${tag}>${inline(h[2])}</${tag}>`);
      continue;
    }
    html.push(`<p>${lines.map(inline).join('<br>')}</p>`);
  }

  return html.join('');
};
