/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useReducer } from 'react';
import { STORAGE_KEYS } from '../constants';

const CartContext = createContext();

// Exported so a store preview (components/design/StorePreview) can give the
// store's menus an empty bag that nothing writes to; the app uses useCart().
export { CartContext };

/**
 * A cart line is identified by the product AND the chosen variant (D11), not
 * by the product alone. Two sizes of one shirt are two lines: merging them
 * would show quantity 2 of "a shirt" and send a single variant to checkout,
 * so one of the sizes would silently become the other.
 *
 * Products without variants carry no variantId and key on the product alone,
 * exactly as before.
 */
export const lineKey = (item) => `${item.id}::${item.variantId ?? ''}`;

/**
 * A line may carry `stock`, what the shop had when it was added. The bag never
 * holds more than that, so a sold-out or short item cannot be paid for by card
 * and then oversold (review M13). A line without it (an old bag, a re-added
 * order) is not capped here; the server has the last word either way.
 */
const capAt = (quantity, stock) => {
  const n = Number(stock);
  return stock == null || stock === '' || !Number.isFinite(n) ? quantity : Math.min(quantity, Math.max(0, n));
};

/** Whether a line already holds all the stock the shop had. */
export const atStock = (item) => capAt(item.quantity + 1, item.stock) <= item.quantity;

// Cart reducer for state management
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const key = lineKey(action.payload);
      const existingItem = state.items.find(item => lineKey(item) === key);
      if (existingItem) {
        const stock = action.payload.stock ?? existingItem.stock;
        return {
          ...state,
          items: state.items.map(item =>
            lineKey(item) === key
              // Adding never takes away what is already in the bag.
              ? { ...item, stock, quantity: Math.max(item.quantity, capAt(item.quantity + (action.payload.quantity || 1), stock)) }
              : item,
          ),
        };
      }
      const quantity = capAt(action.payload.quantity || 1, action.payload.stock);
      if (quantity <= 0) return state;
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity }],
      };
    }

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter(item => lineKey(item) !== action.payload),
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          lineKey(item) === action.payload.key
            // Raising stops at the line's stock; lowering is always allowed.
            ? { ...item, quantity: Math.max(0, action.payload.quantity > item.quantity ? Math.max(item.quantity, capAt(action.payload.quantity, item.stock)) : action.payload.quantity) }
            : item,
        ).filter(item => item.quantity > 0),
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
      };

    default:
      return state;
  }
};

// The bag is kept in the browser, one per store. Signing in is a full-page
// trip to Google and back, which used to tear the bag down: a guest sent from
// checkout to sign in came back to an empty one (review H2). Each store is its
// own origin in production; in dev every store shares one host and is told
// apart by ?tenant=, so that is part of the key.
const storageKey = () => {
  if (typeof window === 'undefined') return null;
  const tenant = new URLSearchParams(window.location.search).get('tenant');
  return `${STORAGE_KEYS.CART}:${window.location.host}${tenant ? `:${tenant}` : ''}`;
};

const loadBag = () => {
  try {
    const key = storageKey();
    const parsed = key ? JSON.parse(localStorage.getItem(key) || 'null') : null;
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    // Only lines that can still be shown and priced; anything else is dropped.
    return {
      items: items.filter((i) => i && i.id != null && Number.isFinite(Number(i.price))
        && Number.isInteger(i.quantity) && i.quantity > 0),
    };
  } catch {
    return { items: [] };
  }
};

export const CartProvider = ({ children }) => {
  const [cartState, dispatch] = useReducer(cartReducer, undefined, loadBag);

  useEffect(() => {
    try {
      const key = storageKey();
      if (!key) return;
      if (cartState.items.length) localStorage.setItem(key, JSON.stringify({ items: cartState.items }));
      else localStorage.removeItem(key);
    } catch { /* storage blocked or full: the bag still works for this visit */ }
  }, [cartState.items]);

  const addToCart = (product) => {
    dispatch({ type: 'ADD_TO_CART', payload: product });
  };

  // Both take a line key (see lineKey) rather than a product id, because with
  // variants a product id no longer names one row of the cart.
  const removeFromCart = (key) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: key });
  };

  const updateQuantity = (key, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { key, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getTotalItems = () => {
    return cartState.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartState.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const value = {
    items: cartState.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
