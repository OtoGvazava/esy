// A bar that stays at the top while the page scrolls (`position: sticky`)
// sits on the page's own ground until then, and takes a surface and a hairline
// only once it is pinned, so text scrolling under it never shows through.
// Sticky cannot say when it engages: a zero-height marker just above the bar
// can. Once the marker has scrolled out over the top, the bar is pinned.
import { useEffect, useRef, useState } from 'react';

/** `[marker, stuck]`: put `<div ref={marker} />` right above the sticky bar. */
export function useStuck() {
  const marker = useRef(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = marker.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setStuck(entry.boundingClientRect.top < 0), { threshold: [0, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [marker, stuck];
}

/** The marker itself: takes no room and is not read out. */
export const markerStyle = { height: 0, width: '100%', pointerEvents: 'none' };
