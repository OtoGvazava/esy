import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { savedApi, getToken } from '../utils/api';

// Wishlist. Signed-in: backed by /api/saved (shows in the cross-store account
// hub, syncs across devices). Guest/offline: localStorage fallback so the
// heart toggles still work. Server is source of truth when authenticated.
const SavedContext = createContext();

const KEY = 'saved';
const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

export const SavedProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  // Fast paint from localStorage, then (if signed in) reconcile with server.
  useEffect(() => {
    let local = [];
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { local = JSON.parse(raw); setItems(local); }
    } catch { /* ignore */ }

    if (!getToken()) return;
    savedApi.list()
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        const byId = new Map(local.map((p) => [String(p.id), p]));
        // Server is authoritative; keep the local thumbnail where we have it.
        setItems(rows.map((r) => ({
          ...(byId.get(String(r.productId)) || {}),
          id: r.productId,
          title: r.title,
          price: r.price,
        })));
      })
      .catch(() => { /* not signed in / offline — keep localStorage */ });
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const isSaved = useCallback((id) => items.some((p) => String(p.id) === String(id)), [items]);

  const toggleSaved = useCallback((product) => {
    let willRemove = false;
    setItems((prev) => {
      const exists = prev.some((p) => String(p.id) === String(product.id));
      willRemove = exists;
      return exists
        ? prev.filter((p) => String(p.id) !== String(product.id))
        : [product, ...prev];
    });
    // Best-effort server sync (no-op for guests; 401 swallowed).
    const t = devTenant();
    if (willRemove) {
      savedApi.remove(product.id, t).catch(() => {});
    } else {
      savedApi.add({ productId: product.id, title: product.title, price: product.price }, t)
        .catch(() => {});
    }
  }, []);

  return (
    <SavedContext.Provider value={{ items, isSaved, toggleSaved, count: items.length }}>
      {children}
    </SavedContext.Provider>
  );
};

export const useSaved = () => {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used within a SavedProvider');
  return ctx;
};
