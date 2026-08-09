// Contact-channel constants and link building (decision D10). Kept out of the
// component file so both can be imported without dragging React in — and
// because a module that exports components plus helpers breaks fast refresh.
//
// Named channelLinks, NOT contactChannels: this sits beside ContactChannels.jsx
// and Windows' filesystem is case-insensitive, so two names differing only in
// case resolve to each other's file. The build fails with an import error that
// points at the importer rather than at the collision.

// Mirrors ContactChannel.TYPES on the server; the order is the display order.
export const CHANNEL_TYPES = ['PHONE', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM'];

// Channels whose value is a telephone number rather than a handle or URL.
// Only these may carry the primary marker — the server enforces the same rule.
export const PHONE_TYPES = ['PHONE', 'WHATSAPP'];

/**
 * Where a channel value should take you when clicked, or null when it cannot
 * be linked. Owners type these by hand, so the value may be a bare handle, an
 * @handle or a full URL, and a phone number may carry spaces and brackets.
 */
export function channelHref(type, value) {
  const v = String(value || '').trim();
  if (!v) return null;
  const digits = v.replace(/[^\d+]/g, '');
  switch (type) {
    case 'PHONE': return `tel:${digits}`;
    // wa.me wants digits only — no plus, no spaces.
    case 'WHATSAPP': return `https://wa.me/${digits.replace(/\D/g, '')}`;
    case 'FACEBOOK':
    case 'INSTAGRAM': {
      if (/^https?:\/\//i.test(v)) return v;
      const handle = v.replace(/^@/, '');
      return type === 'FACEBOOK'
        ? `https://facebook.com/${handle}`
        : `https://instagram.com/${handle}`;
    }
    default: return null;
  }
}
