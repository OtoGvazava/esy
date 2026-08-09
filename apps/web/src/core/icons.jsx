// Icon set — ported from the Claude Design project's `esy-core.jsx` (`I.*`).
// Inline SVG only, no dependency and no CSS: every glyph inherits its colour
// from `currentColor` (stroke or fill, whichever the design uses) and takes an
// optional `size` that defaults to the size that icon is drawn at in the
// design. Each icon is a named export (`IconSearch`, `IconBag`, …) and is also
// reachable on the grouped `Icons` object under the design's original key
// (`Icons.search`), so a ported screen can keep its `I.foo` call sites.
/* eslint-disable react-refresh/only-export-components */

// The three drawing styles the design uses on the <svg> root.
const stroke = (strokeWidth) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});
const strokeCap = (strokeWidth) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round',
});
const solid = { fill: 'currentColor' };

// Builds one icon component. `size` drives width and height together (every
// glyph is square on a 24×24 viewBox); caller props spread last so any
// attribute — strokeWidth, fill, style, width/height, aria-* — can be
// overridden. Decorative by default: pass `aria-hidden={false}` plus a role or
// label when an icon is the only content of a control.
function icon(name, defaultSize, attrs, glyph) {
  const Component = ({ size = defaultSize, ...rest }) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...attrs}
      {...rest}
    >
      {glyph}
    </svg>
  );
  Component.displayName = name;
  return Component;
}

export const IconSearch = icon('IconSearch', 18, stroke('1.8'), (
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>
));

export const IconBag = icon('IconBag', 18, stroke('1.8'), (
  <>
    <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </>
));

export const IconGrid = icon('IconGrid', 18, stroke('1.8'), (
  <>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </>
));

export const IconUser = icon('IconUser', 18, stroke('1.8'), (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </>
));

export const IconUsers = icon('IconUsers', 18, stroke('1.8'), (
  <>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.5 20c1.2-3.4 3.7-5 6.5-5s5.3 1.6 6.5 5" />
    <path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c-.3-1.6-.8-3-1.6-4" />
  </>
));

export const IconPlus = icon('IconPlus', 14, strokeCap('2.2'), (
  <path d="M12 5v14M5 12h14" />
));

export const IconArrowR = icon('IconArrowR', 16, stroke('1.9'), (
  <path d="M5 12h14m-5-6 6 6-6 6" />
));

export const IconArrowL = icon('IconArrowL', 16, stroke('1.9'), (
  <path d="M19 12H5m5-6-6 6 6 6" />
));

export const IconChevD = icon('IconChevD', 14, stroke('2'), (
  <path d="m6 9 6 6 6-6" />
));

export const IconSwap = icon('IconSwap', 14, stroke('2'), (
  <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
));

export const IconCheck = icon('IconCheck', 14, stroke('2.3'), (
  <path d="m5 12 5 5L20 7" />
));

export const IconX = icon('IconX', 14, strokeCap('2.2'), (
  <path d="M6 6l12 12M18 6 6 18" />
));

export const IconStar = icon('IconStar', 12, solid, (
  <path d="m12 17.3-6.2 3.7 1.7-7L2 9.3l7.2-.6L12 2l2.8 6.7 7.2.6-5.5 4.7 1.7 7z" />
));

export const IconSpark = icon('IconSpark', 14, solid, (
  <path d="M12 2 14 10l8 2-8 2-2 8-2-8-8-2 8-2z" />
));

export const IconPin = icon('IconPin', 14, stroke('1.8'), (
  <>
    <path d="M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13Z" />
    <circle cx="12" cy="9" r="2.5" />
  </>
));

export const IconPhone = icon('IconPhone', 16, stroke('1.9'), (
  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
));

export const IconMail = icon('IconMail', 16, stroke('1.8'), (
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>
));

export const IconTruck = icon('IconTruck', 18, stroke('1.8'), (
  <>
    <path d="M1 3h13v13H1z" />
    <path d="M14 8h4l3 3v5h-7" />
    <circle cx="5.5" cy="18.5" r="2" />
    <circle cx="17.5" cy="18.5" r="2" />
  </>
));

export const IconCard = icon('IconCard', 16, stroke('1.8'), (
  <>
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <path d="M2 10h20" />
  </>
));

export const IconChart = icon('IconChart', 18, stroke('1.8'), (
  <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
));

export const IconGear = icon('IconGear', 18, stroke('1.7'), (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0a1.7 1.7 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4a1.7 1.7 0 0 0 1.2-2.8l-.1-.1A2 2 0 1 1 7 5.1l.1.1A1.7 1.7 0 0 0 9 5.4V5a2 2 0 1 1 4 0a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 12a2 2 0 1 1 0 4Z" />
  </>
));

export const IconBox = icon('IconBox', 18, stroke('1.8'), (
  <>
    <path d="m21 8-9-5-9 5v8l9 5 9-5Z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </>
));

export const IconUpload = icon('IconUpload', 18, stroke('1.8'), (
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M12 16V3m-5 5 5-5 5 5" />
));

export const IconShield = icon('IconShield', 18, stroke('1.8'), (
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
));

export const IconGlobe = icon('IconGlobe', 16, stroke('1.7'), (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>
));

export const IconSun = icon('IconSun', 16, stroke('1.8'), (
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>
));

export const IconMoon = icon('IconMoon', 16, stroke('1.8'), (
  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
));

export const IconMenu = icon('IconMenu', 18, strokeCap('1.8'), (
  <path d="M4 7h16M4 12h16M4 17h16" />
));

export const IconBell = icon('IconBell', 18, stroke('1.8'), (
  <>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </>
));

export const IconEye = icon('IconEye', 16, stroke('1.8'), (
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </>
));

export const IconWhatsapp = icon('IconWhatsapp', 18, solid, (
  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1 2.1-.3 3.4a11 11 0 0 0 4.4 4.3c1.7.8 2.6.8 3.4.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.4-.3Z" />
));

export const IconFacebook = icon('IconFacebook', 18, solid, (
  <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
));

export const IconInstagram = icon(
  'IconInstagram',
  18,
  { fill: 'none', stroke: 'currentColor', strokeWidth: '1.9' },
  (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
);

// The one glyph that does not inherit colour: Google's mark is brand-locked,
// exactly as in the design (a `fill` prop on the root would not reach it).
export const IconGoogle = icon('IconGoogle', 18, {}, (
  <>
    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z" />
    <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9a7 7 0 0 1-10.4-3.6H1.7v3A11.5 11.5 0 0 0 12 23.5Z" />
    <path fill="#FBBC05" d="M5.5 14.2a6.8 6.8 0 0 1 0-4.4v-3H1.7a11.5 11.5 0 0 0 0 10.4l3.8-3Z" />
    <path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.7 6.8l3.8 3A6.9 6.9 0 0 1 12 5.4Z" />
  </>
));

// Grouped form — keys are the design's own (`I.search` → `Icons.search`), so a
// ported screen can look an icon up by name: `const Ic = Icons[meta.icon]`.
export const Icons = {
  search: IconSearch,
  bag: IconBag,
  grid: IconGrid,
  user: IconUser,
  users: IconUsers,
  plus: IconPlus,
  arrowR: IconArrowR,
  arrowL: IconArrowL,
  chevD: IconChevD,
  swap: IconSwap,
  check: IconCheck,
  x: IconX,
  star: IconStar,
  spark: IconSpark,
  pin: IconPin,
  phone: IconPhone,
  mail: IconMail,
  truck: IconTruck,
  card: IconCard,
  chart: IconChart,
  gear: IconGear,
  box: IconBox,
  upload: IconUpload,
  shield: IconShield,
  globe: IconGlobe,
  sun: IconSun,
  moon: IconMoon,
  menu: IconMenu,
  bell: IconBell,
  eye: IconEye,
  whatsapp: IconWhatsapp,
  facebook: IconFacebook,
  instagram: IconInstagram,
  google: IconGoogle,
};
