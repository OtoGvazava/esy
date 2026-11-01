// Product management in the back office. Reuses the same editor/delete
// dialogs the storefront owner tools used — the API client appends the
// ?tenant selection, so every call here is scoped to the chosen store.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { productApi, handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { money } from '../components/glow/GlowChrome';
import ProductEditorDialog from '../components/owner/ProductEditorDialog';
import DeleteProductDialog from '../components/owner/DeleteProductDialog';
import ImportProductsDialog from '../components/owner/ImportProductsDialog';
import { MTop } from './ManagerShell';

export default function ManagerProducts() {
  const { t } = useTranslation('manager');
  const { t: tOwner } = useTranslation('owner');
  const { canManageStore, loading: authLoading } = useAuth();
  const { T } = useTK();
  const { isMobile, isDesktop } = useDevice();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);   // product | 'new' | null
  const [deleting, setDeleting] = useState(null); // product | null
  // The import is a page of its own (P3), so it lives in the URL: a phone's
  // back gesture returns to the list instead of leaving the products screen.
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const importing = params.get('import') === '1';
  const setImporting = (on) => {
    if (on) {
      setParams((p) => { const n = new URLSearchParams(p); n.set('import', '1'); return n; }, { state: { fromList: true } });
    } else if (location.state?.fromList) {
      navigate(-1);
    } else {
      setParams((p) => { const n = new URLSearchParams(p); n.delete('import'); return n; }, { replace: true });
    }
  };

  const load = useCallback(() => {
    productApi.list({ size: 100 })
      .then((r) => setProducts(r.products))
      .catch((e) => setError(handleApiError(e)));
  }, []);

  // Always hydrate the full detail before opening the editor: list rows carry
  // only id/title/price/thumbnail, and initializing the dialog from one would
  // save description:'' — silently erasing the real description.
  const edit = async (p) => {
    try {
      setEditing(await productApi.get(p.id));
    } catch (e) {
      setError(handleApiError(e));
    }
  };

  useEffect(() => {
    if (!authLoading && canManageStore) load();
  }, [authLoading, canManageStore, load]);

  if (!authLoading && !canManageStore) {
    // Wrong store, or no membership: the API would 403 anyway; say it plainly.
    return (
      <div style={{ padding: 48, textAlign: 'center', font: `600 15px ${T.font}`, color: T.textDim }}>
        {t('admin.restricted')}
      </div>
    );
  }

  if (importing) {
    return <ImportProductsDialog onClose={() => setImporting(false)} onImported={load} />;
  }

  // The editor is a page too (P2), drawn in place of the list.
  if (editing !== null) {
    return (
      <ProductEditorDialog
        open
        product={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    );
  }

  // No products yet (P1's empty state): the two ways to start, side by side.
  if (products && products.length === 0) {
    const action = (primary) => ({
      height: 48, padding: '0 22px', borderRadius: 'var(--k-r-btn)', cursor: 'pointer', flex: 'none',
      font: `600 15px ${T.font}`, whiteSpace: 'nowrap', boxSizing: 'border-box',
      border: 0, background: primary ? T.grad : 'transparent', color: primary ? T.onAccent : T.text,
      boxShadow: primary ? 'none' : `inset 0 0 0 1.5px ${T.border}`,
    });
    return (
      <div>
        <MTop T={T} mode={isMobile ? 'mobile' : isDesktop ? 'desktop' : 'tablet'} title={t('products.title')} sub={tOwner('import.empty.sub')} />
        {error && <div style={{ marginBottom: 14, font: `500 13px ${T.font}`, color: T.danger }}>{error}</div>}
        <div style={{
          background: T.surface, border: 'var(--k-card-bd)', boxShadow: 'var(--k-card-sh)',
          borderRadius: 'var(--k-r-card)', padding: 22,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '32px 16px' }}>
            <span style={{ width: 96, height: 96, borderRadius: '50%', background: T.surface2, color: T.accentFg, display: 'grid', placeItems: 'center' }}>
              <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor"
                strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: 'var(--k-ic-w, 1.8)' }}>
                <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" /><path d="m4 8.5 8 4.5 8-4.5M12 13v7" />
              </svg>
            </span>
            <h2 style={{ margin: 0, font: `700 20px/1.22 ${T.font}`, color: T.text, letterSpacing: '-0.015em' }}>
              {tOwner('import.empty.title')}
            </h2>
            <p style={{ margin: 0, maxWidth: 420, font: `400 14px/1.5 ${T.font}`, color: T.textDim }}>
              {tOwner('import.empty.body')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              <button type="button" onClick={() => setEditing('new')} style={action(true)}>{tOwner('import.empty.add')}</button>
              <button type="button" onClick={() => setImporting(true)} style={action(false)}>{tOwner('import.empty.import')}</button>
            </div>
          </div>
        </div>
        <ProductEditorDialog
          open={editing !== null}
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      </div>
    );
  }

  const btn = {
    padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
    background: T.grad, color: T.onAccent, font: `700 13px ${T.font}`,
  };

  // Import sits beside Add as the secondary of the pair: adding one product is
  // the common act, uploading a catalogue the occasional one.
  const ghost = {
    padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${T.border}`, background: 'transparent',
    color: T.textDim, font: `600 13px ${T.font}`,
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* The title is the shell's header bar; the two actions sit at its end. */}
      <MTop
        T={T} title={t('products.title')}
        right={(
          <>
            <button onClick={() => setImporting(true)} style={ghost}>{t('products.importCta')}</button>
            <button onClick={() => setEditing('new')} style={btn}>{t('products.add')}</button>
          </>
        )}
      />

      {error && <div style={{ font: `500 13px ${T.font}`, color: T.danger }}>{error}</div>}

      {products && products.map((p) => (
        <div key={p.id} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
        }}>
          {p.thumbnail ? (
            <img src={p.thumbnail} alt="" width={44} height={44} style={{ borderRadius: 10, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: T.surface2 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 14px ${T.font}`, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.title}
            </div>
            <div style={{ font: `500 12px ${T.font}`, color: (p.stock ?? p.quantity ?? 0) > 0 ? T.textMute : T.danger }}>
              {(p.stock ?? p.quantity ?? 0) > 0
                ? t('products.inStock', { count: p.stock ?? p.quantity })
                : t('products.outOfStock')}
            </div>
          </div>
          <div style={{ font: `700 14px ${T.mono}`, color: T.text }}>{money(p.price)}</div>
          <button onClick={() => edit(p)} style={{
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.text, font: `600 12px ${T.font}`,
          }}>{t('products.edit')}</button>
          <button onClick={() => setDeleting(p)} style={{
            padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.danger, font: `600 12px ${T.font}`,
          }}>{t('products.delete')}</button>
        </div>
      ))}

      <ProductEditorDialog
        open={editing !== null}
        product={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
      <DeleteProductDialog
        open={deleting !== null}
        product={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => { setDeleting(null); load(); }}
      />
    </div>
  );
}
