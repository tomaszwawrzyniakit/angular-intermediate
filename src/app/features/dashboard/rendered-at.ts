import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, Component, inject, PLATFORM_ID, signal } from '@angular/core';

/**
 * Task 11 — the controlled hydration MISMATCH teaching example.
 *
 * WHAT BREAKS
 * ----------
 * `new Date()` is non-deterministic: the server stamps HTML at request time,
 * the client re-renders at hydration time, so the values differ. The classic
 * mistake is to branch on the platform IN THE TEMPLATE so the server and the
 * browser emit DIFFERENT markup in the same spot:
 *
 *     @if (isBrowser) {
 *       <span class="badge"><i class="bi bi-check2"></i> rendered at {{ now() }}</span>
 *     } @else {
 *       <span class="badge">…</span>
 *     }
 *
 * The server renders the plain `…` badge; the browser renders a badge with an
 * icon + timestamp. During hydration Angular walks the server DOM and expects
 * the exact structure the client produced — it finds a text node where the
 * client created an `<i>` element — and throws a node-mismatch error of the
 * "During hydration Angular expected … but found …" family (NG0500-class
 * errors; in Angular DevTools the component is flagged "mismatched"). Note
 * the structural difference is what makes it throw: a SAME-structure text node
 * that merely differs in its string does NOT error — hydration validates the
 * node by type and then overwrites it with the client value (see the installed
 * core's locateOrCreateTextNodeImpl). llms-full.txt calls this pattern out
 * explicitly: "Avoid using isPlatformBrowser in templates with @if … Instead,
 * use afterNextRender … and keep rendered content consistent across platforms."
 *
 * WHY THE FIX WORKS
 * -----------------
 * The template below renders the SAME single node on BOTH platforms — one
 * <span> with deterministic "…" content. Identical structure = nothing for
 * hydration to mismatch. Only after hydration has claimed the DOM does the
 * browser write the real time into that same node:
 *
 * - `isPlatformBrowser` guards the write in the CLASS — never in the template.
 * - `afterNextRender` defers the write until after the initial render pass,
 *   i.e. after hydration is done (it also simply never runs on the server).
 * - `status` is a signal, so the rewrite is an ordinary zoneless change-
 *   detection update — no direct DOM manipulation (which would itself break
 *   hydration).
 *
 * HOW A TRAINER REPRODUCES THE ERROR LIVE
 * ---------------------------------------
 * Swap the template body for the wrong version above (and add
 * `isBrowser = isPlatformBrowser(inject(PLATFORM_ID))` + a
 * `now() => new Date().toLocaleTimeString('en-GB')` method), then hard-reload
 * the SSR page with hydration enabled. The dev console prints the node
 * mismatch error and DevTools flags the component. Revert to this template and
 * the error is gone.
 *
 * THE `ngSkipHydration` ALTERNATIVE (and why it is not used here)
 * ---------------------------------------------------------------
 * `ngSkipHydration` — as an attribute on the component host
 * (`<app-rendered-at ngSkipHydration />`) or `host: { ngSkipHydration: 'true' }`
 * — makes Angular DESTROY the server DOM for that component and re-render it
 * from scratch. It is the documented last-resort workaround for components
 * that genuinely cannot hydrate (e.g. D3 charts doing direct DOM
 * manipulation): the component loses hydration (flicker + extra work), and on
 * the root component it disables hydration app-wide. A value that is simply
 * written client-side does not need it — the afterNextRender fix above keeps
 * full hydration.
 */
@Component({
  selector: 'app-rendered-at',
  template: `
    <span class="badge text-bg-secondary d-inline-flex align-items-center gap-2">
      <i class="bi bi-clock" aria-hidden="true"></i>
      <span class="visually-hidden">Server render status:</span>
      <span>{{ status() }}</span>
    </span>
  `,
})
export class RenderedAt {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * The markup both platforms render: "…" on the SERVER and on the client's
   * first (hydrating) pass, so server HTML and client DOM are identical. The
   * browser then replaces it with the real time, post-hydration.
   */
  protected readonly status = signal('…');

  constructor() {
    // Browser-only write, scheduled after the initial render (post-hydration):
    // the server never executes this, and the DOM update happens only once the
    // browser's view exists. (afterNextRender must run inside an injection
    // context — the constructor is one.)
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.status.set(`hydrated in browser at ${new Date().toLocaleTimeString('en-GB')}`);
      }
    });
  }
}
