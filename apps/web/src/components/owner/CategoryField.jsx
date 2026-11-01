// The product editor's category field (the design's P2): one of the store's
// categories picked from a list, or a new one typed in. A combobox — the list
// filters as the merchant types, arrows walk it, Enter picks — so a category
// already in use is one tap and a typo does not quietly start a second one.
// A name typed in another case is put back in the store's own spelling.
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStoreCategories } from '../../hooks/useStoreCategories';
import { input } from '../../manager/officeKit';

/** As long as the server stores (Product.CATEGORY_MAX). */
export const CATEGORY_MAX = 60;

const ICON = {
  chevron: 'm6 9 6 6 6-6',
  x: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
};

function Glyph({ d, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ellipsis = { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export default function CategoryField({ T, value, onChange, refresh, disabled }) {
  const { t } = useTranslation('owner');
  const { categories } = useStoreCategories(refresh);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef(null);
  const inputRef = useRef(null);
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;

  const typed = value.trim();
  const lower = typed.toLowerCase();
  const exact = categories.find((c) => c.name.toLowerCase() === lower);
  const matches = (lower ? categories.filter((c) => c.name.toLowerCase().includes(lower)) : categories).slice(0, 8);
  const options = [
    ...matches.map((c) => ({ key: `c:${c.name}`, name: c.name, count: c.count })),
    ...(typed && !exact ? [{ key: 'new', name: typed, isNew: true }] : []),
  ];
  const shown = open && options.length > 0;

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const pick = (opt) => {
    onChange(opt.name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && shown && options[active]) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Escape' && shown) {
      // Closes the list, not the dialog around it.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  // "vases" when the store already has "Vases" is the same category.
  const settle = () => {
    if (exact && exact.name !== value) onChange(exact.name);
    else if (typed !== value) onChange(typed);
  };

  const iconButton = {
    width: 40, height: 40, flex: 'none', padding: 0, border: 0, borderRadius: 10, cursor: 'pointer',
    background: 'transparent', color: T.textDim, display: 'grid', placeItems: 'center',
  };

  const list = shown && (
    <ul
      id={listId} role="listbox" aria-label={t('category.label')}
      style={{
        position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 5, margin: 0,
        listStyle: 'none', padding: 6, borderRadius: 14, background: T.surface,
        border: `1px solid ${T.border}`, boxShadow: '0 18px 44px -18px rgba(0,0,0,.4)',
        maxHeight: 280, overflowY: 'auto', boxSizing: 'border-box',
      }}
    >
      {options.map((o, i) => (
        <li
          key={o.key} id={`${listId}-${i}`} role="option" aria-selected={!o.isNew && o.name === value}
          // Keeps focus in the field, so picking does not blur it first.
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => pick(o)}
          onMouseEnter={() => setActive(i)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 12px',
            borderRadius: 10, cursor: 'pointer', color: T.text,
            background: i === active ? T.surface2 : 'transparent',
            font: `${!o.isNew && o.name === value ? 600 : 500} 14px ${T.font}`,
          }}
        >
          {o.isNew ? (
            <>
              <span style={{ color: T.accentFg, display: 'inline-flex' }}><Glyph d={ICON.plus} size={16} /></span>
              <span style={ellipsis}>{t('category.new', { name: o.name })}</span>
            </>
          ) : (
            <>
              <span style={ellipsis}>{o.name}</span>
              <span style={{ flex: 'none', font: `400 12px ${T.font}`, color: T.textDim }}>
                {t('category.count', { count: o.count })}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <div ref={wrap} style={{ position: 'relative' }}>
        <div style={{ ...input(T, { focus }), display: 'flex', alignItems: 'center', gap: 2, padding: '0 6px 0 15px' }}>
          <input
            ref={inputRef} id={id} role="combobox" aria-expanded={shown} aria-controls={listId}
            aria-autocomplete="list" aria-describedby={value.length >= CATEGORY_MAX || !value ? hintId : undefined}
            aria-activedescendant={shown && options[active] ? `${listId}-${active}` : undefined}
            aria-label={t('category.label')}
            value={value} maxLength={CATEGORY_MAX} disabled={disabled} placeholder={t('category.placeholder')}
            autoComplete="off"
            onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => { setOpen(true); setFocus(true); }}
            onBlur={() => { setFocus(false); settle(); }}
            onKeyDown={onKeyDown}
            style={{
              flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none', background: 'transparent',
              padding: 0, color: T.text, font: `400 15px ${T.font}`,
            }}
          />
          {value && !disabled && (
            <button
              type="button" aria-label={t('category.clear')} style={iconButton}
              onClick={() => { onChange(''); inputRef.current?.focus(); }}
            >
              <Glyph d={ICON.x} size={16} />
            </button>
          )}
          <button
            type="button" aria-label={t('category.toggle')} aria-expanded={shown} aria-controls={listId}
            tabIndex={-1} disabled={disabled} style={iconButton}
            onClick={() => { setOpen((v) => !v); inputRef.current?.focus(); }}
          >
            <Glyph d={ICON.chevron} />
          </button>
        </div>
        {list}
      </div>

      {/* The hint is for an empty field; once a category is chosen the
          field speaks for itself, as the board draws it. */}
      {(value.length >= CATEGORY_MAX || !value) && (
        <div id={hintId} style={{ marginTop: 6, font: `400 12px ${T.font}`, color: value.length >= CATEGORY_MAX ? T.danger : T.textMute }}>
          {value.length >= CATEGORY_MAX ? t('category.tooLong', { max: CATEGORY_MAX }) : t('category.hint')}
        </div>
      )}
    </div>
  );
}
