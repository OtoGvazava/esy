import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Client-side wishlist (the backend has no saved/wishlist API). Persists to
// localStorage so the heart toggles survive reloads.
const SavedContext = createContext();

const KEY = 'saved';

export const SavedProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [items]);

  const isSaved = useCallback((id) => items.some((p) => String(p.id) === String(id)), [items]);

  const toggleSaved = useCallback((product) => {
    setItems((prev) => {
      const exists = prev.some((p) => String(p.id) === String(product.id));
      return exists ? prev.filter((p) => String(p.id) !== String(product.id)) : [product, ...prev];
    });
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
