/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { savedApi } from '../utils/api';
import { useAuth } from './AuthContext';

// Wishlist. Signed-in: backed by /api/saved (the storefront list is scoped to
// THIS store server-side; the cross-store account hub has its own endpoint).
// Guest/offline: localStorage fallback so the heart toggles still work.
const SavedContext = createContext();

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

// Cache key is per-store (subdomain host, or ?tenant= on localhost) so the
// fast-paint never shows another store's saves — mirrors the backend's
// Host-based tenant scoping. Stable per app load (each storefront is its own
// host / page load in the real multi-tenant setup).
const storeKey = () => {
  try { return devTenant() || window.location.host; }
  catch { return 'default'; }
};
const KEY = `saved:${storeKey()}`;

export const SavedProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);

  // Fast paint from this store's localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Signed in (cookie session restored): server is authoritative for this
  // store. Re-runs when auth resolves on mount.
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
    const id = product.id;
    let willRemove = false;
    setItems((prev) => {
      const exists = prev.some((p) => String(p.id) === String(id));
      willRemove = exists;
      return exists
        ? prev.filter((p) => String(p.id) !== String(id))
        : [product, ...prev];
    });

    const t = devTenant();
    const op = willRemove
      ? savedApi.remove(id, t)
      : savedApi.add({ productId: id, title: product.title, price: product.price }, t);

    op.catch((err) => {
      // Guests hit 401 (localStorage-only mode) — expected, keep the optimistic
      // change. Authenticated + a real failure → revert so the UI matches the
      // server (prevents removed items reappearing / added items vanishing on
      // reload).
      if (!isAuthenticated || err?.status === 401) return;
      setItems((prev) => {
        const exists = prev.some((p) => String(p.id) === String(id));
        if (willRemove) return exists ? prev : [product, ...prev]; // undo remove
        return exists ? prev.filter((p) => String(p.id) !== String(id)) : prev; // undo add
      });
    });
  }, [isAuthenticated]);

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
