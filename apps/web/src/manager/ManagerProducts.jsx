// Product management in the back office. Reuses the same editor/delete
// dialogs the storefront owner tools used — the API client appends the
// ?tenant selection, so every call here is scoped to the chosen store.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { productApi, handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTK } from '../core/useTK';
import { money } from '../components/glow/GlowChrome';
import ProductEditorDialog from '../components/owner/ProductEditorDialog';
import DeleteProductDialog from '../components/owner/DeleteProductDialog';
import ImportProductsDialog from '../components/owner/ImportProductsDialog';

export default function ManagerProducts() {
  const { t } = useTranslation('manager');
  const { canManageStore, loading: authLoading } = useAuth();
  const { T } = useTK();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);   // product | 'new' | null
  const [deleting, setDeleting] = useState(null); // product | null
  const [importing, setImporting] = useState(false);

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

  const btn = {
    padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
    background: T.grad, color: '#fff', font: `700 13px ${T.font}`,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ font: `800 22px ${T.font}`, color: T.text, letterSpacing: '-0.02em', margin: 0, flex: 1 }}>
          {t('products.title')}
        </h1>
        <button onClick={() => setImporting(true)} style={ghost}>{t('products.importCta')}</button>
        <button onClick={() => setEditing('new')} style={btn}>{t('products.add')}</button>
      </div>

      {error && <div style={{ font: `500 13px ${T.font}`, color: T.danger }}>{error}</div>}

      {products && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ font: `700 16px ${T.font}`, color: T.text }}>{t('products.empty')}</div>
          <div style={{ font: `400 13px ${T.font}`, color: T.textDim }}>{t('products.emptyBody')}</div>
        </div>
      )}

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
      <ImportProductsDialog
        open={importing}
        onClose={() => setImporting(false)}
        onImported={load}
      />
    </div>
  );
}
