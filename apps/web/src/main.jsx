import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './styles/themes.css';
import './styles/design-style.css';
import './styles/display.css';
import './styles/motion.css';
import './index.css';
import './i18n';
import { queryClient } from './core/query/client';
import { createAppRouter } from './router';
import { listenForIntent } from './router/prime';

const router = createAppRouter();
listenForIntent();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
