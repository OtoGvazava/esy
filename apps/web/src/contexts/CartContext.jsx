/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

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

// Cart reducer for state management
const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const key = lineKey(action.payload);
      const existingItem = state.items.find(item => lineKey(item) === key);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            lineKey(item) === key
              ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
              : item,
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: action.payload.quantity || 1 }],
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
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
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

export const CartProvider = ({ children }) => {
  const [cartState, dispatch] = useReducer(cartReducer, {
    items: [],
  });

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
