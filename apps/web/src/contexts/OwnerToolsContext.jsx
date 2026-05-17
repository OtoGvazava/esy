/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { productApi, tenantApi } from '../utils/api';
import ProductEditorDialog from '../components/owner/ProductEditorDialog';
import DeleteProductDialog from '../components/owner/DeleteProductDialog';
import ViewModeToggle from '../components/owner/ViewModeToggle';

const VIEW_MODE_KEY = 'esy.viewMode';

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

const readViewMode = () => {
  try { return localStorage.getItem(VIEW_MODE_KEY) === 'client' ? 'client' : 'admin'; }
  catch { return 'admin'; }
};

const OwnerToolsContext = createContext({
  canManage: false,
  isOwner: false,
  viewMode: 'admin',
  toggleViewMode: () => {},
  version: 0,
  newOrderCount: 0,
  refreshNewOrders: () => {},
  addProduct: () => {},
  editProduct: () => {},
  deleteProduct: () => {},
});

export const useOwnerTools = () => useContext(OwnerToolsContext);

// Single host for every owner-management surface on the storefront (add/edit/
// delete product, plus the admin↔client view switch). Storefront-only —
// mounted in AppShell, never the platform shell. `version` bumps on any
// successful mutation so pages can re-fetch.
//
// `isOwner` is the raw "may manage this store" capability; `canManage` is that
// capability *gated by view mode* — in client view an owner previews the store
// exactly as a shopper sees it, so every owner control hides. The floating
// ViewModeToggle stays visible in both modes so the owner can always return.
export const OwnerToolsProvider = ({ children }) => {
  const { canManageStore } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorProduct, setEditorProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState(readViewMode);
  const [version, setVersion] = useState(0);
  const [newOrderCount, setNewOrderCount] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* ignore */ }
  }, [viewMode]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Best-effort count of new (PLACED) orders for the Orders pill badge. Owners
  // only; refetched on every mutation bump (and on mount / ownership change).
  const refreshNewOrders = useCallback(() => {
    if (!canManageStore) { setNewOrderCount(0); return; }
    tenantApi.newOrderCount(devTenant())
      .then((d) => setNewOrderCount(Number(d?.count) || 0))
      .catch(() => { /* badge is non-critical */ });
  }, [canManageStore]);

  useEffect(() => { refreshNewOrders(); }, [refreshNewOrders, version]);

  const addProduct = useCallback(() => {
    setEditorProduct(null);
    setEditorOpen(true);
  }, []);

  // Accepts a full product or a list-shaped one / id. Always hydrates the
  // full detail so the editor never silently blanks description/quantity.
  const editProduct = useCallback(async (productOrId) => {
    const id = typeof productOrId === 'object' ? productOrId?.id : productOrId;
    if (id == null) return;
    let full = typeof productOrId === 'object' ? productOrId : null;
    try {
      full = await productApi.get(id);
    } catch {
      /* fall back to whatever we were handed */
    }
    setEditorProduct(full);
    setEditorOpen(true);
  }, []);

  const deleteProduct = useCallback((product) => setDeleteTarget(product), []);
  const toggleViewMode = useCallback(
    () => setViewMode((m) => (m === 'admin' ? 'client' : 'admin')),
    [],
  );

  const value = useMemo(() => ({
    isOwner: canManageStore,
    canManage: canManageStore && viewMode === 'admin',
    viewMode,
    toggleViewMode,
    version,
    newOrderCount,
    refreshNewOrders,
    addProduct,
    editProduct,
    deleteProduct,
  }), [canManageStore, viewMode, toggleViewMode, version, newOrderCount, refreshNewOrders, addProduct, editProduct, deleteProduct]);

  return (
    <OwnerToolsContext.Provider value={value}>
      {children}
      {canManageStore && (
        <>
          {viewMode === 'admin' && (
            <>
              <ProductEditorDialog
                open={editorOpen}
                product={editorProduct}
                onClose={() => setEditorOpen(false)}
                onSaved={bump}
              />
              <DeleteProductDialog
                open={Boolean(deleteTarget)}
                product={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onDeleted={bump}
              />
            </>
          )}
          <ViewModeToggle />
        </>
      )}
    </OwnerToolsContext.Provider>
  );
};
