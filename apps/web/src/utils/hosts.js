// The single source of truth for which host the SPA is running on. Mirrors the
// backend's PlatformHosts.java — the two must agree, because the backend uses
// the Host header to resolve the tenant while the frontend uses the same
// hostname to pick a shell and to decide whether to scope API calls.
//
// This exists because the host list had been copied into usePlatformHost, the
// API client and (in Java) several more places; a code review flagged that
// adding a host meant editing every copy, with each half-update failing
// differently and silently. Adding a base domain is now one entry below.

/** Registrable domains esy serves. Storefronts are `<sub>.<domain>`. */
const BASE_DOMAINS = ['esy.ge', 'lvh.me', 'localhost'];

/** Subdomains reserved for platform surfaces, never for a store. */
export const MANAGER = 'manager';
export const ADMIN = 'admin';

const hostname = () => (typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase());

const hasParam = (name) => {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has(name);
  } catch {
    return false;
  }
};

const matches = (host, prefix) => BASE_DOMAINS.some((d) => host === `${prefix}.${d}`);

/** manager.esy.ge / manager.lvh.me / manager.localhost — the back office. */
export function isManagerHostname(host = hostname()) {
  return matches(host, MANAGER);
}

/** admin.esy.ge / admin.lvh.me / admin.localhost — platform administration. */
export function isAdminHostname(host = hostname()) {
  return matches(host, ADMIN);
}

/** The apex or www of any base domain — the public front door. */
export function isApexHostname(host = hostname()) {
  return BASE_DOMAINS.some((d) => host === d || host === `www.${d}`);
}

/** Any platform-owned surface: apex, back office or administration. */
export function isPlatformSurface(host = hostname()) {
  return isApexHostname(host) || isManagerHostname(host) || isAdminHostname(host);
}

/**
 * The storefront subdomain for `<sub>.<base domain>`, or null when the host is
 * not a tenant storefront.
 */
export function storefrontSubdomain(host = hostname()) {
  if (isPlatformSurface(host)) return null;
  for (const d of BASE_DOMAINS) {
    const suffix = `.${d}`;
    if (host.endsWith(suffix)) {
      const label = host.slice(0, -suffix.length);
      if (label) return label;
    }
  }
  return null;
}

/**
 * Absolute URL of a platform surface for the CURRENT environment, so a link
 * never sends a local session to production. Falls back to the production host
 * only for hosts we do not recognise.
 */
function surfaceUrl(prefix, path = '/') {
  if (typeof window === 'undefined') return `https://${prefix}.esy.ge${path}`;
  const { hostname: h, port, protocol } = window.location;
  const p = port ? `:${port}` : '';
  const base = BASE_DOMAINS.find((d) => h === d || h.endsWith(`.${d}`));
  if (base && base !== 'esy.ge') return `${protocol}//${prefix}.${base}${p}${path}`;
  if (base === 'esy.ge') return `https://${prefix}.esy.ge${path}`;
  return `https://${prefix}.esy.ge${path}`;
}

/** Absolute URL of the back office for the current environment. */
export const managerUrl = (path = '/') => surfaceUrl(MANAGER, path);

/** Absolute URL of platform administration for the current environment. */
export const adminUrl = (path = '/') => surfaceUrl(ADMIN, path);

/**
 * Absolute URL of the platform front door (the apex) for the current
 * environment. Same shape as the two above, minus the subdomain — a storefront
 * pointing a shopper back to esy.ge must not send a local session to
 * production, and must not hard-code `esy.ge` on lvh.me.
 */
export function platformUrl(path = '/') {
  if (typeof window === 'undefined') return `https://esy.ge${path}`;
  const { hostname: h, port, protocol } = window.location;
  const p = port ? `:${port}` : '';
  const base = BASE_DOMAINS.find((d) => h === d || h.endsWith(`.${d}`));
  if (base && base !== 'esy.ge') return `${protocol}//${base}${p}${path}`;
  return `https://esy.ge${path}`;
}

/** Dev/preview overrides: ?manager=1, ?admin=1, ?platform=1, ?store=1. */
export const overrides = {
  manager: () => hasParam('manager'),
  admin: () => hasParam('admin'),
  platform: () => hasParam('platform'),
  store: () => hasParam('store'),
};
