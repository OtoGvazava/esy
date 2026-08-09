// Contact channels (D10), ported from esy-core.jsx.
//
// Each channel carries its own brand colour, because that is what makes a row
// of contacts readable at a glance — WhatsApp green and Instagram pink are
// recognised before the label is read. `kind` decides the action word and how
// the value is turned into a link: a phone is dialled, a handle is opened.
//
// Keys are lowercase to match the design and the API.

export const CHANNELS = {
  phone: { icon: 'phone', brand: '#3f8a4a', ph: '+995 5XX XX XX XX', kind: 'tel' },
  whatsapp: { icon: 'whatsapp', brand: '#25D366', ph: '+995 5XX XX XX XX', kind: 'tel' },
  facebook: { icon: 'facebook', brand: '#1877F2', ph: 'facebook.com/…', kind: 'link' },
  instagram: { icon: 'instagram', brand: '#E1306C', ph: '@…', kind: 'link' },
};

export const CHANNEL_TYPES = Object.keys(CHANNELS);

/** Only these may carry the primary marker — a handle cannot be "called". */
export const PHONE_TYPES = CHANNEL_TYPES.filter((k) => CHANNELS[k].kind === 'tel');

/**
 * Where a channel value should take you, or null when it cannot be linked.
 * Owners type these by hand, so a value may be a bare handle, an @handle or a
 * full URL, and a phone number may carry spaces and brackets.
 */
export function channelHref(type, value) {
  const meta = CHANNELS[type];
  const v = String(value || '').trim();
  if (!meta || !v) return null;
  const digits = v.replace(/[^\d+]/g, '');
  if (meta.kind === 'tel') {
    // wa.me wants digits only — no plus, no spaces.
    return type === 'whatsapp' ? `https://wa.me/${digits.replace(/\D/g, '')}` : `tel:${digits}`;
  }
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/^(?:fb\.com|facebook\.com|instagram\.com)\//i, '');
  return type === 'facebook'
    ? `https://facebook.com/${handle}`
    : `https://instagram.com/${handle}`;
}
