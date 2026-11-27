import { Component, computed, input } from '@angular/core';

import { Ticket } from '../tickets/ticket';

/** Tickets per status as Bootstrap progress bars. Loaded lazily by the dashboard's @defer block. */
@Component({
  selector: 'app-status-chart',
  template: `
    @for (bar of bars(); track bar.label) {
      <div class="d-flex align-items-center gap-3 mb-2">
        <span class="small text-body-secondary w-25">{{ bar.label }}</span>
        <div
          class="progress flex-grow-1"
          role="progressbar"
          [attr.aria-label]="bar.label"
          [attr.aria-valuenow]="bar.count"
          aria-valuemin="0"
          [attr.aria-valuemax]="tickets().length"
        >
          <div class="progress-bar {{ bar.css }}" [style.width.%]="bar.percent"></div>
        </div>
        <span class="fw-semibold">{{ bar.count }}</span>
      </div>
    }
  `,
})
export class StatusChart {
  readonly tickets = input.required<Ticket[]>();

  protected readonly bars = computed(() => {
    const all = this.tickets();
    const count = (status: Ticket['status']) => all.filter((t) => t.status === status).length;
    return [
      { label: 'New', count: count('new'), css: 'bg-info' },
      { label: 'In progress', count: count('progress'), css: 'bg-primary' },
      { label: 'Done', count: count('done'), css: 'bg-success' },
    ].map((bar) => ({ ...bar, percent: all.length ? (bar.count / all.length) * 100 : 0 }));
  });
}
