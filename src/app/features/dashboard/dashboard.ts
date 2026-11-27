import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ticket } from '../../domain/ticket';
import { MOCK_TICKETS } from '../../domain/tickets';
import { ActivityChart } from './activity-chart';

/**
 * Task 10 — the OpsBoard dashboard: the hero demo screen.
 *
 * Teaching points:
 * - `computed()` for the KPI stats (derived state, no effect()).
 * - `@defer (on idle)` so the activity chart is NOT in the initial execution
 *   path: the compiler splits `ActivityChart` into a separate lazy chunk that
 *   the browser fetches after first render (visible in DevTools > Network).
 * - `@placeholder` (skeleton) + `@loading` (spinner) + `@error` cover the
 *   deferrable-view lifecycle stages.
 */
@Component({
  selector: 'app-dashboard',
  template: `
    <div class="d-flex align-items-center justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Operations overview</h1>
        <p class="text-secondary small mb-0">
          Live ticket counts, computed from the mock ticket feed.
        </p>
      </div>
      <a class="btn btn-primary btn-sm" [routerLink]="['/tickets']">
        <i class="bi bi-grid-1x2 me-2"></i>Ticket list
      </a>
    </div>

    <!-- KPI cards: computed() derives each count from MOCK_TICKETS. -->
    <div class="row g-3 g-lg-4 mb-4">
      @for (stat of stats(); track stat.label) {
        <div class="col-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div
                class="kpi-icon d-flex align-items-center justify-content-center rounded-circle {{
                  stat.iconClass
                }}"
              >
                <i class="bi {{ stat.icon }} fs-4" aria-hidden="true"></i>
              </div>
              <div>
                <div class="kpi-value">{{ stat.value }}</div>
                <div class="text-secondary small">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <!--
      Deferrable view (the ONE chart on this page). The "on idle" trigger waits
      for the browser to be idle (1200 ms hard cap) BEFORE fetching the lazy
      chunk, so the KPI cards paint first and the chart's own JS request shows
      up separately in DevTools > Network.
    -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-transparent d-flex align-items-center gap-2">
        <i class="bi bi-graph-up me-1 text-accent" aria-hidden="true"></i>
        <h2 class="h5 mb-0">Ticket activity by status</h2>
      </div>
      <div class="card-body">
        @defer (on idle(1200)) {
          <app-activity-chart />
        } @loading (after 300ms) {
          <div class="d-flex align-items-center gap-3 text-secondary py-4" role="status">
            <span class="spinner-border spinner-border-sm text-accent" aria-hidden="true"></span>
            <span class="small">Rendering activity chart…</span>
          </div>
        } @placeholder {
          <div class="activity-skeleton" aria-hidden="true">
            <div class="row align-items-center g-2">
              <div class="col-4 col-sm-3"><div class="skeleton h-2 w-75 rounded"></div></div>
              <div class="col-6 col-sm-7"><div class="skeleton h-2 rounded"></div></div>
              <div class="col-2 col-sm-2">
                <div class="skeleton h-2 w-25 rounded float-end"></div>
              </div>
            </div>
            @for (i of [0, 1, 2]; track i) {
              <div class="row align-items-center g-2">
                <div class="col-4 col-sm-3"><div class="skeleton h-2 w-50 rounded"></div></div>
                <div class="col-6 col-sm-7"><div class="skeleton h-2 rounded"></div></div>
                <div class="col-2 col-sm-2">
                  <div class="skeleton h-2 w-25 rounded float-end"></div>
                </div>
              </div>
            }
          </div>
        } @error {
          <div class="alert alert-danger py-2" role="alert">
            <i class="bi bi-exclamation-octagon me-2"></i>Failed to load the activity chart.
          </div>
        }
      </div>
    </div>
  `,
  imports: [RouterLink, ActivityChart],
})
export class Dashboard {
  private readonly count = (predicate: (t: Ticket) => boolean) =>
    MOCK_TICKETS.filter(predicate).length;

  // demo: computed() — each KPI is derived state over MOCK_TICKETS.
  protected readonly stats = computed(() => [
    {
      label: 'Open tickets',
      value: this.count((t) => t.status !== 'done'),
      icon: 'bi-inbox',
      iconClass: 'kpi-open',
    },
    {
      label: 'High priority',
      value: this.count((t) => t.priority === 'high'),
      icon: 'bi-exclamation-triangle',
      iconClass: 'kpi-high',
    },
    {
      label: 'Done',
      value: this.count((t) => t.status === 'done'),
      icon: 'bi-check2-circle',
      iconClass: 'kpi-done',
    },
    {
      label: 'Unassigned',
      value: this.count((t) => !t.assignee),
      icon: 'bi-person-dash',
      iconClass: 'kpi-unassigned',
    },
  ]);
}
