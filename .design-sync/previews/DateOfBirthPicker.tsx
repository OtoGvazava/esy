// DateOfBirthPicker — Day / Month / Year dropdowns with localized month names
// (via Intl). `value` only seeds initial internal state (parsed once on
// mount) — it is not a fully controlled prop, so these two cells show two
// independent starting points rather than a controlled before/after.
import React from 'react';
import { DateOfBirthPicker, glowTokens } from 'esy';

const T = glowTokens(false);
const Frame = ({ children }: any) => <div style={{ width: 420 }}>{children}</div>;

export const Empty = () => (
  <Frame>
    <DateOfBirthPicker value="" onChange={() => {}} />
  </Frame>
);

export const Filled = () => (
  <Frame>
    <DateOfBirthPicker value="1994-03-18" onChange={() => {}} />
  </Frame>
);
