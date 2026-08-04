// LangPill — language switcher (globe + EN/KA), compact and expanded.
import React from 'react';
import { LangPill, glowTokens } from 'esy';

const T = glowTokens(false);

export const English = () => <LangPill T={T} lang="en" onClick={() => {}} />;

export const Georgian = () => <LangPill T={T} lang="ka" onClick={() => {}} />;

export const Expanded = () => <LangPill T={T} lang="ka" compact={false} onClick={() => {}} />;
