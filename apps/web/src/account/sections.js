// The account's sections, as the address names them, and what each is called
// in an app's own bar (a store's phone header, the back office's and admin's
// bar), which shows the title where the page does not.

export const SECTIONS = ['orders', 'addresses', 'stores', 'personal', 'display'];

/** The section an address is in: '' for the overview, or one of SECTIONS. */
export function sectionOf(pathname) {
  const m = String(pathname || '').match(/\/account\/?([^/?#]*)/);
  return m && SECTIONS.includes(m[1]) ? m[1] : '';
}

/** A section's title. `t` reads the `account` namespace; inside a store, orders are that store's. */
export function sectionTitle(t, section, app) {
  switch (section) {
    case 'orders': return app === 'store' ? t('hub.hereOrdersTitle') : t('hub.ordersTitle');
    case 'addresses': return t('hub.addresses');
    case 'stores': return t('me.stores');
    case 'personal': return t('me.personal');
    case 'display': return t('title', { ns: 'display' });
    default: return t('hub.account');
  }
}
