// ProductCard — storefront grid tile (MUI-backed). Sizing comes from
// useProductCardDimensions (screen-size driven via DeviceContext), not props,
// so no width Frame is needed — the card sizes itself to the capture viewport.
import React from 'react';
import { ProductCard, glowTokens } from 'esy';

const T = glowTokens(false);

export const Default = () => (
  <ProductCard
    product={{
      id: 'p1',
      title: 'Ceramic Pour-Over Set',
      price: 68,
      image: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?w=600&q=80',
    }}
    onClick={() => {}}
  />
);

export const NoImagePlaceholder = () => (
  <ProductCard product={{ id: 'p2', title: 'Linen Market Tote', price: 42 }} onClick={() => {}} />
);

export const LongTitle = () => (
  <ProductCard
    product={{
      id: 'p3',
      title: 'Hand-Thrown Stoneware Serving Bowl, Large',
      price: 96,
      image: 'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=600&q=80',
    }}
    onClick={() => {}}
  />
);
