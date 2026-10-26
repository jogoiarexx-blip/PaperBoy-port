import React from 'react';
import { createRoot } from 'react-dom/client';
import Paperroute from '../app/page';
import './style.css';

// Todas as URLs absolutas dos assets devem respeitar o subdiretório do GitHub Pages.
// Ex.: /PaperBoy-port/assets/manifest.json em vez de /assets/manifest.json.
(window as Window & { __PAPERROUTE_BASE__?: string }).__PAPERROUTE_BASE__ =
  import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL.slice(0, -1) : import.meta.env.BASE_URL;

const element = document.getElementById('root');
if (!element) throw new Error('Contêiner raiz do PAPERROUTE não encontrado.');
createRoot(element).render(
  <React.StrictMode>
    <Paperroute />
  </React.StrictMode>,
);
