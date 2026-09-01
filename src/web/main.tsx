import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { prefetchApiBaseUrl } from './lib/api';

if (typeof window !== 'undefined' && window.api) {
  document.body.classList.add('electron-app');
  prefetchApiBaseUrl();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

