// Placeholder — striped image fallback with a monospace label. Fills its parent,
// so each cell frames it at a realistic thumbnail size.
import React from 'react';
import { Placeholder } from 'esy';

const Box = ({ children }: any) => (
  <div style={{ width: 160, height: 160, borderRadius: 12, overflow: 'hidden' }}>{children}</div>
);

export const Light = () => (
  <Box><Placeholder label="Ceramic mug" hue={250} /></Box>
);

export const Dark = () => (
  <Box><Placeholder label="Ceramic mug" hue={250} dark /></Box>
);

export const WarmHue = () => (
  <Box><Placeholder label="Linen apron" hue={20} /></Box>
);
