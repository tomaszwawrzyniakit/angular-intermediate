import { RenderMode, ServerRoute } from '@angular/ssr';

// Hybrid rendering: each route picks how its FIRST HTML is produced.
export const serverRoutes: ServerRoute[] = [
  {
    // A form with no data and no SEO value: render it in the browser only (CSR).
    path: 'tickets/new',
    renderMode: RenderMode.Client,
  },
  {
    // Live data that changes all the time: render on the server per request (SSR).
    path: '**',
    renderMode: RenderMode.Server,
  },
  // A page that is the same for everyone (e.g. /about, docs) would use RenderMode.Prerender:
  // HTML generated once at build time (SSG). Routes with params need getPrerenderParams().
];
