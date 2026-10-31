// Money. The platform runs in Georgian lari and the symbol follows the amount.
//
// Written the Georgian way, as the design settled in its 2026-10-31 review:
//   - a space groups the thousands and a comma marks the tetri, so the back
//     office reads "4 860 ₾" and "97,20 ₾" rather than "₾4,860" and "97.20 ₾"
//   - a whole number of lari drops its ",00", so a 40 ₾ delivery reads as
//     "40 ₾" and not "40,00 ₾"
//   - both spaces are no-break, so an amount never splits across two lines
//
// It returns the em-dash for anything missing or unparseable, so a gap in the
// data renders as a dash rather than "NaN ₾" or a confident zero.

export const FEE_PERCENT = 2;

const NBSP = ' ';

export const money = (v) => {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const [whole, tetri] = Math.abs(n).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${n < 0 ? '−' : ''}${grouped}${tetri === '00' ? '' : `,${tetri}`}${NBSP}₾`;
};

/** The platform's cut of an amount, rounded to the tetri. */
export const feeOf = (v) => Math.round(v * FEE_PERCENT) / 100;
