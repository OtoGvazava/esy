import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './styles/fonts.css';
import './styles/themes.css';
import './styles/design-style.css';
import './styles/display.css';
import './styles/motion.css';
import './index.css';
import './i18n';
import { queryClient } from './core/query/client';
import { categoriesQuery, publicContactsQuery, tenantQuery } from './core/query/queries';
import { createAppRouter } from './router';
import { listenForIntent } from './router/prime';

// The store this page belongs to, as the server put it into the page
// (SpaIndex.java), seeds the cache: the app's first render already has it,
// so nothing is drawn in esy's defaults first and it is not fetched again.
// A storefront's page also brings its category pills and contact buttons.
try {
  const el = document.getElementById('esy-boot');
  const boot = el ? JSON.parse(el.textContent) : null;
  if (boot?.tenant) queryClient.setQueryData(tenantQuery().queryKey, boot.tenant);
  if (Array.isArray(boot?.categories)) queryClient.setQueryData(categoriesQuery().queryKey, boot.categories.filter((r) => r && r.name));
  if (Array.isArray(boot?.contacts)) queryClient.setQueryData(publicContactsQuery().queryKey, boot.contacts);
} catch { /* no store in the page: TenantContext asks /api/tenant/current */ }

listenForIntent();

// The host's route table is its own chunk (router/index.jsx), already on its
// way: the page's pre-paint script asked for it beside this one.
createAppRouter().then((router) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
});
