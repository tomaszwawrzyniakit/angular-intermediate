import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Task 11 — server routing (v22: `RenderMode` instead of the v20 `renderMode`
 * string option). Every route is rendered on the server per request, so the
 * first HTML a browser receives already contains the dashboard/ticket content
 * (not an empty `<app-root>`) and hydration re-uses it on the client.
 *
 * (The `ng add` default is `RenderMode.Prerender` = static SSG at build time;
 * the training demo needs true SSR — the per-request server render is what
 * makes hydration and the "Server rendered at …" timestamp observable.)
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
