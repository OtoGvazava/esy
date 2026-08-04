// GoogleStyleSearch — the glass "island" search bar used inside Header, with
// an optional trailing actionButtons slot. Not position:fixed, but grows to
// fill its container, so it's wrapped in a sized Frame.
import React from 'react';
import { GoogleStyleSearch, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => (
  <div style={{ width: 640, padding: 16, background: T.bg }}>{children}</div>
);

export const Default = () => (
  <Frame>
    <GoogleStyleSearch searchQuery="" placeholder="Search skincare, makeup, tools…" />
  </Frame>
);

export const Typing = () => (
  <Frame>
    <GoogleStyleSearch
      searchQuery="vitamin c serum"
      onSearchChange={() => {}}
      placeholder="Search skincare, makeup, tools…"
      actionButtons={
        <span style={{ font: `600 13px ${T.font}`, color: T.accent, padding: '0 8px' }}>
          Log in
        </span>
      }
    />
  </Frame>
);

export const Disabled = () => (
  <Frame>
    <GoogleStyleSearch
      searchQuery=""
      disabled
      placeholder="Search skincare, makeup, tools…"
    />
  </Frame>
);
