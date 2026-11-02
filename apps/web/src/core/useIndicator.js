// Menus that answer a tap at once, the way Instagram's tabs do.
//
//  - usePendingLocation: where the app is going. A menu marks the place being
//    opened as current the moment it is tapped, not once its screen has
//    loaded, so the tap is answered while the router waits for the data.
//  - useIndicator: a marker (a pill, an underline) measured onto the current
//    option and slid to the next one when the choice changes, plus the key of
//    the option just chosen, which gives a small pop (styles/motion.css).
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { UNSAFE_DataRouterStateContext as DataRouterStateContext, useLocation } from 'react-router-dom';

/**
 * The pending navigation's location while one is under way, else the current
 * one. Safe inside a router of its own too (the back office's design preview
 * draws a store in a MemoryRouter within the app's): the app's navigation is
 * only followed where the location is the app's.
 */
export function usePendingLocation() {
  const state = useContext(DataRouterStateContext);
  const here = useLocation();
  const pending = state?.navigation?.location;
  return pending && state.location?.key === here.key ? pending : here;
}

/**
 * `box` is the menu's ref (its positioned container); each option carries
 * data-ind="<key>", and `active` is the current option's key (or null). The
 * marker is drawn with `style` and `still` on a `.esy-ind` element inside the
 * box (or from `rect`, for a marker that is not the option's own size, such
 * as an underline). It lands without sliding the first time, and whenever it
 * reappears.
 * `watch` re-measures when something that moves the options changes.
 */
export function useIndicator(box, active, watch) {
  const [rect, setRect] = useState(null);
  const [still, setStill] = useState(true);
  const [popped, setPopped] = useState(null);
  const prev = useRef(active);
  const placed = useRef(false);

  useLayoutEffect(() => {
    const root = box.current;
    const el = root && active != null
      ? [...root.querySelectorAll('[data-ind]')].find((n) => n.getAttribute('data-ind') === String(active))
      : null;
    if (!el) {
      placed.current = false;
      setRect(null);
      return undefined;
    }
    const measure = () => {
      // Offsets, not client rects: they ignore the option's own press scale.
      let x = 0;
      let y = 0;
      for (let n = el; n && n !== root; n = n.offsetParent) {
        x += n.offsetLeft;
        y += n.offsetTop;
        if (n.offsetParent === root) break;
      }
      setRect({ x, y, w: el.offsetWidth, h: el.offsetHeight });
    };
    if (!placed.current) setStill(true);
    measure();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(root);
      ro.observe(el);
    }
    return () => ro?.disconnect();
  }, [box, active, watch]);

  // Once the marker has landed somewhere, the next move slides.
  useEffect(() => {
    if (!rect || placed.current) return undefined;
    const id = requestAnimationFrame(() => {
      placed.current = true;
      setStill(false);
    });
    return () => cancelAnimationFrame(id);
  }, [rect]);

  useEffect(() => {
    if (prev.current === active) return;
    prev.current = active;
    setPopped(active);
  }, [active]);

  const style = rect
    ? { width: rect.w, height: rect.h, transform: `translate(${rect.x}px, ${rect.y}px)`, opacity: 1 }
    : { width: 0, height: 0, opacity: 0 };
  return { style, still, popped, rect };
}
