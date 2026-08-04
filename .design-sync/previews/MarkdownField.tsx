// MarkdownField — Glow-styled Markdown editor: formatting toolbar over a
// textarea, with a live-preview toggle. The Write/Preview split is internal
// state (defaults to Write), not reachable via props, so both cells below
// render in Write mode — only the `value` differs.
import React from 'react';
import { MarkdownField, glowTokens } from 'esy';

const T = glowTokens(false);
const Frame = ({ children }: any) => <div style={{ width: 460 }}>{children}</div>;

const description = `## Hand-thrown ceramic mug

Stoneware, glazed in **matte sage**. Holds 350ml — just right for a slow pour-over.

- Dishwasher and microwave safe
- Made in small batches, Tbilisi
- Ships in 2-3 business days

See our [care guide](https://) for details.`;

export const WithContent = () => (
  <Frame>
    <MarkdownField value={description} onChange={() => {}} rows={7} />
  </Frame>
);

export const Empty = () => (
  <Frame>
    <MarkdownField value="" onChange={() => {}} rows={5} />
  </Frame>
);
