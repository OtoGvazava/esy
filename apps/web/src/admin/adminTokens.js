// The token object every screen on admin.esy.ge draws from.
//
// Lifted out of AdminShell unchanged so the chrome and the screens inside it
// cannot drift apart: administration is teal, never the platform indigo, and
// the accent is fixed rather than tenant-derived because this host serves no
// single store — borrowing a store's brand here would be a lie about whose
// data is on screen.
import { useTK } from '../core/useTK';

export const ADMIN_ACCENT = '#0f766e';

/**
 * The ported TK palette with the accent pinned to administration teal.
 * Returns a token object (not `{ T }`), so call it as `const T = useAdminTokens()`.
 */
export function useAdminTokens() {
  const { T, dark } = useTK();
  return { ...T, accent: ADMIN_ACCENT, accentFg: T.adminFg, accentBg: T.adminBg, dark };
}

export default useAdminTokens;
