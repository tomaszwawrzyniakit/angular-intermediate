import { Component, computed } from '@angular/core';
import { Ticket } from '../../domain/ticket';
import { MOCK_TICKETS } from '../../domain/tickets';

/**
 * Task 10 — the dashboard's ONE activity chart.
 *
 * A hand-rolled, dependency-free bar chart: one horizontal bar per workflow
 * status, widths proportional to the ticket counts. No chart library, ~40
 * lines of template. This component is only referenced inside the dashboard's
 * `@defer` block, so the Angular compiler emits it as a separate lazy chunk
 * (visible as its own request in DevTools > Network after first render).
 */
@Component({
  selector: 'app-activity-chart',
  template: `
    <div class="activity-bars" role="img" [attr.aria-label]="chartLabel()">
      @for (bar of bars(); track bar.label) {
        <div class="row align-items-center g-2">
          <div class="col-4 col-sm-3 d-flex align-items-center gap-2 small text-secondary">
            <i class="bi {{ bar.icon }} me-1"></i>
            <span>{{ bar.label }}</span>
          </div>
          <div class="col-6 col-sm-7">
            <div class="bar-track">
              <div
                class="bar-fill rounded {{ bar.fillClass }}"
                [style.width.%]="bar.width"
                [attr.data-status]="bar.key"
              ></div>
            </div>
          </div>
          <div class="col-2 col-sm-2 text-end fw-semibold" [attr.data-status-value]="bar.key">
            {{ bar.count }}
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    // The bar's "track" (empty background) — the only non-Bootstrap rule needed.
    .bar-track {
      height: 0.85rem;
      border-radius: 0.425rem;
      background: rgba(255, 255, 255, 0.06);
    }

    .bar-fill {
      height: 100%;
      min-width: 0.4rem;
    }
  `,
})
export class ActivityChart {
  private readonly count = (status: Ticket['status']) =>
    MOCK_TICKETS.filter((t) => t.status === status).length;

  // The per-status data plus the relative bar width (percentage of the max).
  protected readonly bars = computed(() => {
    const rows = [
      { key: 'new', label: 'New', icon: 'bi-stars', fillClass: 'bar-new' },
      { key: 'progress', label: 'In progress', icon: 'bi-arrow-repeat', fillClass: 'bar-progress' },
      { key: 'done', label: 'Done', icon: 'bi-check2-circle', fillClass: 'bar-done' },
    ] as const;
    const counts = rows.map((row) => this.count(row.key));
    const max = Math.max(...counts, 1);
    return rows.map((row, i) => ({
      ...row,
      count: counts[i],
      width: Math.round((counts[i] / max) * 100),
    }));
  });

  // Accessible one-line summary of the chart for screen readers.
  protected readonly chartLabel = computed(
    () =>
      'Tickets per status: ' +
      this.bars()
        .map((bar) => `${bar.count} ${bar.label}`)
        .join(', '),
  );
}
