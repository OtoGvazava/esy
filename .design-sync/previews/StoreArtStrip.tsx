// StoreArtStrip — subtle gradient art banner built from a store's brand
// colors; used as filler art on store cards.
import React from 'react';
import { StoreArtStrip } from 'esy';

const studioForm = { name: 'Studio Form', primaryColor: '#6366f1', secondaryColor: '#a855f7' };
const keramika = { name: 'Keramika Tbilisi', primaryColor: '#d97706', secondaryColor: '#f59e0b' };
const noorRugs = { name: 'Noor Rugs', primaryColor: '#0891b2' };

const Frame = ({ children }: any) => <div style={{ width: 360 }}>{children}</div>;

export const Default = () => (
  <Frame><StoreArtStrip store={studioForm} /></Frame>
);

export const Tall = () => (
  <Frame><StoreArtStrip store={keramika} height={160} /></Frame>
);

export const Short = () => (
  <Frame><StoreArtStrip store={noorRugs} height={56} /></Frame>
);
