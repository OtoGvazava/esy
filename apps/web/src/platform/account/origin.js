// Where the account was opened from.
//
// The account lives on esy.ge alone, so an app that sends someone here says
// where they came from: ?from=store&sub=<sub>, ?from=manager&sub=<sub> or
// ?from=admin. The overview then shows what the account has in that place and
// a way back to it. (The store is `sub`, not `store`: ?store= is taken, it
// forces the storefront shell on any host, utils/hosts.js.)
//
// The way back is built from the subdomain with the same helpers every other
// link uses; a URL is never read from the address and followed. The subdomain
// must look like one, and the block's facts come from the account's own data,
// so a made-up value shows nothing.
//
// It is kept for the visit (session storage): moving between the account's
// sections drops the query string, and the block and its way back should not
// go with it. A new tab starts without one.
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { adminUrl, managerUrl } from '../../utils/hosts';
import { storeUrl } from '../platformData';

const KEY = 'esy-account-from';
const KINDS = ['store', 'manager', 'admin'];
// A DNS label: letters, digits and inner hyphens.
const SUB = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** { kind, sub } from a query string, or null when it names no valid origin. */
export function parseOrigin(search) {
  let params;
  try { params = new URLSearchParams(search || ''); } catch { return null; }
  const kind = params.get('from');
  if (!KINDS.includes(kind)) return null;
  const raw = (params.get('sub') || '').toLowerCase();
  const sub = SUB.test(raw) ? raw : null;
  // A store or its back office is nowhere without the store.
  if (kind !== 'admin' && !sub) return null;
  return { kind, sub: kind === 'admin' ? null : sub };
}

function stored() {
  try {
    const o = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return o && KINDS.includes(o.kind) && (o.kind === 'admin' || SUB.test(o.sub || '')) ? o : null;
  } catch {
    return null;
  }
}

function keep(origin) {
  try { sessionStorage.setItem(KEY, JSON.stringify(origin)); } catch { /* storage blocked: this page only */ }
}

/** Forget it: the way back was taken, or the account was left. */
export function clearOrigin() {
  try { sessionStorage.removeItem(KEY); } catch { /* nothing kept */ }
}

/** The origin for this visit: the address's when it names one, else the one kept. */
export function useOrigin() {
  const { search } = useLocation();
  return useMemo(() => {
    const named = parseOrigin(search);
    if (named) {
      keep(named);
      return named;
    }
    return stored();
  }, [search]);
}

/** The place itself, for the way back. */
export function originUrl(origin) {
  if (!origin) return null;
  if (origin.kind === 'store') return storeUrl({ subdomain: origin.sub });
  if (origin.kind === 'manager') return managerUrl(`/?tenant=${encodeURIComponent(origin.sub)}`);
  return adminUrl('/');
}
