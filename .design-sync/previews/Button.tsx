// Button — MUI-backed button with primary / glass / outlined variants.
import React from 'react';
import { Button } from 'esy';

export const Primary = () => <Button variant="primary">Add to bag</Button>;

export const Outlined = () => <Button variant="outlined">View details</Button>;

export const Glass = () => <Button variant="glass">Follow store</Button>;

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button variant="primary" size="small">Small</Button>
    <Button variant="primary" size="medium">Medium</Button>
    <Button variant="primary" size="large">Large</Button>
  </div>
);

export const Disabled = () => (
  <div style={{ display: 'flex', gap: 12 }}>
    <Button variant="primary" disabled>Disabled</Button>
    <Button variant="primary" loading>Loading</Button>
  </div>
);
