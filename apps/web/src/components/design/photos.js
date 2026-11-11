// Real photos for the previews that draw a store before it has products of its
// own, as the design canvas draws them: a look's thumbnail (LookThumb) and the
// design preview's sample catalogue (StorePreview). They are Unsplash photos
// (assets/photos/SOURCES.txt), 360 px squares and 600 × 200 cover bands, and a
// page fetches only the ones it draws.
import { lookById } from '../../core/design/looks';

const FILES = import.meta.glob('../../assets/photos/*.webp', { eager: true, query: '?url', import: 'default' });
const src = (name) => FILES[`../../assets/photos/${name}.webp`];

// The looks' groups that have photos of their own (core/design/looks.js);
// "other" has none, so its thumbnails borrow the look's.
// Home & handmade is the canvas's own ceramics studio: each tile is the photo
// its shape and tone draw there. In the other groups a tile's tone picks one of
// the group's four photos. Each group also has a cover band and a photo at the
// end of the hero band.
const SETS = {
  home: { tiles: ['mug-1', 'vase-2', 'bowl-3', 'cloth-4', 'plate-2', 'vase-1'], hero: 'vase-2' },
  fashion: { hero: 'fashion-3' },
  food: { hero: 'food-2' },
  beauty: { hero: 'beauty-2' },
  tech: { hero: 'tech-1' },
  kids: { hero: 'kids-3' },
};

// LookThumb's six tiles, by tone: t1 t2 t3 t4 t2 t1.
const TONES = [1, 2, 3, 4, 2, 1];

/** Whether `group` has photos of its own. */
export const hasPhotos = (group) => Object.hasOwn(SETS, group);

/**
 * The photos a thumbnail of `group` draws: its six tiles in LookThumb's order,
 * its cover band and the photo at the end of its hero band. A group without
 * photos of its own draws Home & handmade's.
 */
export function groupPhotos(group) {
  const g = hasPhotos(group) ? group : 'home';
  const set = SETS[g];
  return {
    tiles: (set.tiles || TONES.map((n) => `${g}-${n}`)).map(src),
    cover: src(`cover-${g}`),
    hero: src(set.hero),
  };
}

/**
 * The photos a look's thumbnail (LookThumb) draws: those of `group` when it has
 * photos of its own, else those of the group the look was made for. `urls`
 * lists each photo the thumbnail shows once: its tiles, and its cover band or
 * its hero band's photo, whichever its header draws.
 */
export function thumbPhotos(design, group) {
  const photos = groupPhotos(hasPhotos(group) ? group : lookById(design.look)?.group);
  const band = design.header === 'cover' ? photos.cover : photos.hero;
  return { ...photos, urls: [...new Set([...photos.tiles, band])].filter(Boolean) };
}

/** The sample catalogue's photos by StorePreview's sample keys: the canvas's store home, product by product. */
export const SAMPLE_PHOTOS = {
  mug: src('mug-1'),
  vase: src('vase-2'),
  bowl: src('bowl-3'),
  napkins: src('cloth-4'),
  espresso: src('mug-3'),
  tallVase: src('vase-1'),
  plate: src('plate-4'),
  towel: src('cloth-2'),
};
