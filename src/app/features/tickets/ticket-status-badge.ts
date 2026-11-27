import { Component, computed, input } from '@angular/core';

import { TicketStatus } from './ticket';

const LOOK: Record<TicketStatus, { label: string; css: string; icon: string }> = {
  new: { label: 'New', css: 'text-bg-info', icon: 'bi-stars' },
  progress: { label: 'In progress', css: 'text-bg-primary', icon: 'bi-arrow-repeat' },
  done: { label: 'Done', css: 'text-bg-success', icon: 'bi-check2' },
};

/** Reusable status pill: used by the list, the detail page and the dashboard. */
@Component({
  selector: 'app-ticket-status-badge',
  template: `
    <span class="badge rounded-pill {{ look().css }}">
      <i class="bi {{ look().icon }}"></i> {{ look().label }}
    </span>
  `,
})
export class TicketStatusBadge {
  // Signal input: required, read like a signal, usable inside computed().
  readonly status = input.required<TicketStatus>();

  protected readonly look = computed(() => LOOK[this.status()]);
}
