import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully suppress benign Vite development WebSocket connection/HMR errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (msg.includes('WebSocket') || msg.includes('vite') || msg.includes('failed to connect to websocket')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg.includes('WebSocket') || msg.includes('vite') || msg.includes('failed to connect to websocket')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Register RakshaX Offline Map Tile Safeguard Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[RakshaX SW] Registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[RakshaX SW] Registration notice:', err);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

