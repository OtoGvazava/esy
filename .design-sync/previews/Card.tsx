// Card — MUI-backed surface with the Glow cardStyles (rounded, soft shadow).
import React from 'react';
import { Card } from 'esy';

const Frame = ({ children }: any) => <div style={{ width: 300 }}>{children}</div>;

export const Default = () => (
  <Frame>
    <Card>
      <div style={{ padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Order #1042</div>
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>3 items · ₾126 · Shipped</div>
      </div>
    </Card>
  </Frame>
);

export const NoHover = () => (
  <Frame>
    <Card hover={false}>
      <div style={{ padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Static surface</div>
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>No hover lift (hover=false).</div>
      </div>
    </Card>
  </Frame>
);
