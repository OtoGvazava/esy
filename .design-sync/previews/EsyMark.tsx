// EsyMark — the esy wordmark: gradient "e" tile + lowercase wordmark + ".ge" suffix.
import React from 'react';
import { EsyMark, glowTokens } from 'esy';

const T = glowTokens(false);
const Td = glowTokens(true);

export const Default = () => <EsyMark T={T} />;

export const Dark = () => (
  <div style={{ background: Td.bg, padding: '18px 22px', borderRadius: 14, display: 'inline-flex' }}>
    <EsyMark T={Td} />
  </div>
);

export const LargeClickable = () => <EsyMark T={T} size={42} suffix="" onClick={() => {}} />;
