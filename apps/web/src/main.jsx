import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/themes.css';
import './styles/design-style.css';
import './index.css';
import App from './App.jsx';
import './i18n';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
