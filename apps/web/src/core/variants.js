// Product variants (D11), ported from esy-core.jsx.
//
// A product may carry one or two option axes — typically size, or size and
// colour. Their combinations are the rows that actually hold stock, so the
// product's own quantity stops being editable once variants exist.
//
// The design's helpers read a mock map keyed by product id. These take the
// variant object itself, because in the app it arrives from the API — the
// algorithm is unchanged, only where the data comes from.
//
// Shape: { axes: [{ id, ka, en, values: [] }], rows: [{ key: [], stock, price? }] }

/** Total stock across every combination — what replaces Product.quantity. */
export function variantStock(v) {
  if (!v || !Array.isArray(v.rows)) return null;
  return v.rows.reduce((s, r) => s + (Number(r.stock) || 0), 0);
}

/** The row matching an exact combination, or null. */
export function rowFor(v, key) {
  if (!v || !Array.isArray(v.rows) || !Array.isArray(key)) return null;
  return v.rows.find((r) => r.key.length === key.length
    && r.key.every((k, i) => k === key[i])) || null;
}

/**
 * The price of a combination: the row's own price when it differs, otherwise
 * the product's base. A size run at one price stays one number to edit; a
 * larger size that costs more overrides it.
 */
export function priceFor(v, key, basePrice) {
  const row = rowFor(v, key);
  return row && row.price != null ? row.price : basePrice;
}

/**
 * Which values on an axis are still buyable GIVEN the other axis's current
 * selection. With 38 chosen, a colour with no stock in 38 comes back false
 * even though it exists in 40.
 *
 * The caller strikes those through rather than hiding them, so a shopper can
 * see their size exists and may return — hiding it would read as "we never
 * made this", which is a different and wrong message.
 */
export function axisAvailability(v, axisIndex, pickedKey) {
  if (!v || !Array.isArray(v.axes) || !v.axes[axisIndex]) return {};
  const out = {};
  v.axes[axisIndex].values.forEach((val) => {
    out[val] = v.rows.some((r) => r.key[axisIndex] === val
      && Number(r.stock) > 0
      && (!pickedKey || r.key.every((k, i) => i === axisIndex || k === pickedKey[i])));
  });
  return out;
}

/** Axis label in the shopper's language. */
export const axisLabel = (axis, lang) => (lang === 'ka' ? axis.ka : axis.en) || axis.id;
