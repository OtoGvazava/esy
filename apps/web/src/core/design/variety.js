// How many different storefronts the design object can draw, for the counter
// on quick setup's creating screen (store plan, Phase 5). Computed from
// schema.json, never written down, so it grows with every option the schema
// gains: each option's choices multiplied together, times on and off for each
// show switch. Colours are left out — every colour would make it 16.7 million
// times larger and say nothing.
import schema from './schema.json';

export const WAYS_TO_LOOK = Object.values(schema.options)
  .reduce((n, choices) => n * choices.length, 1) * 2 ** schema.show.length;

// Thousands grouped with no-break spaces, the way core/money writes amounts.
export const groupDigits = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
