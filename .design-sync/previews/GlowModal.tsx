// GlowModal — shared glow-styled dialog shell used by the owner tools (product
// editor, delete-confirm, store settings). Compose realistic form content +
// footer buttons to show the shell doing its job, not an empty box.
// GlowModal's root is raw CSS `position:fixed; inset:0` (not an MUI portal) —
// inside the harness's single-story wrapper (itself `transform:translateZ(0)`
// with auto/collapsed height) that inset:0 has no definite box to fill and
// clips to ~header height. Fix: nest another sized `transform:translateZ(0)`
// frame (matching the card's declared viewport) so it becomes the nearest
// containing block instead — same trick as GlowDock/GlowStickyCTA (see
// .design-sync/learnings).
import React from 'react';
import { GlowModal, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => (
  <div style={{ position: 'relative', transform: 'translateZ(0)', width: 560, height: 400 }}>
    {children}
  </div>
);

const ghostBtn: React.CSSProperties = {
  height: 50, padding: '0 18px', borderRadius: 14, border: `1px solid ${T.border}`,
  background: 'transparent', color: T.text, font: `600 14px ${T.font}`, cursor: 'pointer',
};
const primaryBtn: React.CSSProperties = {
  height: 50, padding: '0 22px', borderRadius: 14, border: 'none',
  background: T.grad, color: '#fff', font: `700 14px ${T.font}`, cursor: 'pointer',
};
const field: React.CSSProperties = {
  width: '100%', height: 52, padding: '0 16px', borderRadius: 14,
  background: T.surface, border: `1.5px solid ${T.border}`, color: T.text,
  font: `500 14px ${T.font}`, boxSizing: 'border-box',
};
const label: React.CSSProperties = {
  font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em',
  textTransform: 'uppercase', marginBottom: 6,
};

export const Default = () => (
  <Frame>
    <GlowModal
      open
      title="Store settings"
      onClose={() => {}}
      footer={(
        <>
          <button style={ghostBtn}>Cancel</button>
          <button style={primaryBtn}>Save</button>
        </>
      )}
    >
      <div>
        <div style={label}>Display name</div>
        <input style={field} value="Studio Form" readOnly />
      </div>
      <div>
        <div style={label}>Description</div>
        <input style={field} value="Ceramics & home goods, made in Tbilisi" readOnly />
      </div>
    </GlowModal>
  </Frame>
);

export const Busy = () => (
  <Frame>
    <GlowModal
      open
      title="Store settings"
      onClose={() => {}}
      busy
      footer={(
        <>
          <button style={{ ...ghostBtn, cursor: 'default' }} disabled>Cancel</button>
          <button style={{ ...primaryBtn, opacity: 0.7, cursor: 'default' }} disabled>Saving…</button>
        </>
      )}
    >
      <div>
        <div style={label}>Display name</div>
        <input style={field} value="Studio Form" readOnly />
      </div>
    </GlowModal>
  </Frame>
);
