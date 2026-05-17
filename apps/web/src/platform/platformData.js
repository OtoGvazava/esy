// Platform-site data: bilingual strings (EN/KA), category list, and the
// account-hub mock. Store data itself comes from the real backend
// (GET /api/tenant) — see PlatformShared useStores().

export const PLATFORM_ACCENT = '#6366f1'; // indigo · hue 250 · platform default

export const CATEGORIES = [
  { id: 'all', label: 'All stores' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'home', label: 'Home' },
  { id: 'food', label: 'Food' },
  { id: 'art', label: 'Art' },
];

// Featured carousel — by subdomain, falls back to first N stores if absent.
export const FEATURED_SUBDOMAINS = [
  'aurora', 'okra', 'studio-form', 'foglio', 'noor-rugs', 'lemon-press', 'verde', 'kura',
];

// The account hub has no backend yet (the per-tenant user model contradicts
// the one-account design). This mock is the seam: replace with a real
// /api/account aggregation when the global-user model lands.
export const ACCOUNT = {
  name: 'Mariam Harlow',
  email: 'm.harlow@gmail.com',
  initials: 'MH',
  since: '2023',
  ownedStores: {
    seller: [
      { subdomain: 'aurora', status: 'live', orders: 412, revenue: '$18,240', views: '12.4k' },
      { subdomain: 'meadow', status: 'live', orders: 86, revenue: '$3,120', views: '4.8k' },
      { subdomain: 'plana', status: 'draft', orders: 0, revenue: '$0', views: '—' },
    ],
    both: [
      { subdomain: 'aurora', status: 'live', orders: 412, revenue: '$18,240', views: '12.4k' },
      { subdomain: 'meadow', status: 'live', orders: 86, revenue: '$3,120', views: '4.8k' },
    ],
  },
  orders: [
    { id: 'ESY-4019-7', subdomain: 'verde', items: 3, total: '$58.00', status: 'delivered', placed: 'Mar 14' },
    { id: 'ESY-4015-2', subdomain: 'studio-form', items: 1, total: '$72.00', status: 'shipped', placed: 'Mar 11' },
    { id: 'ESY-4011-9', subdomain: 'salt-stoneware', items: 2, total: '$94.00', status: 'out for delivery', placed: 'Mar 10' },
    { id: 'ESY-3998-1', subdomain: 'maris', items: 4, total: '$112.40', status: 'delivered', placed: 'Feb 28' },
  ],
  saved: [
    { id: 's1', label: 'Marigold risograph · A3', price: '$24', subdomain: 'foglio' },
    { id: 's2', label: 'Petty knife · 130mm', price: '$184', subdomain: 'kura' },
    { id: 's3', label: 'Linen workshirt · clay', price: '$118', subdomain: 'okra' },
  ],
  followedStores: ['noor-rugs', 'okra', 'foglio', 'kura', 'salt-stoneware'],
};

export const STR = {
  en: {
    browse: 'Browse', sell: 'Sell', signIn: 'Sign in',
    openStore: 'Open your store',
    myStores: 'My stores', orders: 'Orders', saved: 'Saved',
    signOut: 'Sign out', account: 'Account',
    heroEyebrow: 'A place for makers',
    heroTitle: 'Open your store on esy in minutes.',
    heroBody: 'One link, your own brand, a tiny commission. esy hosts independent shops on your-name.esy.ge — from the first sale to the millionth.',
    browseStores: 'Browse stores',
    howItWorks: 'How it works',
    h1: 'Claim a subdomain', h1d: 'Pick your-name.esy.ge. Lowercase, 3–30 chars, no leading hyphens.',
    h2: 'Bring your products', h2d: 'Upload photos, set prices, choose your brand color. Two minutes per item.',
    h3: 'Go live, no review', h3d: 'Your store is public the moment you save. Share the link and start selling.',
    discover: 'Discover the stores',
    fee: 'Flat 2% per sale',
    feeBody: 'No subscription. No listing fees. No surprise tiers. You keep 98% of every sale.',
    everyStore: 'Every store on esy',
    storeCount: 'shops · {n} live',
    search: 'Search stores',
    sortNew: 'Newest', sortAZ: 'A–Z',
    visit: 'Visit',
    register: 'Open your store',
    step: 'Step',
    stepAccount: 'Account', stepIdentity: 'Store identity', stepBrand: 'Branding',
    stepReview: 'Review', stepDone: 'Live',
    accountHub: 'Account', myShopping: 'My shopping', yourStores: 'Your stores',
    openAnother: 'Open another store', manage: 'Manage',
    notFoundT: "That subdomain doesn't exist yet.",
    notFoundB: 'But it could — {name}.esy.ge is available. Want to claim it?',
  },
  ka: {
    browse: 'მაღაზიები', sell: 'გაყიდე', signIn: 'შესვლა',
    openStore: 'შენი მაღაზიის გახსნა',
    myStores: 'ჩემი მაღაზიები', orders: 'შეკვეთები', saved: 'შენახული',
    signOut: 'გასვლა', account: 'ანგარიში',
    heroEyebrow: 'სივრცე შემქმნელებისთვის',
    heroTitle: 'გახსენი მაღაზია esy-ზე რამდენიმე წუთში.',
    heroBody: 'ერთი ბმული, შენი ბრენდი, მცირე საკომისიო. esy მასპინძლობს დამოუკიდებელ მაღაზიებს your-name.esy.ge მისამართზე.',
    browseStores: 'მაღაზიების დათვალიერება',
    howItWorks: 'როგორ მუშაობს',
    h1: 'აირჩიე ქვედომენი', h1d: 'your-name.esy.ge — პატარა ასოები, 3–30 სიმბოლო, დეფისით არ იწყება.',
    h2: 'ატვირთე პროდუქცია', h2d: 'ფოტოები, ფასები, ბრენდის ფერი. ერთეულზე ორი წუთი.',
    h3: 'გადი ეთერში', h3d: 'მაღაზია საჯაროა შენახვისთანავე. გააზიარე ბმული და გაყიდე.',
    discover: 'აღმოაჩინე მაღაზიები',
    fee: 'ფიქსირებული 2% გაყიდვაზე',
    feeBody: 'არანაირი გამოწერა. არანაირი ფარული ფასი. იღებ ყოველი გაყიდვის 98%-ს.',
    everyStore: 'ყველა მაღაზია esy-ზე',
    storeCount: 'მაღაზია · {n} აქტიური',
    search: 'მოძებნე მაღაზია',
    sortNew: 'უახლესი', sortAZ: 'ა–ჰ',
    visit: 'ვიზიტი',
    register: 'მაღაზიის გახსნა',
    step: 'საფეხური',
    stepAccount: 'ანგარიში', stepIdentity: 'მაღაზიის ვინაობა', stepBrand: 'ბრენდინგი',
    stepReview: 'გადახედვა', stepDone: 'აქტიური',
    accountHub: 'ანგარიში', myShopping: 'ჩემი შოპინგი', yourStores: 'შენი მაღაზიები',
    openAnother: 'კიდევ ერთი მაღაზიის გახსნა', manage: 'მართვა',
    notFoundT: 'ეს ქვედომენი ჯერ არ არსებობს.',
    notFoundB: 'მაგრამ ის შეიძლება იყოს — {name}.esy.ge თავისუფალია.',
  },
};

export function tr(lang, key, vars) {
  let s = (STR[lang] && STR[lang][key]) || STR.en[key] || key;
  if (vars) Object.keys(vars).forEach((k) => { s = s.replace(`{${k}}`, vars[k]); });
  return s;
}

export function storeInitials(store) {
  return (store.name || store.subdomain || '?')
    .split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// Subdomain hostname for a store. In local dev there are no real subdomains,
// so link back to the same origin with ?tenant=<sub> (the backend resolves it).
export function storeUrl(store) {
  if (typeof window === 'undefined') return `https://${store.subdomain}.esy.ge`;
  const { hostname, origin } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}/?tenant=${encodeURIComponent(store.subdomain)}`;
  }
  if (hostname.endsWith('esy.ge')) return `https://${store.subdomain}.esy.ge`;
  return `${origin}/?tenant=${encodeURIComponent(store.subdomain)}`;
}
