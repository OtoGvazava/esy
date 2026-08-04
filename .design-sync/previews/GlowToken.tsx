// GlowToken — removable filter/token pill. T tokens come from glowTokens().
import React from 'react';
import { GlowToken, glowTokens } from 'esy';

const T = glowTokens(false);

export const Default = () => <GlowToken T={T}>Ceramics</GlowToken>;

export const Accent = () => (
  <GlowToken T={T} accent>Under ₾50</GlowToken>
);

export const Outline = () => (
  <GlowToken T={T} outline removable={false}>In stock</GlowToken>
);

export const FilterRow = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    <GlowToken T={T} accent>Handmade</GlowToken>
    <GlowToken T={T}>Tbilisi</GlowToken>
    <GlowToken T={T} outline removable={false}>New in</GlowToken>
  </div>
);
