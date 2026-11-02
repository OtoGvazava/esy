// The thin bar across the top of the page while a navigation waits for the
// next screen's data or code (the router keeps the old screen on display
// meanwhile, see prime.js). It appears only once a wait has lasted a moment,
// so a screen that is already cached changes without it; it creeps towards
// the end while the wait lasts, then runs out and fades.
import { useEffect, useRef, useState } from 'react';
import { useNavigation } from 'react-router-dom';

const SHOW_AFTER_MS = 120;
const STEP_MS = 320;

export default function NavProgress() {
  const busy = useNavigation().state !== 'idle';
  const [state, setState] = useState('idle'); // idle | run | done
  const [p, setP] = useState(0);
  const shown = useRef(false);

  useEffect(() => {
    if (!busy) return undefined;
    let step;
    const start = setTimeout(() => {
      shown.current = true;
      setState('run');
      setP(0.12);
      step = setInterval(() => setP((v) => v + (0.9 - v) * 0.14), STEP_MS);
    }, SHOW_AFTER_MS);
    return () => {
      clearTimeout(start);
      clearInterval(step);
    };
  }, [busy]);

  useEffect(() => {
    if (busy || !shown.current) return undefined;
    shown.current = false;
    setState('done');
    setP(1);
    const reset = setTimeout(() => {
      setState('idle');
      setP(0);
    }, 420);
    return () => clearTimeout(reset);
  }, [busy]);

  return (
    <div
      aria-hidden="true"
      className="esy-progress"
      data-state={state}
      style={{ transform: `scaleX(${p})` }}
    />
  );
}
