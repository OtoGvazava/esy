// GlowLoadMore — infinite-scroll continuation hint (spinner + i18n status text).
import React from 'react';
import { GlowLoadMore, glowTokens } from 'esy';

const T = glowTokens(false);

export const Loading = () => <GlowLoadMore T={T} count={0} />;

export const LoadingMore = () => <GlowLoadMore T={T} count={12} />;

export const Done = () => <GlowLoadMore T={T} done />;
