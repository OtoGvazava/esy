// What quick setup asks for and how it maps onto the store: the seven groups
// a seller picks from, the store category each one files under, the six quick
// colours, and the link a name suggests.

// The groups the looks are made for (core/design/looks.js), in the board's order.
export const GROUPS = ['fashion', 'food', 'beauty', 'tech', 'home', 'kids', 'other'];

// The store's directory category for each group. The server keeps its own
// list (TenantService.CATEGORIES: fashion, electronics, home, food, art,
// sport, wear); beauty, kids and other have no category there, so those
// stores open uncategorised rather than filed under one they did not choose.
export const STORE_CATEGORY = { fashion: 'fashion', food: 'food', tech: 'electronics', home: 'home' };

// The six quick colours (the design's O7), after the logo's own.
export const QUICK = [
  { hex: '#2f6b4f', key: 'green' },
  { hex: '#2563eb', key: 'blue' },
  { hex: '#db2777', key: 'pink' },
  { hex: '#d9480f', key: 'orange' },
  { hex: '#8b5cf6', key: 'purple' },
  { hex: '#111113', key: 'black' },
];

/** A plain name for any colour (open.colours.<key>): the quick colours' own, else by hue. */
export function colourName(hex) {
  const quick = QUICK.find((c) => c.hex === String(hex).toLowerCase());
  if (quick) return quick.key;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(String(hex).slice(i, i + 2), 16) / 255);
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  const l = (hi + lo) / 2;
  const s = hi === lo ? 0 : (hi - lo) / (1 - Math.abs(2 * l - 1));
  if (l < 0.12) return 'black';
  if (l > 0.93) return 'white';
  if (s < 0.14) return 'grey';
  let h = 0;
  if (hi === r) h = ((g - b) / (hi - lo)) % 6;
  else if (hi === g) h = (b - r) / (hi - lo) + 2;
  else h = (r - g) / (hi - lo) + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return 'red';
  if (h < 40) return l < 0.35 ? 'brown' : 'orange';
  if (h < 66) return 'yellow';
  if (h < 165) return 'green';
  if (h < 195) return 'teal';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

/** Theme · menu · layout, the line under a look's name. */
export const lookLine = (td, d) => `${td(`theme.${d.theme}`)} · ${td(`menu.${d.menu}`)} · ${td(`layout.${d.productLayout}`)}`;

// Georgian letters in Latin (the national romanisation), so a store named in
// Georgian still suggests a link.
const KA = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k', ლ: 'l', მ: 'm', ნ: 'n',
  ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u', ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch',
  ც: 'ts', ძ: 'dz', წ: 'ts', ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

/**
 * What the link field keeps of what is typed into it: a–z, 0–9 and single
 * hyphens, at most 30. A hyphen at the end stays, because the next letter is
 * on its way; the availability check calls it invalid until then.
 */
export function linkChars(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[ა-ჰ]/g, (c) => KA[c] ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .slice(0, 30);
}

/** The link a store name suggests, in the form the server accepts (3–30 of a–z, 0–9 and inner hyphens). */
export const slugify = (name) => linkChars(name).replace(/-$/, '');
