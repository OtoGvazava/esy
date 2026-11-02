/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../utils/api';
import { myOrdersQuery } from '../core/query/queries';
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
  const qc = useQueryClient();
  const [placing, setPlacing] = useState(false);

  // The database is authoritative — orders live behind /api/orders (cookie
  // session). Guests have none. One cached read, so the orders screen opens on
  // the list it showed last time while a refetch brings it up to date.
  const signedIn = isAuthenticated && !authLoading;
  const query = useQuery({ ...myOrdersQuery(), enabled: signedIn });
  const orders = useMemo(
    () => (signedIn && query.data ? query.data.map(normalize) : []),
    [signedIn, query.data],
  );
  const loading = placing || (signedIn && query.isFetching);
  // Not known yet: the session is still being restored, or the first read is
  // out. A screen draws its skeleton then, never "no orders yet".
  const pending = authLoading || (signedIn && query.isPending);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await qc.fetchQuery({ ...myOrdersQuery(), staleTime: 0 });
    } catch { /* the list keeps what it had */ }
  }, [isAuthenticated, qc]);

  // Place a real order against the current store, then reflect it locally.
  // Returns { success, order } so checkout can route to the receipt.
  const createOrder = async (orderData) => {
    setPlacing(true);
    try {
      const items = (orderData?.items || []).map((i) => ({
        productId: i.id ?? i.productId,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        // The chosen combination (D11): the server prices that row and takes its stock.
        variantId: i.variantId ?? undefined,
      }));
      const delivery = {};
      if (orderData?.addressId != null) delivery.addressId = orderData.addressId;
      if (orderData?.address) delivery.address = orderData.address;
      // The route and the express upgrade (D9). Without them the server reads
      // the order as collection in person: no delivery fee, and an address it
      // is told to ignore.
      if (orderData?.deliveryRoute) delivery.deliveryRoute = orderData.deliveryRoute;
      if (orderData?.deliveryExpress != null) delivery.deliveryExpress = !!orderData.deliveryExpress;
      const created = await orderApi.create(items, devTenant(), delivery);
      const order = created ? normalize(created) : null;
      if (order) {
        qc.setQueryData(myOrdersQuery().queryKey, (prev) => [created, ...(prev || []).filter((o) => o.id !== created.id)]);
      }
      return { success: true, order };
    } catch (error) {
      return { success: false, error: error?.message };
    } finally {
      setPlacing(false);
    }
  };

  const getOrderById = (id) => orders.find((o) => String(o.id) === String(id));
  const getOrdersByStatus = (status) => orders.filter((o) => o.status === status);
  const getTotalOrders = () => orders.length;
  const getTotalSpent = () => orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const value = {
    orders,
    loading,
    pending,
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
