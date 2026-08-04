// PoweredBy — the "powered by esy" platform mark (i18n label + esy wordmark).
import React from 'react';
import { PoweredBy, glowTokens } from 'esy';

const T = glowTokens(false);

export const Center = () => <PoweredBy T={T} />;

export const Left = () => <PoweredBy T={T} align="left" />;
