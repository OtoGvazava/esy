// The ready-made looks (store plan, decision 5). A look is a pre-filled design
// object, shipped as code: adding one is an entry here and its id in
// schema.json's `looks`, which the server whitelists. Looks carry no colour;
// a preview always draws the seller's own.
import { normalizeDesign } from './normalize';

const look = (id, group, d) => ({ id, group, design: normalizeDesign({ ...d, look: id }) });

export const LOOKS = [
  look('social', 'fashion', { theme: 'glow', menu: 'capsule', productLayout: 'grid3', header: 'cover', style: { price: 'photo', addbtn: 'heart' } }),
  look('boutique', 'fashion', { theme: 'soft', menu: 'fab', productLayout: 'grid2', header: 'cover', style: { btn: 'pill', card: 'glass', font: 'serif', icon: 'thin', ratio: 'portrait', price: 'photo', addbtn: 'heart', bg: 'gradient' } }),
  look('nightdrop', 'fashion', { theme: 'neon', menu: 'drawer', productLayout: 'feed', header: 'center', style: { ratio: 'portrait', addbtn: 'heart' } }),
  look('sneaker', 'fashion', { theme: 'neon', menu: 'capsule', productLayout: 'grid2', header: 'cover', style: { density: 'compact', ratio: 'portrait', price: 'photo' }, show: { banner: true } }),
  look('bakery', 'food', { theme: 'soft', menu: 'tabs', productLayout: 'grid2', header: 'compact', style: { btn: 'pill', corner: 'round', font: 'rounded', icon: 'bold', ratio: 'square', bg: 'tinted' }, show: { banner: true } }),
  look('market', 'food', { theme: 'soft', menu: 'top', productLayout: 'list', header: 'compact', style: { font: 'sans', icon: 'regular', density: 'compact' }, show: { stories: false } }),
  look('coffee', 'food', { theme: 'glow', menu: 'tabs', productLayout: 'feed', header: 'cover', style: { ratio: 'landscape' } }),
  look('glowup', 'beauty', { theme: 'glow', menu: 'mini', productLayout: 'grid2', header: 'center', style: { card: 'glass', ratio: 'portrait', addbtn: 'heart' } }),
  look('pastel', 'beauty', { theme: 'soft', menu: 'capsule', productLayout: 'grid2', header: 'compact', style: { corner: 'round', font: 'rounded', density: 'compact' } }),
  look('gadget', 'tech', { theme: 'neon', menu: 'top', productLayout: 'list', header: 'compact', style: { font: 'mono', density: 'compact' }, show: { stories: false } }),
  look('cleantech', 'tech', { theme: 'glow', menu: 'tabs', productLayout: 'grid2', header: 'compact', style: { corner: 'subtle', card: 'outline', font: 'sans', density: 'compact' }, show: { stories: false } }),
  look('studio', 'home', { theme: 'soft', menu: 'tabs', productLayout: 'grid2', header: 'compact' }),
  look('gallerywall', 'home', { theme: 'glow', menu: 'drawer', productLayout: 'feed', header: 'center', style: { density: 'airy', ratio: 'portrait' }, show: { badge: false } }),
  look('toybox', 'kids', { theme: 'soft', menu: 'fab', productLayout: 'grid2', header: 'cover', style: { btn: 'pill', corner: 'round', font: 'rounded', icon: 'bold', density: 'airy' }, show: { banner: true } }),
];

export const lookById = (id) => LOOKS.find((l) => l.id === id) || null;

// Registration's category ids, onto the looks' seven groups. Quick setup asks
// for the group itself ("what do you sell?"), so a group id is its own group.
const GROUP = { fashion: 'fashion', wear: 'fashion', electronics: 'tech', home: 'home', art: 'home', food: 'food' };
export const groupOf = (category) => GROUP[category] || (SUGGEST[category] ? category : 'other');

// Three looks a seller sees first for what they sell (store plan, Phase 4).
const SUGGEST = {
  fashion: ['social', 'boutique', 'nightdrop'],
  food: ['bakery', 'market', 'coffee'],
  beauty: ['glowup', 'pastel', 'boutique'],
  tech: ['sneaker', 'gadget', 'cleantech'],
  home: ['studio', 'gallerywall', 'pastel'],
  kids: ['toybox', 'bakery', 'pastel'],
  other: ['social', 'studio', 'sneaker'],
};
export const suggestedLooks = (category) => SUGGEST[groupOf(category)].map(lookById);
