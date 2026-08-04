// GlowTopNav — page header: back button, centered title, optional right slot.
import React from 'react';
import { GlowTopNav, glowTokens } from 'esy';

const T = glowTokens(false);

export const Default = () => <GlowTopNav T={T} title="Checkout" onBack={() => {}} />;

export const WithAction = () => (
  <GlowTopNav
    T={T}
    title="Saved"
    onBack={() => {}}
    right={<span style={{ font: `600 13px ${T.font}`, color: T.accent }}>Edit</span>}
  />
);
