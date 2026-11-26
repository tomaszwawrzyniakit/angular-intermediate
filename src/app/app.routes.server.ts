import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server routes (Task 11 — SSR).
 *
 * RenderMode.Server means every request is rendered on the server into a
 * fully-populated HTML document, which the client then hydrates. This is the
 * mode that exercises the Day-4 teaching points (hydration, event replay,
 * incremental hydration of the deferred chart), because the server actually
 * runs Angular for each request.
 *
 * We deliberately do NOT use RenderMode.Prerender for the `**` catch-all:
 * the app has a parameterized route (`tickets/:id`) and prerendering it
 * would require a getPrerenderParams() function to enumerate the ids at
 * build time. Per-request server rendering is what we want to demonstrate.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
