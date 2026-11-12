// Whether the store's account menu is open, and which control opened it.
//
// A store has one account menu (components/account/StoreAccount.jsx, mounted
// once by the store's layout) and many controls that open it: the desktop
// bar's account button and the account item of each of the six menu styles.
// They share this small store rather than a context, so a menu that only maps
// over the list of places (storeChrome.js) can open it without being handed
// anything.
//
// `anchor` is the control itself when the menu should open out of it (the
// desktop bar's button); without one it rises as a sheet.
import { useSyncExternalStore } from 'react';

let state = { open: false, anchor: null, ever: false };
const subs = new Set();

const set = (next) => {
  state = next;
  subs.forEach((fn) => fn());
};

export function openAccountMenu(anchor = null) {
  set({ open: true, anchor, ever: true });
}

export function closeAccountMenu() {
  if (state.open) set({ ...state, open: false });
}

/** A press on a control: opens it there, or closes it when that control has it open. */
export function toggleAccountMenu(anchor = null) {
  if (state.open) closeAccountMenu();
  else openAccountMenu(anchor);
}

const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

/** `{ open, anchor, ever }`; `ever` is whether it has been opened at all, for loading its code late. */
export function useAccountMenuState() {
  return useSyncExternalStore(subscribe, () => state);
}
