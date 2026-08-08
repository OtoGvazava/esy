/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orderApi } from '../utils/api';
import { useAuth } from './AuthContext';

const OrdersContext = createContext();

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

// Backend order (OrderController.toMap): { id, orderNumber, status, total,
// items:<count>, placed:<ISO>, store }. Normalize to the shape the storefront
// screens read (createdAt / count / underscored status key) without dropping
// the raw fields.
const normalize = (o) => {
  const status = String(o?.status ?? 'placed').toLowerCase();
  return {
    ...o,
    id: o?.id,
    orderNumber: o?.orderNumber,
    total: typeof o?.total === 'number' ? o.total : Number(o?.total) || 0,
    count: Number.isFinite(o?.items) ? o.items : 0,
    status,
    statusKey: status.replace(/ /g, '_'),
    createdAt: o?.placed ?? o?.createdAt ?? null,
    store: o?.store ?? null,
  };
};

export const OrdersProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // The database is authoritative — orders live behind /api/orders (cookie
  // session). Guests have none. Re-pull when auth resolves / changes.
  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setOrders([]); return; }
    setLoading(true);
    try {
      const rows = await orderApi.list();
      setOrders(Array.isArray(rows) ? rows.map(normalize) : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  // Place a real order against the current store, then reflect it locally.
  // Returns { success, order } so checkout can route to the receipt.
  const createOrder = async (orderData) => {
    setLoading(true);
    try {
      const items = (orderData?.items || []).map((i) => ({
        productId: i.id ?? i.productId,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
      }));
      const delivery = {};
      if (orderData?.addressId != null) delivery.addressId = orderData.addressId;
      if (orderData?.address) delivery.address = orderData.address;
      const created = await orderApi.create(items, devTenant(), delivery);
      const order = created ? normalize(created) : null;
      if (order) {
        setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      }
      return { success: true, order };
    } catch (error) {
      return { success: false, error: error?.message };
    } finally {
      setLoading(false);
    }
  };

  const getOrderById = (id) => orders.find((o) => String(o.id) === String(id));
  const getOrdersByStatus = (status) => orders.filter((o) => o.status === status);
  const getTotalOrders = () => orders.length;
  const getTotalSpent = () => orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const value = {
    orders,
    loading,
    refresh,
    createOrder,
    getOrderById,
    getOrdersByStatus,
    getTotalOrders,
    getTotalSpent,
  };

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
};
