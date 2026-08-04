// GlowProductCard — the storefront product tile. No image → striped Placeholder
// (the design's intended fallback). Wrapped to a realistic card width.
import React from 'react';
import { GlowProductCard, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => (
  <div style={{ width: 240 }}>{children}</div>
);

export const Default = () => (
  <Frame>
    <GlowProductCard
      T={T}
      hue={250}
      p={{ id: 'p1', title: 'Ceramic Pour-Over Set', blurb: 'Hand-glazed stoneware · 400ml', price: 68, tag: 'new' }}
    />
  </Frame>
);

export const OnSale = () => (
  <Frame>
    <GlowProductCard
      T={T}
      hue={20}
      p={{ id: 'p2', title: 'Linen Apron', blurb: 'Stonewashed · one size', price: 42, tag: 'sale' }}
    />
  </Frame>
);

export const Compact = () => (
  <Frame>
    <GlowProductCard
      T={T}
      hue={150}
      compact
      p={{ id: 'p3', title: 'Beeswax Candle', price: 18, tag: 'best' }}
    />
  </Frame>
);
