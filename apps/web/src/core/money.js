// Money, ported verbatim from esy-core.jsx. The platform runs in Georgian lari
// and the symbol always follows the amount.
//
// Two deliberate properties, both from the design rather than invented here:
//   - a whole number of lari drops its ".00", so a 40 ₾ delivery reads as
//     "40 ₾" and not "40.00 ₾"
//   - there is no thousands grouping; "41800 ₾" is what the design shows
//
// It returns the em-dash for anything missing or unparseable, so a gap in the
// data renders as a dash rather than "NaN ₾" or a confident zero.

export const FEE_PERCENT = 2;

export const money = (v) => (v == null || Number.isNaN(Number(v))
  ? '—'
  : `${Number(v).toFixed(2).replace(/\.00$/, '')} ₾`);

/** The platform's cut of an amount, rounded to the tetri. */
export const feeOf = (v) => Math.round(v * FEE_PERCENT) / 100;
