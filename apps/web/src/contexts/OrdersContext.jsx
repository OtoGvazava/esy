import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeSampleOrders } from '../utils/sampleOrders';

const OrdersContext = createContext();

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};

export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load orders from localStorage on mount
  useEffect(() => {
    const loadOrders = () => {
      try {
        const savedOrders = localStorage.getItem('orders');
        if (savedOrders) {
          setOrders(JSON.parse(savedOrders));
        } else {
          // Initialize with sample orders if no orders exist
          const sampleOrders = initializeSampleOrders();
          setOrders(sampleOrders);
        }
      } catch (error) {
        console.error('Error loading orders from localStorage:', error);
        localStorage.removeItem('orders');
        // Initialize with sample orders on error
        const sampleOrders = initializeSampleOrders();
        setOrders(sampleOrders);
      }
    };

    loadOrders();
  }, []);

  // Save orders to localStorage whenever orders change
  useEffect(() => {
    try {
      localStorage.setItem('orders', JSON.stringify(orders));
    } catch (error) {
      console.error('Error saving orders to localStorage:', error);
    }
  }, [orders]);

  const createOrder = async (orderData) => {
    setLoading(true);
    try {
      const newOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...orderData,
        createdAt: new Date().toISOString(),
        status: 'pending',
        trackingNumber: `TRK${Date.now().toString().slice(-8)}`
      };

      setOrders(prevOrders => [newOrder, ...prevOrders]);
      return { success: true, order: newOrder };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = (orderId, status) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const getOrderById = (orderId) => {
    return orders.find(order => order.id === orderId);
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  const getTotalOrders = () => {
    return orders.length;
  };

  const getTotalSpent = () => {
    return orders.reduce((total, order) => total + order.total, 0);
  };

  const value = {
    orders,
    loading,
    createOrder,
    updateOrderStatus,
    getOrderById,
    getOrdersByStatus,
    getTotalOrders,
    getTotalSpent
  };

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
};
