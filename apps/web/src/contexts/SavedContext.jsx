/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { savedApi } from '../utils/api';
import { useAuth } from './AuthContext';

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
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);

  // Fast paint from localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Signed in (cookie session restored): server is authoritative and syncs
  // across devices/stores. Re-runs when auth resolves on mount.
  useEffect(() => {
    if (!isAuthenticated) return;
    savedApi.list()
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        let local = [];
        try { local = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { /* ignore */ }
        const byId = new Map(local.map((p) => [String(p.id), p]));
        // Keep the local thumbnail where we have it.
        setItems(rows.map((r) => ({
          ...(byId.get(String(r.productId)) || {}),
          id: r.productId,
          title: r.title,
          price: r.price,
        })));
      })
      .catch(() => { /* offline — keep localStorage */ });
  }, [isAuthenticated]);

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
