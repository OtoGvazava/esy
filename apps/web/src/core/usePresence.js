// Something that animates out before it goes: a sheet, a menu, a dialog.
//
// `mounted` stays true for `ms` after `open` turns false, so the closing
// animation can play; `state` ('open' | 'closed') is what the element's
// data-state carries for styles/motion.css (.esy-sheet, .esy-scrim,
// .esy-pop-in). With motion reduced it goes at once.
import { useEffect, useState } from 'react';
import { motionAllowed } from './motion';

export function usePresence(open, ms = 240) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    if (!motionAllowed()) {
      setMounted(false);
      return undefined;
    }
    const id = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(id);
  }, [open, ms]);
  return { mounted: open || mounted, state: open ? 'open' : 'closed' };
}

export default usePresence;
