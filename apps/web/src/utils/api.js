// Centralized API client for the Spring Boot backend.
// Requests go to /api/* which Vite proxies to http://localhost:8080 in dev.
import { STORAGE_KEYS } from '../constants';

// ---- Auth token storage -----------------------------------------------------
export const getToken = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } catch {
    /* ignore storage errors */
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  } catch {
    /* ignore storage errors */
  }
};

// ---- Low-level client -------------------------------------------------------
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

class ApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
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
// Backend list item: { id, title, imageUrl, price }
const mapListItem = (dto) => ({
  id: dto.id,
  title: dto.title,
  price: dto.price,
  thumbnail: dto.imageUrl,
  image: dto.imageUrl,
});

// Backend detail: { id, title, description, imageUrl, price, quantity, ... }
const mapDetail = (dto) => ({
  id: dto.id,
  title: dto.title,
  description: dto.description,
  price: dto.price,
  quantity: dto.quantity,
  stock: dto.quantity,
  thumbnail: dto.imageUrl,
  images: dto.imageUrl ? [dto.imageUrl] : [],
  category: '',
});

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
};

// ---- Auth API ---------------------------------------------------------------
export const authApi = {
  devLogin({ email, name, admin } = {}) {
    return api.post('/api/auth/dev-login', { email, name, admin });
  },
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
};

export const orderApi = {
  // items: [{ productId, title, price, quantity }] — scoped to the current
  // store by the backend (Host header / ?tenant=).
  create(items, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.post(`/api/orders${q}`, { items });
  },
  list() {
    return api.get('/api/orders');
  },
};

export const savedApi = {
  list() {
    return api.get('/api/saved');
  },
  add({ productId, title, price }, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.post(`/api/saved${q}`, { productId, title, price });
  },
  remove(productId, devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.delete(`/api/saved/${productId}${q}`);
  },
};

export const followApi = {
  list() {
    return api.get('/api/follows');
  },
  follow(devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.post(`/api/follows${q}`, {});
  },
  unfollow(devTenant) {
    const q = devTenant ? `?tenant=${encodeURIComponent(devTenant)}` : '';
    return api.delete(`/api/follows${q}`);
  },
};

// ---- Tenant API -------------------------------------------------------------
// The backend resolves the tenant from the request Host header, so `current`
// is implicitly scoped to whatever subdomain the SPA is served from.
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
  // Public store directory (active stores).
  list() {
    return api.get('/api/tenant');
  },
  // Live subdomain check for the registration wizard.
  checkSubdomain(subdomain) {
    return api.get(`/api/tenant/available?subdomain=${encodeURIComponent(subdomain)}`);
  },
};

export const handleApiError = (error, fallbackMessage = 'An error occurred') => {
  if (error?.name === 'AbortError') return 'Request was cancelled';
  if (error?.message?.includes('Failed to fetch')) {
    return 'Network error. Is the backend running on :8080?';
  }
  return error?.message || fallbackMessage;
};
