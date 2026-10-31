// The store's public link, for the back office's "share" step (M1b) and the
// empty orders screen's "copy link" (M2). The address comes from storeUrl, the
// platform's one helper for where a store lives, so a local stack copies its
// lvh.me link and production copies https://<sub>.esy.ge.
//
// Its own module because it is a hook: exported from a component file it would
// break fast refresh.
import { useCallback, useEffect, useRef, useState } from 'react';
import { storeUrl } from '../platform/platformData';

/**
 * Puts `text` on the clipboard. The Clipboard API needs a secure context, which
 * the local http://manager.lvh.me stack is not, so the old selection copy is
 * the fallback. Resolves to whether anything was copied.
 */
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* refused: try the fallback */ }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * `{ url, copied, copy, share }` for the store `sub`. `copied` stays true for a
 * moment after a successful copy, so the button can say so. `share(native)`
 * opens the phone's share sheet (Instagram, WhatsApp…) when asked to and the
 * browser has one, and copies otherwise.
 */
export function useStoreLink(sub) {
  const url = sub ? storeUrl({ subdomain: sub }) : '';
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    if (!url || !(await copyText(url))) return false;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2400);
    return true;
  }, [url]);

  const share = useCallback(async (native) => {
    if (native && url && typeof navigator.share === 'function') {
      try {
        await navigator.share({ url });
        return true;
      } catch (e) {
        // Closing the sheet is a choice, not a failure to fall back from.
        if (e?.name === 'AbortError') return false;
      }
    }
    return copy();
  }, [url, copy]);

  return { url, copied, copy, share };
}
