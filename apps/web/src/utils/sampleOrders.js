// Sample orders for demonstration purposes
export const createSampleOrders = () => {
  const sampleOrders = [
    {
      id: `order_${Date.now() - 86400000}_sample1`,
      items: [
        {
          id: '1',
          name: 'iPhone 15 Pro',
          price: 999.99,
          quantity: 1,
          image: 'https://via.placeholder.com/60x60?text=iPhone',
        },
        {
          id: '2',
          name: 'AirPods Pro',
          price: 249.99,
          quantity: 1,
          image: 'https://via.placeholder.com/60x60?text=AirPods',
        },
      ],
      total: 1249.98,
      status: 'delivered',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      trackingNumber: `TRK${(Date.now() - 86400000).toString().slice(-8)}`,
      shippingAddress: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'Tbilisi',
        postalCode: '0100',
        country: 'Georgia',
      },
      paymentMethod: 'Credit Card',
    },
    {
      id: `order_${Date.now() - 172800000}_sample2`,
      items: [
        {
          id: '3',
          name: 'MacBook Pro 16"',
          price: 2499.99,
          quantity: 1,
          image: 'https://via.placeholder.com/60x60?text=MacBook',
        },
      ],
      total: 2499.99,
      status: 'shipped',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      trackingNumber: `TRK${(Date.now() - 172800000).toString().slice(-8)}`,
      shippingAddress: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'Tbilisi',
        postalCode: '0100',
        country: 'Georgia',
      },
      paymentMethod: 'Credit Card',
    },
    {
      id: `order_${Date.now() - 259200000}_sample3`,
      items: [
        {
          id: '4',
          name: 'iPad Air',
          price: 599.99,
          quantity: 1,
          image: 'https://via.placeholder.com/60x60?text=iPad',
        },
        {
          id: '5',
          name: 'Apple Pencil',
          price: 129.99,
          quantity: 1,
          image: 'https://via.placeholder.com/60x60?text=Pencil',
        },
      ],
      total: 729.98,
      status: 'processing',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      trackingNumber: `TRK${(Date.now() - 259200000).toString().slice(-8)}`,
      shippingAddress: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'Tbilisi',
        postalCode: '0100',
        country: 'Georgia',
      },
      paymentMethod: 'Credit Card',
    },
    {
      id: `order_${Date.now() - 345600000}_sample4`,
      items: [
        {
          id: '6',
          name: 'Apple Watch Series 9',
          price: 399.99,
          quantity: 1,
          image: 'https://via.placeholder.com/60x60?text=Watch',
        },
      ],
      total: 399.99,
      status: 'pending',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
      trackingNumber: `TRK${(Date.now() - 345600000).toString().slice(-8)}`,
      shippingAddress: {
        name: 'John Doe',
        street: '123 Main St',
        city: 'Tbilisi',
        postalCode: '0100',
        country: 'Georgia',
      },
      paymentMethod: 'Credit Card',
    },
  ];

  return sampleOrders;
};

// Function to initialize sample orders in localStorage
export const initializeSampleOrders = () => {
  try {
    const existingOrders = localStorage.getItem('orders');
    if (!existingOrders || JSON.parse(existingOrders).length === 0) {
      const sampleOrders = createSampleOrders();
      localStorage.setItem('orders', JSON.stringify(sampleOrders));
      return sampleOrders;
    }
    return JSON.parse(existingOrders);
  } catch (error) {
    console.error('Error initializing sample orders:', error);
    return [];
  }
};
