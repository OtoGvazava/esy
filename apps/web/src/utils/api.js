// Centralized API client for the Spring Boot backend.
// Requests go to /api/* which Vite proxies to http://localhost:8080 in dev.
//
// Auth is a server-set HttpOnly cookie (esy_token, Domain=esy.ge) — never
// readable from JS — so requests just need to carry cookies; there is no
// token in localStorage. "Am I signed in?" is answered by /api/auth/user.
import { isManagerHostname } from './hosts';

// ---- Low-level client -------------------------------------------------------
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Store scoping applies to the back office only. The admin host is deliberately
// excluded: administration is cross-store and names its target explicitly in
// the /api/admin/** namespace, and the backend ignores ?tenant there.
function withManagerTenant(endpoint) {
  if (!isManagerHostname() || !endpoint.startsWith('/api/')) return endpoint;
  if (/[?&]tenant=/.test(endpoint)) return endpoint;
  let tenant = null;
  try { tenant = new URLSearchParams(window.location.search).get('tenant'); } catch { /* SSR */ }
  if (!tenant) return endpoint;
  return `${endpoint + (endpoint.includes('?') ? '&' : '?')}tenant=${encodeURIComponent(tenant)}`;
}

class ApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // Back office: one host serves every store, so the Host header can't carry
    // the store the way it does on <sub>.esy.ge. The selected store rides the
    // page URL as ?tenant=<sub> (the ManagerShell keeps it there), and the
    // backend honors that param on manager hosts only. Appending it centrally
    // makes every existing page and dialog store-scoped in the manager app
    // without touching each call site. Calls that already carry ?tenant=
    // (the legacy devTenant() helpers) are left alone.
    endpoint = withManagerTenant(endpoint);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      // Send the esy_token cookie (same-origin per subdomain; explicit so it
      // also works if the API is ever called cross-origin — CORS allows it).
      credentials: 'include',
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json();
        message = body.error || body.message || message;
      } catch {
        /* response had no JSON body */
      }
      throw new ApiError(message, response.status);
    }

    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body: JSON.stringify(data ?? {}) });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data ?? {}) });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

const api = new ApiClient('');

// ---- Shape mapping (backend DTO <-> frontend UI shape) ----------------------
// Backend list item: { id, title, imageUrl, price, quantity }
const mapListItem = (dto) => ({
  id: dto.id,
  title: dto.title,
  price: dto.price,
  thumbnail: dto.imageUrl,
  image: dto.imageUrl,
  quantity: dto.quantity,
  stock: dto.quantity,
  // So a card can send the shopper to choose rather than adding a product
  // checkout would refuse for having no combination (D11).
  hasVariants: !!dto.hasVariants,
});

// Backend detail: { id, title, description, imageUrl, price, quantity,
//                    images:[{id,url,position}], ... }
const mapDetail = (dto) => {
  const gallery = Array.isArray(dto.images) ? dto.images : [];
  const urls = gallery.length
    ? gallery.map((i) => i.url)
    : (dto.imageUrl ? [dto.imageUrl] : []);
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    price: dto.price,
    quantity: dto.quantity,
    stock: dto.quantity,
    thumbnail: dto.imageUrl || urls[0],
    images: urls,
    // Raw uploaded images ([{id,url,position}]) — the owner editor needs ids
    // to delete; empty for legacy URL-only products.
    imageList: gallery,
    imageUrl: dto.imageUrl || '',
    category: '',
  };
};

// Admin form { title, description, price, stock, images:[url] } -> backend ProductDto
const toBackendProduct = (form) => ({
  title: form.title,
  description: form.description,
  imageUrl: Array.isArray(form.images) ? form.images[0] || '' : form.imageUrl || '',
  price: Number(form.price),
  quantity: Number(form.stock ?? form.quantity ?? 0),
});

// ---- Product API ------------------------------------------------------------
export const productApi = {
  async list({ page = 0, size = 20, q = '', signal } = {}) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    const path = q
      ? `/api/products/search?q=${encodeURIComponent(q)}&${params}`
      : `/api/products?${params}`;
    const data = await api.get(path, { signal });
    const content = data?.content || [];
    return {
      products: content.map(mapListItem),
      hasMore: data ? data.hasNext === true || (data.last === false) : false,
      page: data?.page ?? page,
      totalPages: data?.totalPages ?? 0,
      totalElements: data?.totalElements ?? content.length,
    };
  },

  async get(id, { signal } = {}) {
    return mapDetail(await api.get(`/api/products/${id}`, { signal }));
  },

  async create(form) {
    return mapDetail(await api.post('/api/products', toBackendProduct(form)));
  },

  async update(id, form) {
    return mapDetail(await api.put(`/api/products/${id}`, toBackendProduct(form)));
  },

  remove(id) {
    return api.delete(`/api/products/${id}`);
  },

  // Multipart — bypasses the JSON client so the browser sets the multipart
  // boundary. Cookie auth via credentials:'include'. Returns the fresh product.
  // Because it bypasses ApiClient, the manager-host ?tenant rewrite must be
  // applied by hand or the upload resolves to the default tenant and 403s.
  async uploadImages(id, files) {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    const res = await fetch(withManagerTenant(`/api/products/${id}/images`), {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (!res.ok) {
      let message = `Upload failed (${res.status})`;
      try {
        const b = await res.json();
        message = b.error || b.message || message;
      } catch { /* no JSON body */ }
      throw new ApiError(message, res.status);
    }
    return mapDetail(await res.json());
  },

  // Variants (D11). The read is public — a shopper must see the sizes before
  // choosing one; the write is store management and replaces the whole
  // document, because editing a variant grid is a single act.
  getVariants(id, { signal } = {}) {
    return api.get(`/api/products/${id}/variants`, { signal });
  },

  putVariants(id, doc) {
    return api.put(`/api/products/${id}/variants`, doc);
  },

  async deleteImage(id, imageId) {
    return mapDetail(await api.delete(`/api/products/${id}/images/${imageId}`));
  },
};

// ---- Auth API ---------------------------------------------------------------
export const authApi = {
  me() {
    return api.get('/api/auth/user');
  },
  logout() {
    return api.post('/api/auth/logout', {});
  },
};

// ---- Account / orders / saved / follows (cross-store, real backend) ---------
export const accountApi = {
  get() {
    return api.get('/api/account');
  },
  // Mandatory profile (name/surname/dateOfBirth). Phone is separate below.
  updateProfile(body) {
    return api.put('/api/account/profile', body);
  },
  // Separate from the profile: changing the number clears verification.
  updatePhone(phoneNumber) {
    return api.put('/api/account/phone', { phoneNumber });
  },
  // Dev stand-in OTP: response includes { devCode } so it can be entered
  // without a real SMS. Swap for a provider later — contract is unchanged.
  sendPhoneCode() {
    return api.post('/api/account/phone/send-code', {});
  },
  verifyPhone(code) {
    return api.post('/api/account/phone/verify', { code });
  },
};

export const orderApi = {
  // items: [{ productId, title, price, quantity }] — scoped to the current
  // store by the backend (Host header / ?tenant=).
  // delivery: { addressId } (a saved address-book entry) or { address:
  // { recipient, phone, line, city, postalCode, country } } — frozen onto
  // the order server-side (decision D4).
  create(items, devTenant, delivery = {}) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.post(`/api/orders${q}`, { items, ...delivery });
  },
  list() {
    return api.get('/api/orders');
  },
};

// ---- Address book (platform-wide, decision D4) ------------------------------
export const addressApi = {
  list() {
    return api.get('/api/addresses');
  },
  create(body) {
    return api.post('/api/addresses', body);
  },
  update(id, body) {
    return api.put(`/api/addresses/${id}`, body);
  },
  remove(id) {
    return api.delete(`/api/addresses/${id}`);
  },
};

// ---- Payments (Bank of Georgia hosted checkout) ----------------------------
export const paymentApi = {
  // Creates the order + a BOG payment, returns { orderNumber, redirectUrl }.
  // The caller sends the browser to redirectUrl (bank-hosted page).
  checkout(items, devTenant, delivery = {}) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.post(`/api/payments/bog/checkout${q}`, { items, ...delivery });
  },
  // Payment state for the return page: { orderNumber, paymentStatus, total }.
  // Server-side reconciles PENDING via BOG's receipt (covers missed callbacks).
  status(orderNumber) {
    return api.get(`/api/payments/bog/status?order=${encodeURIComponent(orderNumber)}`);
  },
};

// ---- Tenant API -------------------------------------------------------------
// The backend resolves the tenant from the request Host header, so `current`
// is implicitly scoped to whatever subdomain the SPA is served from.
// The store's contact channels (D10). Two reads on purpose: `listPublic` is
// what a shopper's browser calls and never returns a hidden entry, while
// `list` is the owner's and includes them. They are separate endpoints rather
// than one with a flag, so leaking a hidden number cannot be a one-line slip.
export const contactApi = {
  listPublic(devTenant, { signal } = {}) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.get(`/api/contact-channels/public${q}`, { signal });
  },
  list(devTenant, { signal } = {}) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.get(`/api/contact-channels${q}`, { signal });
  },
  create(payload, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.post(`/api/contact-channels${q}`, payload);
  },
  update(id, payload, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.put(`/api/contact-channels/${id}${q}`, payload);
  },
  remove(id, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.delete(`/api/contact-channels/${id}${q}`);
  },
  reorder(ids, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.post(`/api/contact-channels/reorder${q}`, { ids });
  },
};

// Delivery routes (D9). Same public/owner split as contacts: `listPublic`
// returns only enabled routes plus whether checkout should ask for an address
// at all, and both come from one call because checkout needs them together.
export const deliveryApi = {
  listPublic(devTenant, { signal } = {}) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.get(`/api/delivery/public${q}`, { signal });
  },
  list(devTenant, { signal } = {}) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.get(`/api/delivery${q}`, { signal });
  },
  update(route, payload, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.put(`/api/delivery/${encodeURIComponent(route)}${q}`, payload);
  },
};

// Who runs THIS store, from the merchant's own back office (D17). Distinct
// from adminApi's member calls: those name a store by path and are for the
// platform, these act on the store the request already resolved to. Both go
// through the same server-side rules.
export const teamApi = {
  list(devTenant, { signal } = {}) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.get(`/api/store/team${q}`, { signal });
  },
  assign(email, role, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.post(`/api/store/team${q}`, { email, role });
  },
  remove(email, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.delete(`/api/store/team/${encodeURIComponent(email)}${q}`);
  },
};

export const tenantApi = {
  // `devTenant` forwards ?tenant=<sub> so a single localhost host can switch
  // tenants in dev (the backend only honors it for localhost; prod resolves
  // by Host). No-op in production where there's no ?tenant= in the URL.
  current(devTenant) {
    const path = devTenant
      ? `/api/tenant/current?tenant=${encodeURIComponent(devTenant)}`
      : '/api/tenant/current';
    return api.get(path);
  },
  create(payload) {
    return api.post('/api/tenant', payload);
  },
  // Owner-only branding edit for the current store (server resolves it by
  // Host; @storeAccess gates it). `devTenant` keeps localhost store switching.
  update(payload, devTenant) {
    const path = devTenant
      ? `/api/tenant/current?tenant=${encodeURIComponent(devTenant)}`
      : '/api/tenant/current';
    return api.put(path, payload);
  },
  // Owner-only store logo upload. Multipart — bypasses the JSON client so the
  // browser sets the boundary; cookie auth via credentials:'include'. Returns
  // the fresh tenant (logoUrl now points at the served bytes).
  async uploadLogo(file, devTenant) {
    const fd = new FormData();
    fd.append('file', file);
    const path = devTenant
      ? `/api/tenant/logo?tenant=${encodeURIComponent(devTenant)}`
      : '/api/tenant/logo';
    const res = await fetch(path, { method: 'POST', body: fd, credentials: 'include' });
    if (!res.ok) {
      let message = `Upload failed (${res.status})`;
      try {
        const b = await res.json();
        message = b.error || b.message || message;
      } catch { /* no JSON body */ }
      throw new ApiError(message, res.status);
    }
    return res.json();
  },
  // Owner-only: drop the store logo (clears logoUrl + the stored bytes).
  deleteLogo(devTenant) {
    const path = devTenant
      ? `/api/tenant/logo?tenant=${encodeURIComponent(devTenant)}`
      : '/api/tenant/logo';
    return api.delete(path);
  },
  // Owner/admin store stats for the current store (server resolves it by
  // Host; @storeAccess gates it).
  stats(devTenant) {
    const path = devTenant
      ? `/api/tenant/stats?tenant=${encodeURIComponent(devTenant)}`
      : '/api/tenant/stats';
    return api.get(path);
  },
  // Owner/admin: orders placed against the current store, newest first.
  // Same @storeAccess gate as stats().
  orders(devTenant) {
    const path = devTenant
      ? `/api/tenant/orders?tenant=${encodeURIComponent(devTenant)}`
      : '/api/tenant/orders';
    return api.get(path);
  },
  // Owner/manager: advance an order through the fulfilment machine
  // (decision D1). status: SHIPPED | OUT_FOR_DELIVERY | DELIVERED | CANCELLED.
  updateOrderStatus(orderId, status, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.request(`/api/tenant/orders/${orderId}/status${q}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  // Public store directory (active stores).
  list() {
    return api.get('/api/tenant');
  },
  // Live subdomain check for the registration wizard.
  checkSubdomain(subdomain) {
    return api.get(`/api/tenant/available?subdomain=${encodeURIComponent(subdomain)}`);
  },
};

// ---- Admin: platform administration (ADMIN only) ---------------------------
// Every endpoint here is @PreAuthorize("hasRole('ADMIN')") and lives under
// /api/admin. Administration is cross-store: the target is always named in the
// path, never inferred from the Host header or ?tenant (withManagerTenant
// skips this host on purpose), so these calls mean the same thing whichever
// surface they are made from.
//
// Money fields (revenue, feesOwed, totalAccrued) are BigDecimal and EXCLUDE
// refunded orders (decision D2 — a refund is not revenue). Anything rendering
// them has to say so rather than let the figure read as gross takings.
export const adminApi = {
  // { serviceFeeRate, bogEnv, bogAuthUrl, bogBaseUrl, publicBaseUrl, storeReady }
  getConfig() {
    return api.get('/api/admin/config');
  },
  // Send only the keys you changed; server validates + writes to the config store.
  updateConfig(patch) {
    return api.put('/api/admin/config', patch);
  },

  // [{ subdomain, name, displayName, category, active, suspendedAt,
  //    suspendReason, productCount, orderCount, revenue, feesOwed, ownerEmail }]
  // `q` matches name / subdomain / owner email; omitted when empty so the
  // unfiltered list is a plain GET.
  listStores(q = '', { signal } = {}) {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return api.get(`/api/admin/stores${query}`, { signal });
  },

  // The list item plus members:[{email, role}] and
  // recentOrders:[{orderNumber, total, status, paymentStatus, createdAt}].
  getStore(subdomain, { signal } = {}) {
    return api.get(`/api/admin/stores/${encodeURIComponent(subdomain)}`, { signal });
  },

  // Pulls the storefront down. `reason` is required by the server and is shown
  // to the store owner — never send a placeholder. Returns the updated store.
  suspendStore(subdomain, reason) {
    return api.post(`/api/admin/stores/${encodeURIComponent(subdomain)}/suspend`, { reason });
  },

  // Puts it back. Returns the updated store.
  reactivateStore(subdomain) {
    return api.post(`/api/admin/stores/${encodeURIComponent(subdomain)}/reactivate`, {});
  },

  // Give someone OWNER or MANAGER of a store, or change the role they hold.
  // The account must already exist — an identity comes from Google, so the
  // server answers 404 for an address that has never signed in. Both calls
  // return the refreshed store detail, members included.
  assignMember(subdomain, email, role) {
    return api.post(`/api/admin/stores/${encodeURIComponent(subdomain)}/members`, { email, role });
  },
  removeMember(subdomain, email) {
    return api.delete(
      `/api/admin/stores/${encodeURIComponent(subdomain)}/members/${encodeURIComponent(email)}`,
    );
  },

  // { totalAccrued, stores:[{ subdomain, name, orderCount, revenue, feesOwed }] }
  getBilling({ signal } = {}) {
    return api.get('/api/admin/billing', { signal });
  },

  // [{ email, source: 'env'|'db', grantedAt, grantedBy }]. An 'env' row comes
  // from ADMIN_EMAILS and cannot be removed over the API (the server answers
  // 400) — only by editing that variable and redeploying.
  listAdmins({ signal } = {}) {
    return api.get('/api/admin/admins', { signal });
  },
  addAdmin(email) {
    return api.post('/api/admin/admins', { email });
  },
  removeAdmin(email) {
    return api.delete(`/api/admin/admins/${encodeURIComponent(email)}`);
  },

  // [{ at, actorEmail, action, targetType, targetId, detail }] — newest first.
  listAudit(limit = 50, { signal } = {}) {
    return api.get(`/api/admin/audit?limit=${encodeURIComponent(limit)}`, { signal });
  },
};

export const handleApiError = (error, fallbackMessage = 'An error occurred') => {
  if (error?.name === 'AbortError') return 'Request was cancelled';
  if (error?.message?.includes('Failed to fetch')) {
    return 'Network error. Is the backend running on :8080?';
  }
  return error?.message || fallbackMessage;
};
