import '@fontsource-variable/hanken-grotesk';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
/* Rounded geometric sans matching the idcibidci wordmark — the site's display
   face (all headings + brand accents). Body/UI stays Hanken Grotesk. */
import '@fontsource/m-plus-rounded-1c/400.css';
import '@fontsource/m-plus-rounded-1c/500.css';
import '@fontsource/m-plus-rounded-1c/700.css';
import '@fontsource/m-plus-rounded-1c/800.css';
import '@/styles/global.css';
import '@/styles/components.css';

import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { site } from '@/config/site';
import { CopyProvider } from '@/copy/CopyProvider';
import EditModeToolbar from '@/copy/EditModeToolbar';

// Set once, outside Helmet's management — react-helmet-async drops managed
// html attributes on StrictMode remounts, which failed axe's html-has-lang.
document.documentElement.lang = site.locale;

const app = (
  <StrictMode>
    <HelmetProvider>
      <CopyProvider>
        <BrowserRouter>
          <App />
          <EditModeToolbar />
        </BrowserRouter>
      </CopyProvider>
    </HelmetProvider>
  </StrictMode>
);

const root = document.getElementById('root')!;
if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
