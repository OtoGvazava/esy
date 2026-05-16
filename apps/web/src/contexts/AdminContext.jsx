import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { productApi, handleApiError } from '../utils/api';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

// The backend list DTO is { id, title, imageUrl, price } only, so we hydrate
// each product with its detail (description, quantity) for the admin table.
const toAdminProduct = (detail) => ({
  id: detail.id,
  title: detail.title,
  description: detail.description,
  price: detail.price,
  stock: detail.quantity ?? detail.stock ?? 0,
  category: '',
  brand: '',
  status: 'active',
  images: detail.images || (detail.thumbnail ? [detail.thumbnail] : []),
});

export const AdminProvider = ({ children }) => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasAdminAccess = isAdmin;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { products: list } = await productApi.list({ page: 0, size: 100 });
      const details = await Promise.all(list.map((p) => productApi.get(p.id)));
      setProducts(details.map(toAdminProduct));
    } catch (err) {
      setError(handleApiError(err, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAdminAccess) {
      loadProducts();
    }
  }, [hasAdminAccess, loadProducts]);

  const addProduct = async (productData) => {
    if (!hasAdminAccess) throw new Error('Access denied');
    setLoading(true);
    setError(null);
    try {
      const created = await productApi.create(productData);
      await loadProducts();
      return { success: true, product: created };
    } catch (err) {
      const message = handleApiError(err, 'Failed to add product');
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const updateProduct = async (productId, productData) => {
    if (!hasAdminAccess) throw new Error('Access denied');
    setLoading(true);
    setError(null);
    try {
      const updated = await productApi.update(productId, productData);
      await loadProducts();
      return { success: true, product: updated };
    } catch (err) {
      const message = handleApiError(err, 'Failed to update product');
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const deleteProduct = async (productId) => {
    if (!hasAdminAccess) throw new Error('Access denied');
    setLoading(true);
    setError(null);
    try {
      await productApi.remove(productId);
      await loadProducts();
      return { success: true };
    } catch (err) {
      const message = handleApiError(err, 'Failed to delete product');
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const getProductById = (productId) => {
    return products.find((product) => product.id === productId);
  };

  const value = {
    products,
    loading,
    error,
    hasAdminAccess,
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    canAddProducts: hasAdminAccess,
    canEditProducts: hasAdminAccess,
    canDeleteProducts: hasAdminAccess,
    canViewProducts: hasAdminAccess,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
