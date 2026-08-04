// CartDrawer — cart flyout. Reads live items from CartContext; the preview
// provider's cart starts empty and CartDrawer has no items/props override, so
// the empty state is what genuinely renders here — a legitimate card.
import React from 'react';
import { CartDrawer } from 'esy';

export const EmptyCart = () => <CartDrawer open onClose={() => {}} />;
