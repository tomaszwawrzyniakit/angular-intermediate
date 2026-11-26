import { afterNextRender, Component, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/**
 * One SMALL, INTENTIONAL hydration teaching example (Task 11).
 *
 * The value at risk is `new Date()` — NON-DETERMINISTIC. The server stamps the
 * page with the time it served it; the client stamps it with the time it
 * hydrated. The two are always different.
 *
 * ── WHAT v22 ACTUALLY DOES (verified against Angular 22.3, not memory) ─────
 * Angular 22 hydration compares the server-rendered HTML with the DOM the
 * client renders, then REUSES the server's nodes and lets change detection
 * reconcile their content. A non-deterministic value bound to TEXT or an
 * ATTRIBUTE therefore does NOT throw a hydration error — the node is kept and
 * its text is quietly rewritten. The observable symptom is a CONTENT SHIFT:
 * the page paints the server's timestamp, then it changes to the browser's
 * timestamp right after hydration (a flicker / CLS). This is exactly the
 * "Server rendered at …" anti-pattern the Angular hydration guide warns about.
 *
 * It only ESCCALATES to a thrown DOM-mismatch error (NG0500/NG0501/NG0502 —
 * "During hydration Angular expected … but found …") when the non-determinism
 * changes STRUCTURE that Angular cannot reconcile, or when code OUTSIDE the
 * app (a third-party script, a CDN rewriting the HTML) edits the DOM between
 * the server and the client. In a plain in-app app a value difference is
 * reconciled, not thrown.
 *
 * (NOTE: `suppressHydrationCheck` is NOT an Angular 22 API — do not look for
 * it. The v22 ways to keep a value off the server pass are: render a
 * deterministic placeholder and fill the live value in `afterNextRender`,
 * defer the section in a `@defer` block, or `ngSkipHydration` on the host.)
 *
 * ── THE ANTI-PATTERN (kept so the shift is easy to demonstrate) ───────────
 * With `[broken]="true"` the template binds a FRESH `new Date()` at render
 * time, on every platform. Under SSR the user sees the server's time, then it
 * flips to the browser's time immediately after hydration — the shift. (In a
 * version where that value drives un-reconcilable structure, the same line
 * would throw the NG05xx error instead.)
 *
 * To demonstrate: flip the "Demo hydration mismatch" switch on the dashboard
 * header ON and HARD-RELOAD — watch the timestamp change right after load.
 *
 * ── THE FIX (what ships — deterministic, no shift, clean hydration) ───────
 * Whatever the server renders MUST render identically on the client's first
 * hydration pass. In v22 component signal state is NOT restored from the
 * server, so a value computed at bootstrap differs across the boundary. The
 * fix:
 *  1. Render only DETERMINISTIC markup on the first pass — the static literal
 *     "hydrating…" — identical on server and client, so hydration matches and
 *     there is no visible shift.
 *  2. Apply the live time in `afterNextRender()` — a browser-only callback
 *     that runs AFTER hydration. Updating the DOM after hydration is always
 *     safe; this is the v22 way of "keep this value client-only".
 */
@Component({
  selector: 'app-render-info',
  imports: [MatIcon],
  template: `
    <mat-icon aria-hidden="true">schedule</mat-icon>
    @if (broken()) {
      <!--
        THE ANTI-PATTERN (before): liveTime() runs at render time on EVERY
        platform, so the server paints one timestamp and the browser paints
        another; change detection rewrites the text after hydration. Under SSR
        the user sees the value SHIFT right after load. Do not ship it.
      -->
      <span class="text">Rendered at</span>
      <span class="client-time">{{ liveTime() }}</span>
    } @else {
      <!--
        THE FIX ("after"): the first pass renders the static "hydrating…"
        (identical on both platforms → clean hydration, no shift); the real
        time is swapped in by afterNextRender(), after hydration completes.
      -->
      @let now = clientAt();
      <span class="text">Browser:</span>
      <time
        class="client-time"
        [attr.title]="now ? 'Hydrated in the browser at ' + now.toISOString() : null"
        >{{ now ? now.toLocaleTimeString() : 'hydrating…' }}</time
      >
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }

    .text {
      font-weight: 500;
    }

    .client-time {
      padding: 2px 8px;
      border-radius: var(--mat-sys-corner-full);
      background-color: var(--mat-sys-surface-container-highest);
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface);
    }
  `,
})
export class RenderInfo {
  /**
   * true = the anti-pattern variant (shows the value shift under SSR).
   * false = the shipped, fixed version (deterministic first pass, no shift).
   * Driven by the "Demo hydration mismatch" switch in the dashboard header.
   */
  readonly broken = input(false);

  // THE ANTI-PATTERN: a fresh, non-deterministic timestamp read at render
  // time, on every platform. Milliseconds are included so the server and the
  // client values are guaranteed to differ (and the shift is reliably visible).
  protected liveTime(): string {
    const now = new Date();
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${now.toLocaleTimeString()} ${ms} ms`;
  }

  // The live "browser" time. Set in afterNextRender(): browser-only and only
  // after hydration has completed, so this update can never cause a mismatch.
  private readonly clientAt = signal<Date | null>(null);

  constructor() {
    // Browser-only, and (under SSR) after hydration: the sanctioned place to
    // apply client-only values.
    afterNextRender(() => this.clientAt.set(new Date()));
  }
}
