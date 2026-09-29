import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {import.meta.env.VITE_HASH ? (
      <HashRouter><App /></HashRouter>
    ) : (
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}><App /></BrowserRouter>
    )}
  </React.StrictMode>,
);

// Offline support and "Add to home screen" on the live site only.
if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_HASH) {
  window.addEventListener('load', () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}); });
}
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__buzzInstall = e; window.dispatchEvent(new Event('buzz-installable')); });
