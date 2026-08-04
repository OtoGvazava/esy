// StatusPill — small uppercase status chip; `kind` picks the color
// (green/live+delivered, neutral/draft, indigo/shipped).
import React from 'react';
import { StatusPill, glowTokens } from 'esy';

const T = glowTokens(false);

export const Live = () => <StatusPill T={T} kind="live">Live</StatusPill>;

export const Draft = () => <StatusPill T={T} kind="draft">Draft</StatusPill>;

export const Delivered = () => <StatusPill T={T} kind="delivered">Delivered</StatusPill>;

export const Shipped = () => <StatusPill T={T} kind="shipped">Shipped</StatusPill>;
