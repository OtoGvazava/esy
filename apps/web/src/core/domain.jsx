// Domain components — ported from the Claude Design project's `esy-core.jsx`
// (`StatusPair`, `RoleChip`, `Mark`, `EsyMark`). Unlike the primitives, these
// four carry a *rule* from the architecture document and not just a look:
//
//   · An order has TWO independent status fields — fulfilment and payment —
//     so `StatusPair` renders two chips and never collapses them into one.
//   · A role's colour is fixed by the role, so OWNER always reads accent,
//     MANAGER warn, ADMIN admin and CUSTOMER neutral wherever it appears.
//
// Those tone maps are structural and therefore live here. Every *label* is
// supplied by the caller (from `t()`), so no user-facing copy is baked in and
// the EN/KA parity gate stays satisfied. Colours are read only from the token
// object passed in as `T` (see ./tokens).
/* eslint-disable react-refresh/only-export-components */
import { Chip } from './primitives';
import { Icons } from './icons';
import { CHANNELS, channelHref } from './channels';

// The design hardcodes a Georgian-first stack on `Mark` and a Latin-only stack
// on the `esy.ge` wordmark. The wordmark stack is reproduced verbatim — the
// brand is set in Latin by design. The mark stack falls back to TK()'s `font`
// (a superset of the design's) only when no token object is passed.
const MARK_FONT =
  "'Noto Sans Georgian', 'Inter', -apple-system, system-ui, sans-serif";
const WORDMARK_FONT = "'Inter', sans-serif";

// Text drawn on top of an accent gradient. Kept as the design's literal: TK()
// has no on-accent foreground token (`accentFg` is accent-on-surface, which
// would be unreadable here).
const ON_ACCENT = '#fff';

// First character of a name, surrogate-pair safe. `charAt(0)` — what the design
// uses — splits an astral code point in half; store names are user input.
const firstChar = (value) => Array.from(String(value ?? ''))[0] || '';

// ─── Order status — two fields, two chips, never merged ─────────────────────
// Fulfilment: where the goods are. Payment: where the money is. A delivered
// order can still be unpaid and a paid order can still be cancelled, which is
// exactly why these may not be flattened into a single "status".
export const FULFIL_TONE = {
  PLACED: 'accent',
  SHIPPED: 'accent',
  OUT: 'warn',
  // The design names this state OUT; Order.Status calls it OUT_FOR_DELIVERY and
  // the API sends the enum name verbatim. Both keys map to the same tone so a
  // real order doesn't fall through to neutral and read as unremarkable.
  OUT_FOR_DELIVERY: 'warn',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
};

export const PAY_TONE = {
  NONE: 'neutral',
  PENDING: 'warn',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'danger',
};

// `status` / `payment` are the raw enum values from the API; `statusLabel` /
// `paymentLabel` are the translated strings from the caller's `t()`. When a
// label is missing the raw enum shows through rather than an empty chip — a
// code is at least language-neutral and never silently blank. `payment`
// defaults to NONE to match the backend column default, so the pair is always
// complete even for an order that has never been through checkout.
export function StatusPair({
  T,
  status,
  payment = 'NONE',
  statusLabel,
  paymentLabel,
  style = {},
}) {
  return (
    <span
      style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', ...style }}
    >
      <Chip T={T} tone={FULFIL_TONE[status] || 'neutral'}>
        {statusLabel || status}
      </Chip>
      <Chip T={T} tone={PAY_TONE[payment] || 'neutral'}>
        {paymentLabel || payment}
      </Chip>
    </span>
  );
}

// ─── Role ───────────────────────────────────────────────────────────────────
// The two permission axes (platform role · store role) share one chip, because
// to a reader they are the same kind of fact. ADMIN gets its own teal so a
// platform admin is never mistaken for a store owner.
export const ROLE_TONE = {
  OWNER: 'accent',
  MANAGER: 'warn',
  ADMIN: 'admin',
  CUSTOMER: 'neutral',
};

// The design draws the raw code next to the translated name (`OWNER · Owner`)
// so the value in the database is always visible next to its reading. Pass
// `showCode={false}` where the audience only needs the reading.
export function RoleChip({ T, role, label, showCode = true, style = {} }) {
  const parts = [showCode ? role : null, label].filter(Boolean);
  return (
    <Chip T={T} tone={ROLE_TONE[role] || 'neutral'} style={style}>
      {parts.join(' · ')}
    </Chip>
  );
}

// ─── Store mark ─────────────────────────────────────────────────────────────
// A store's initial on that store's own accent-to-secondary gradient — the
// tenant brand, not the platform's. `store.secondary` is optional: a tenant
// that has only picked a primary colour gets a flat wash of it rather than a
// broken gradient. `label` overrides the derived initial (a tenant may have
// explicit initials configured).
export function Mark({ T, store, size = 40, radius = 12, label, style = {} }) {
  const from = store?.accent || T?.accent;
  const to = store?.secondary || from;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        color: ON_ACCENT,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: `800 ${Math.round(size * 0.42)}px ${T?.font || MARK_FONT}`,
        ...style,
      }}
    >
      {label ?? firstChar(store?.name)}
    </span>
  );
}

// ─── esy wordmark ───────────────────────────────────────────────────────────
// The platform brand — glyph tile on the platform gradient plus the wordmark.
// `wordmark` and `glyph` are props with the brand as their default: the name is
// a proper noun, identical in EN and KA, so it does not belong in the i18n
// bundles, but keeping it a prop means it is never a JSX text literal and a
// caller can still relabel the lockup. `sub` is the small monospace qualifier
// beside it (host, scope) and must already be translated by the caller.
export function EsyMark({
  T,
  size = 22,
  sub,
  wordmark = 'esy.ge',
  glyph = 'e',
  style = {},
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        color: T.text,
        ...style,
      }}
    >
      <span
        style={{
          width: size * 1.18,
          height: size * 1.18,
          borderRadius: size * 0.32,
          background: T.grad,
          color: ON_ACCENT,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: `800 ${size * 0.62}px ${WORDMARK_FONT}`,
          letterSpacing: '-0.04em',
        }}
      >
        {glyph}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            font: `800 ${size}px ${WORDMARK_FONT}`,
            letterSpacing: '-0.03em',
          }}
        >
          {wordmark}
        </span>
        {sub && (
          <span
            style={{ font: `600 ${size * 0.46}px ${T.mono}`, color: T.textMute }}
          >
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}

// ─── Contact channels (D10) ─────────────────────────────────────────────────

/**
 * One way to reach a store, rendered in that channel's own brand colour —
 * WhatsApp green, Instagram pink, Facebook blue. The colour is the point: a
 * row of these is read at a glance, before any label is.
 *
 * The second line is the action, not the channel name, because the value above
 * it already says which channel it is. "Call" and "Write" differ for a reason:
 * a phone number opens the dialler, a WhatsApp number opens a conversation.
 *
 * Renders as a link when the value can be linked and a plain span otherwise,
 * so a malformed handle degrades to text rather than a dead click.
 */
export function ChannelBtn({ T, channel, label, action, compact, style = {} }) {
  const meta = CHANNELS[channel.type] || CHANNELS.phone;
  const Ic = Icons[meta.icon];
  const href = channelHref(channel.type, channel.value);
  const size = compact ? 15 : 16;

  const body = (
    <>
      <span style={{ color: meta.brand, display: 'inline-flex', flexShrink: 0 }}>
        {Ic && <Ic width={size} height={size} />}
      </span>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span
          style={{
            font: `700 ${compact ? 12 : 12.5}px ${T.font}`,
            color: T.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label || channel.value}
        </span>
        <span style={{ font: `600 10.5px ${T.font}`, color: T.textDim, letterSpacing: '0.01em' }}>
          {action}
        </span>
      </span>
    </>
  );

  const shell = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 9,
    height: compact ? 42 : 46,
    padding: '0 14px',
    borderRadius: 13,
    background: `${meta.brand}14`,
    border: `1px solid ${meta.brand}33`,
    maxWidth: '100%',
    textDecoration: 'none',
    ...style,
  };

  if (!href) return <span style={shell}>{body}</span>;
  return (
    <a
      href={href}
      target={meta.kind === 'tel' && channel.type === 'phone' ? undefined : '_blank'}
      rel="noreferrer"
      style={{ ...shell, cursor: 'pointer' }}
    >
      {body}
    </a>
  );
}
