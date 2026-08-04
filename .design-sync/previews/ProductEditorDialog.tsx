// ProductEditorDialog — glow-styled add/edit product form (title/description/
// price/quantity + a DB-backed photo gallery). Product prop present -> edit
// mode (pre-filled fields + existing photo); omitted -> add mode (blank form).
// GlowModal's root (which this wraps) is raw CSS `position:fixed; inset:0` —
// inside the harness's single-story wrapper (transform:translateZ(0), auto/
// collapsed height) that has no definite box to fill and clips short. Fix:
// nest a sized transform:translateZ(0) frame (matching the card's declared
// viewport) as the containing block — same trick as GlowDock/GlowStickyCTA
// (see .design-sync/learnings).
import React from 'react';
import { ProductEditorDialog } from 'esy';

const Frame = ({ children }: any) => (
  <div style={{ position: 'relative', transform: 'translateZ(0)', width: 600, height: 600 }}>
    {children}
  </div>
);

export const AddProduct = () => (
  <Frame>
    <ProductEditorDialog open product={null} onClose={() => {}} onSaved={() => {}} />
  </Frame>
);

export const EditProduct = () => (
  <Frame>
    <ProductEditorDialog
      open
      product={{
        id: 'p1',
        title: 'Ceramic Pour-Over Set',
        description: 'Hand-glazed stoneware, 400ml capacity. Dishwasher safe.',
        price: 68,
        quantity: 14,
        imageList: [
          { id: 'img1', url: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?w=200&h=200&fit=crop' },
        ],
      }}
      onClose={() => {}}
      onSaved={() => {}}
    />
  </Frame>
);
