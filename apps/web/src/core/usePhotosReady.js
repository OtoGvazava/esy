// Whether a set of photos has loaded and decoded, so a piece drawn from several
// photos (a look's thumbnail) can show them all at once, with one fade, rather
// than filling in photo by photo as each arrives.
//
// Each photo is fetched and decoded once for the whole page: a set whose
// photos were all decoded before (another thumbnail of the same kind, a
// thumbnail drawn again) is ready from its first render, so it shows at once
// and never fades from nothing. A photo that fails counts as done, so one
// missing photo never holds back the others; its tile keeps its ground.
import { useEffect, useState } from 'react';

const decoded = new Set();
const pending = new Map();

function decodeOnce(src) {
  if (decoded.has(src)) return Promise.resolve();
  let job = pending.get(src);
  if (!job) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    job = (typeof img.decode === 'function'
      ? img.decode()
      : new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; }))
      .catch(() => {})
      .then(() => {
        decoded.add(src);
        pending.delete(src);
      });
    pending.set(src, job);
  }
  return job;
}

/** True once every photo in `urls` (null and repeats ignored) has decoded or failed. */
export function usePhotosReady(urls) {
  const list = [...new Set((urls || []).filter(Boolean))];
  const key = list.join('|');
  const cached = list.every((src) => decoded.has(src));
  const [doneKey, setDoneKey] = useState(null);
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    Promise.all(key.split('|').map(decodeOnce)).then(() => { if (alive) setDoneKey(key); });
    return () => { alive = false; };
  }, [key, cached]);
  return cached || doneKey === key;
}
