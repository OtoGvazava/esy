// Settings → Design (the design's Z3 "Design" and Z4 "Publish" boards): the
// owner changes the store's look after the store was created. A ready-made
// look to start from, then the four choices a look is made of and the stories
// switch, drawn live in the store's own colour.
//
// Nothing an owner does here reaches buyers until it is published. Edits are
// saved as a draft (PUT …/design/draft); publishing the saved draft confirms
// first, listing what changes against the published design; deleting the
// draft is a danger action that confirms too. So the screen tracks three
// layers: unsaved edits, the saved draft, and what is published.
//
// OWNER-only, like every settings screen: the Settings entry is locked for a
// manager and the API refuses them anyway. With the platform's design switch
// off (designEnabled false) a draft can still be saved, but not published.
//
// The style options (buttons, corners, font, …) are in the design object but
// have no controls here yet. A look sets them, and the publish list counts
// them, so they never change unannounced.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { safeAccent } from '../core/tokens';
import { Btn, Card, Note, Toggle } from '../core/primitives';
import { Icons } from '../core/icons';
import schema from '../core/design/schema.json';
import { normalizeDesign } from '../core/design/normalize';
import { lookById } from '../core/design/looks';
import LookPicker from '../components/design/LookPicker';
import LookThumb from '../components/design/LookThumb';
import { tenantApi } from '../utils/api';
import { designChanges, designJson, liveDesign, sameDesign, savedDesign } from './designDraft';
import { DiscardDialog, PreviewDialog, PublishDialog } from './DesignDialogs';
import { DesignCoverSection, DesignShowRows } from './DesignSections';

// The design draws Soft first; the ids themselves are the schema's.
const THEMES = ['soft', 'glow', 'neon'].filter((id) => schema.options.theme.includes(id));
const MENUS = schema.options.menu;
const LAYOUTS = schema.options.productLayout;
const HEADERS = schema.options.header;

// Refusals the server names with a code, each with its own sentence.
const ERR_CODES = ['DESIGN_NO_DRAFT', 'DESIGN_DISABLED', 'DESIGN_TOO_LARGE', 'DESIGN_INVALID'];

// Unsaved edits per store. Switching settings tabs unmounts this screen, and
// an edit lost to a tab click is worth a few lines to keep (a reload is
// covered by the beforeunload prompt instead). An entry is used only while
// the saved design it was edited from is still the one the server has.
const unsaved = new Map();

/** The server's { draft, published }, normalised; the timestamps are not shown. */
const toView = (raw) => ({
  draft: raw?.draft ? normalizeDesign(raw.draft) : null,
  published: raw?.published ? normalizeDesign(raw.published) : null,
});

// The theme tiles' swatches and the menu tiles' schematics, from the design.
const THEME_SWATCH = {
  soft: { borderRadius: 10, background: 'linear-gradient(90deg, #f4b860 0 50%, #8fc7f0 50%)' },
  glow: { borderRadius: 17, background: 'linear-gradient(90deg, #ec4899, #7c3aed)' },
  neon: { borderRadius: 4, background: '#07070b', boxShadow: 'inset 0 0 0 1px #2ef2c8' },
};
const MENU_MARKS = {
  tabs: [{ left: 6, right: 6, bottom: 5, height: 6, borderRadius: 3 }],
  capsule: [
    { left: 6, right: 18, bottom: 5, height: 6, borderRadius: 3 },
    { right: 6, bottom: 4, width: 8, height: 8, borderRadius: '50%' },
  ],
  mini: [{ left: 18, right: 18, bottom: 5, height: 6, borderRadius: 3 }],
  top: [
    { left: 6, right: 6, top: 6, height: 4, borderRadius: 2 },
    { left: 6, width: 14, top: 13, height: 3, borderRadius: 2, opacity: 0.5 },
  ],
  drawer: [{ left: 3, top: 3, bottom: 3, width: 24, borderRadius: 5 }],
  fab: [{ right: 6, bottom: 4, width: 12, height: 12, borderRadius: '50%' }],
};

const glyph = {
  width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false',
};
const UndoIcon = () => (
  <svg {...glyph}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
);
const TrashIcon = () => (
  <svg {...glyph}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);

/** The element's width, measured before paint so the layout does not jump. */
function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => setWidth(Math.round(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

const labelStyle = (T) => ({ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.07em' });

function Group({ T, label, children }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <div id={id} style={{ ...labelStyle(T), marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

function Tile({ T, on, onClick, label, children }) {
  return (
    <button
      type="button" aria-pressed={on} onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0,
        padding: '10px 6px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
        border: `1.5px solid ${on ? T.accent : T.border}`,
        background: on ? `color-mix(in oklab, ${T.accent} 7%, ${T.surface})` : T.surface,
        color: T.text, font: `600 12px/1.3 ${T.font}`,
      }}
    >
      {children}
      <span style={{ maxWidth: '100%', overflowWrap: 'break-word' }}>{label}</span>
    </button>
  );
}

/** A segmented control: one of a few, all visible (the design's `seg`). */
function Seg({ T, options, value, label, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 13, background: T.surface2 }}>
      {options.map((id) => {
        const on = value === id;
        return (
          <button
            key={id} type="button" aria-pressed={on} onClick={() => onChange(id)}
            style={{
              flex: '1 1 0', minWidth: 0, minHeight: 38, padding: '4px 6px', borderRadius: 9,
              border: 'none', cursor: 'pointer', overflowWrap: 'break-word',
              background: on ? (T.dark ? 'color-mix(in oklab, var(--k-fg) 16%, var(--k-sf2))' : T.surface) : 'transparent',
              boxShadow: on ? '0 1px 4px rgba(0,0,0,0.14)' : 'none',
              color: on ? T.text : T.textDim, font: `${on ? 600 : 500} 13px/1.25 ${T.font}`,
            }}
          >{label(id)}</button>
        );
      })}
    </div>
  );
}

function MenuMark({ T, id }) {
  return (
    <span aria-hidden="true" style={{
      position: 'relative', display: 'block', width: 56, height: 36, flex: 'none',
      borderRadius: 8, boxShadow: `inset 0 0 0 1.5px ${T.border}`,
    }}>
      {(MENU_MARKS[id] || []).map((mark, i) => (
        <i key={i} style={{ position: 'absolute', background: T.text, ...mark }} />
      ))}
    </span>
  );
}

/** A labelled on/off row. The row is the switch; the Toggle only draws it. */
function SwitchRow({ T, label, on, onClick }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        width: '100%', minHeight: 44, padding: 0, border: 'none', background: 'transparent',
        cursor: 'pointer', color: T.text, font: `500 13px ${T.font}`, textAlign: 'left',
      }}
    >
      <span>{label}</span>
      <span aria-hidden="true" style={{ display: 'inline-flex' }}><Toggle T={T} on={on} /></span>
    </button>
  );
}

function MenuItem({ T, danger, disabled, onClick, children }) {
  return (
    <button
      type="button" role="menuitem" disabled={disabled} onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 46, padding: '0 12px',
        border: 'none', borderRadius: 12, background: 'transparent', textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        color: danger ? T.dangerFg : T.text, font: `500 14px ${T.font}`,
      }}
    >{children}</button>
  );
}

const floating = {
  background: 'var(--k-fl-bg)', border: 'var(--k-fl-bd)', boxShadow: 'var(--k-fl-sh)',
};

export default function ManagerDesign() {
  const { T, dark, accent } = useTK();
  const { t } = useTranslation('design');
  const { isMobile } = useDevice();
  const { isStoreOwner, loading: authLoading } = useAuth();
  const { tenant, refresh } = useTenant();
  const [params] = useSearchParams();
  const sub = params.get('tenant') || undefined;
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  const cacheKey = sub || '';

  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const width = useWidth(rootRef);

  const [view, setView] = useState(null); // { draft, published }, normalised
  const [edit, setEdit] = useState(null); // the design on screen
  const [history, setHistory] = useState([]); // earlier edits, for undo
  const [phase, setPhase] = useState('loading'); // loading | ready | failed | denied
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(''); // '' | save | publish | discard
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState(''); // '' | saved | published | deleted
  const [dialog, setDialog] = useState(''); // '' | publish | discard | preview
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchedOff, setSwitchedOff] = useState(false);

  // A publish or delete answers with the new state; editing restarts from it.
  const applyView = (raw) => {
    const next = toView(raw);
    setView(next);
    setEdit(savedDesign(next));
    setHistory([]);
  };

  useEffect(() => {
    if (authLoading) return undefined;
    if (!isStoreOwner) {
      setPhase('denied');
      return undefined;
    }
    const ac = new AbortController();
    setPhase('loading');
    tenantApi.design(sub, { signal: ac.signal })
      .then((raw) => {
        if (ac.signal.aborted) return;
        const next = toView(raw);
        const kept = unsaved.get(cacheKey);
        const fresh = kept && kept.base === designJson(savedDesign(next));
        if (!fresh) unsaved.delete(cacheKey);
        setView(next);
        setEdit(fresh ? kept.edit : savedDesign(next));
        setHistory([]);
        setPhase('ready');
      })
      .catch((e) => {
        if (ac.signal.aborted || e?.name === 'AbortError') return;
        setPhase(e?.status === 403 ? 'denied' : 'failed');
      });
    return () => ac.abort();
  }, [authLoading, isStoreOwner, sub, cacheKey, reloadKey]);

  const saved = useMemo(() => (view ? savedDesign(view) : null), [view]);
  const live = useMemo(() => (view ? liveDesign(view) : null), [view]);
  const dirty = !!(edit && saved && !sameDesign(edit, saved));
  const hasDraft = !!view?.draft;
  const rows = edit && live
    ? designChanges(edit, live, view?.published?.colours
      || { primary: tenant?.primaryColor, second: tenant?.secondaryColor })
    : [];
  const designOn = tenant?.designEnabled !== false && !switchedOff;
  // Publishing publishes the saved draft, so unsaved edits are saved first.
  const canPublish = designOn && hasDraft && !dirty && rows.length > 0;
  const brand = edit?.colours?.primary ? safeAccent(edit.colours.primary, accent) : accent;
  const mode = dark ? 'dark' : 'light';
  const side = !isMobile && width >= 640;
  const scale = width >= 860 ? 1.4 : 1.1;
  const host = `${sub || tenant?.subdomain || ''}.esy.ge`;

  // Keep unsaved edits across a settings-tab switch; drop them once saved.
  useEffect(() => {
    if (phase !== 'ready' || !edit || !saved) return;
    if (dirty) unsaved.set(cacheKey, { base: designJson(saved), edit });
    else unsaved.delete(cacheKey);
  }, [phase, edit, saved, dirty, cacheKey]);

  // Closing the tab or reloading with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const messageFor = (e, fallbackKey) => {
    if (e?.code && ERR_CODES.includes(e.code)) return t(`editor.err.${e.code}`);
    if (e?.status === 403) return t('editor.err.forbidden');
    if (!e?.status) return t('editor.err.network'); // fetch never got an answer
    return t(`editor.${fallbackKey}`);
  };

  // ---- Editing -------------------------------------------------------------
  const change = (raw) => {
    const next = normalizeDesign(raw);
    if (!edit || sameDesign(next, edit)) return;
    setHistory((h) => [...h.slice(-49), edit]);
    setEdit(next);
    setNotice('');
    setError('');
  };
  const setKey = (key, value) => change({ ...edit, [key]: value });
  const setShow = (key, value) => change({ ...edit, show: { ...edit.show, [key]: value } });
  // A look carries no colour and no banner text, so the draft keeps its own.
  const pickLook = (id) => {
    const look = lookById(id);
    if (!look) return;
    const next = { ...look.design };
    if (edit.colours) next.colours = edit.colours;
    if (edit.banner) next.banner = edit.banner;
    change(next);
  };
  const undo = () => {
    setMenuOpen(false);
    if (!history.length) return;
    setEdit(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setNotice('');
  };
  // Back to the saved draft (or the published design); undo brings it back.
  const cancelChanges = () => {
    setMenuOpen(false);
    change(saved);
  };

  // ---- Server --------------------------------------------------------------
  const save = async () => {
    if (busy || !dirty) return;
    setBusy('save');
    setError('');
    setNotice('');
    try {
      // The edit on screen stays as it is: the server normalises exactly as
      // normalizeDesign does, and an edit made while this was in flight must
      // not be overwritten by the answer.
      const stored = await tenantApi.saveDesignDraft(edit, sub);
      setView((v) => ({ ...v, draft: normalizeDesign(stored) }));
      setNotice('saved');
    } catch (e) {
      setError(messageFor(e, 'saveFailed'));
    } finally {
      setBusy('');
    }
  };

  const openDialog = (name) => {
    setMenuOpen(false);
    setDialogError('');
    setDialog(name);
  };
  const closeDialog = () => { if (!busy) setDialog(''); };

  const publish = async () => {
    if (busy || !canPublish) return;
    setBusy('publish');
    setDialogError('');
    try {
      applyView(await tenantApi.publishDesign(sub));
      unsaved.delete(cacheKey);
      setDialog('');
      setNotice('published');
      // The rest of the back office reads the store's design and colours here.
      Promise.resolve().then(refresh).catch(() => {});
    } catch (e) {
      if (e?.code === 'DESIGN_DISABLED') setSwitchedOff(true);
      // The draft is gone on the server (deleted from elsewhere). What is on
      // screen becomes unsaved edits again rather than being thrown away.
      if (e?.code === 'DESIGN_NO_DRAFT') setView((v) => ({ ...v, draft: null }));
      setDialogError(messageFor(e, 'publishFailed'));
    } finally {
      setBusy('');
    }
  };

  const discard = async () => {
    if (busy) return;
    setBusy('discard');
    setDialogError('');
    try {
      applyView(await tenantApi.discardDesignDraft(sub));
      unsaved.delete(cacheKey);
      setDialog('');
      setNotice('deleted');
    } catch (e) {
      setDialogError(messageFor(e, 'deleteFailed'));
    } finally {
      setBusy('');
    }
  };

  // ---- Screen --------------------------------------------------------------
  if (phase !== 'ready' || !edit) {
    return (
      <div ref={rootRef}>
        {phase === 'denied' && <Note T={T}>{t('editor.ownerOnly')}</Note>}
        {phase === 'failed' && (
          <Card T={T} pad={18}>
            <div style={{ font: `600 13.5px ${T.font}`, color: T.text, marginBottom: 12 }}>{t('editor.loadFailed')}</div>
            <Btn T={T} kind="ghost" size="sm" onClick={() => setReloadKey((n) => n + 1)}>{t('editor.retry')}</Btn>
          </Card>
        )}
        {phase === 'loading' && (
          <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('editor.loading')}</div>
        )}
      </div>
    );
  }

  const count = rows.length;
  let status;
  if (dirty) {
    status = { tone: 'warn', title: count ? t('editor.statusDraft', { count }) : t('editor.statusSame'), sub: t('editor.statusUnsaved') };
  } else if (hasDraft) {
    status = count
      ? { tone: 'warn', title: t('editor.statusDraft', { count }), sub: t('editor.statusDraftSub') }
      : { tone: 'warn', title: t('editor.statusSame'), sub: t('editor.statusSameSub') };
  } else if (!view.published) {
    status = { tone: 'ok', title: t('editor.statusDefault'), sub: designOn ? t('editor.statusDefaultSub') : t('editor.statusOffSub') };
  } else {
    status = { tone: 'ok', title: t('editor.statusLive'), sub: designOn ? t('editor.statusLiveSub') : t('editor.statusOffSub') };
  }
  const message = error || (notice ? t(`editor.${notice}`) : '');
  const previewLabel = dirty || hasDraft
    ? `${t('editor.livePreview')} · ${t('editor.draftTag')}`
    : t('editor.livePreview');
  const catLabel = tenant?.category ? t(`cat_${tenant.category}`, { ns: 'owner', defaultValue: '' }) : '';
  const publishBtn = (style) => (
    <Btn
      T={T} size="sm" style={style} disabled={!canPublish || !!busy}
      title={dirty ? t('editor.saveFirst') : undefined}
      onClick={() => openDialog('publish')}
    >{t('editor.publish')}</Btn>
  );

  return (
    <div ref={rootRef}>
      {!designOn && <Note T={T} style={{ marginBottom: 14 }}>{t('editor.disabled')}</Note>}

      {/* Where the design stands: a draft with N changes, or what is live. */}
      <Card T={T} pad={16} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span aria-hidden="true" style={{
            width: 10, height: 10, borderRadius: '50%', flex: 'none',
            background: status.tone === 'warn' ? T.warn : T.success,
          }} />
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ font: `700 13.5px/1.35 ${T.font}`, color: T.text }}>{status.title}</div>
            <div style={{ marginTop: 2, font: `400 12.5px/1.45 ${T.font}`, color: T.textDim }}>{status.sub}</div>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 'auto' }}>
              {!side && (
                <Btn T={T} kind="ghost" size="sm" onClick={() => openDialog('preview')}>
                  <Icons.eye size={15} />{t('editor.preview')}
                </Btn>
              )}
              <Btn T={T} kind="ghost" size="sm" disabled={!history.length || !!busy} onClick={undo}>
                <UndoIcon />{t('editor.undo')}
              </Btn>
              {hasDraft && (
                <Btn T={T} kind="danger" size="sm" disabled={!!busy} onClick={() => openDialog('discard')}>
                  <TrashIcon />{t('editor.deleteDraft')}
                </Btn>
              )}
              {publishBtn()}
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: width >= 860 ? 28 : 18, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* LookPicker carries its own bottom margin. */}
          <Card T={T} pad="18px 18px 0">
            <LookPicker
              T={T} category={tenant?.category} categoryLabel={catLabel} value={edit.look}
              onChange={pickLook} brand={brand} mode={mode} isMobile={isMobile}
            />
          </Card>

          <Card T={T} pad={18}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Group T={T} label={t('editor.theme')}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {THEMES.map((id) => (
                    <Tile key={id} T={T} on={edit.theme === id} onClick={() => setKey('theme', id)} label={t(`theme.${id}`)}>
                      <span aria-hidden="true" style={{ display: 'block', width: 56, height: 34, flex: 'none', ...THEME_SWATCH[id] }} />
                    </Tile>
                  ))}
                </div>
              </Group>
              <Group T={T} label={t('editor.menu')}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {MENUS.map((id) => (
                    <Tile key={id} T={T} on={edit.menu === id} onClick={() => setKey('menu', id)} label={t(`menu.${id}`)}>
                      <MenuMark T={T} id={id} />
                    </Tile>
                  ))}
                </div>
              </Group>
              <Group T={T} label={t('editor.layout')}>
                <Seg
                  T={T} options={LAYOUTS} value={edit.productLayout}
                  label={(id) => t(`layout.${id}`)} onChange={(id) => setKey('productLayout', id)}
                />
              </Group>
              <Group T={T} label={t('editor.header')}>
                <Seg
                  T={T} options={HEADERS} value={edit.header}
                  label={(id) => t(`editor.headerOpt.${id}`)} onChange={(id) => setKey('header', id)}
                />
              </Group>
            </div>
          </Card>
          <DesignCoverSection T={T} design={edit} sub={sub} />

          <Card T={T} pad={18}>
            <Group T={T} label={t('editor.shows')}>
              <SwitchRow
                T={T} label={t('editor.stories')} on={edit.show.stories}
                onClick={() => setShow('stories', !edit.show.stories)}
              />
              <DesignShowRows T={T} design={edit} onChange={change} />
            </Group>
          </Card>
        </div>

        {side && (
          <div style={{ width: 200 * scale + 10, flex: 'none', position: 'sticky', top: 16 }}>
            <div style={{ ...labelStyle(T), marginBottom: 12 }}>{previewLabel}</div>
            <div style={{ padding: 5 }}>
              <LookThumb design={edit} brand={brand} mode={mode} scale={scale} />
            </div>
            <div style={{ marginTop: 12, font: `400 12px/1.5 ${T.font}`, color: T.textMute }}>
              {t('editor.previewCaption')}{' '}
              <Link to={`/settings/brand${q}`} style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>
                {t('editor.changeColour')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Wide screens: the save bar sticks to the bottom while there is
          something to save, or briefly to say what just happened. */}
      {!isMobile && (dirty || message) && (
        <div style={{
          position: 'sticky', bottom: 16, zIndex: 30, marginTop: 16, ...floating,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 12px 10px 18px', borderRadius: 18,
        }}>
          <span aria-live="polite" style={{
            flex: '1 1 220px', minWidth: 0, font: `500 12.5px/1.45 ${T.font}`,
            color: error ? T.dangerFg : notice ? T.successFg : T.textDim,
          }}>{message || t('editor.saveHint')}</span>
          {dirty && (
            <>
              <Btn T={T} kind="ghost" size="sm" disabled={!!busy} onClick={cancelChanges}>{t('editor.cancel')}</Btn>
              <Btn T={T} size="sm" disabled={!!busy} onClick={save}>
                {busy === 'save' ? t('editor.saving') : t('editor.save')}
              </Btn>
            </>
          )}
        </div>
      )}

      {/* A phone: one floating bar above the dock (the design's Z3 phone),
          its secondary actions behind "…". */}
      {isMobile && (
        <div ref={menuRef} style={{ position: 'sticky', bottom: 90, zIndex: 30, marginTop: 16 }}>
          {menuOpen && (
            <div role="menu" aria-label={t('editor.more')} style={{
              position: 'absolute', left: 0, bottom: 'calc(100% + 8px)', minWidth: 240, maxWidth: '100%',
              padding: 6, borderRadius: 16, background: 'var(--k-fl-bg)', border: 'var(--k-fl-bd)',
              boxShadow: '0 18px 40px -16px rgba(0,0,0,0.4)',
            }}>
              <MenuItem T={T} disabled={!history.length} onClick={undo}><UndoIcon />{t('editor.undo')}</MenuItem>
              {dirty && (
                <MenuItem T={T} onClick={cancelChanges}><Icons.x size={15} />{t('editor.cancelChanges')}</MenuItem>
              )}
              {hasDraft && (
                <MenuItem T={T} danger onClick={() => openDialog('discard')}><TrashIcon />{t('editor.deleteDraft')}</MenuItem>
              )}
            </div>
          )}
          <div style={{ ...floating, padding: 8, borderRadius: 18 }}>
            {message && (
              <div aria-live="polite" style={{
                padding: '2px 6px 8px', font: `500 12.5px/1.4 ${T.font}`,
                color: error ? T.dangerFg : T.successFg,
              }}>{message}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button" aria-label={t('editor.more')} aria-haspopup="menu" aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                style={{
                  width: 40, height: 40, flex: 'none', borderRadius: 12, border: 'none', cursor: 'pointer',
                  display: 'inline-grid', placeItems: 'center',
                  background: menuOpen ? T.text : T.surface2, color: menuOpen ? T.surface : T.text,
                }}
              ><Icons.more size={20} /></button>
              <Btn T={T} kind="quiet" size="sm" style={{ flex: '1 1 0', minWidth: 0 }} onClick={() => openDialog('preview')}>
                <Icons.eye size={15} />{t('editor.preview')}
              </Btn>
              {dirty ? (
                <Btn T={T} size="sm" style={{ flex: '1 1 0', minWidth: 0 }} disabled={!!busy} onClick={save}>
                  {busy === 'save' ? t('editor.saving') : t('editor.saveShort')}
                </Btn>
              ) : publishBtn({ flex: '1 1 0', minWidth: 0 })}
            </div>
          </div>
        </div>
      )}

      {dialog === 'publish' && (
        <PublishDialog
          T={T} isMobile={isMobile} host={host} rows={rows} busy={busy === 'publish'}
          error={dialogError} canPublish={canPublish} onPublish={publish} onClose={closeDialog}
        />
      )}
      {dialog === 'discard' && (
        <DiscardDialog
          T={T} isMobile={isMobile} count={count} busy={busy === 'discard'}
          error={dialogError} onDiscard={discard} onClose={closeDialog}
        />
      )}
      {dialog === 'preview' && (
        <PreviewDialog
          T={T} isMobile={isMobile} design={edit} brand={brand} mode={mode}
          draft={dirty || hasDraft} q={q} onClose={closeDialog}
        />
      )}
    </div>
  );
}
