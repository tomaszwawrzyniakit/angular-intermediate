import { Component, input } from '@angular/core';
import { Ticket } from '../../domain/ticket';

/** Reusable Bootstrap badge for a ticket's workflow status. */
@Component({
  selector: 'app-ticket-status',
  template: `
    <span class="badge rounded-pill d-inline-flex align-items-center gap-1 {{ badgeClass() }}">
      <i class="bi {{ iconClass() }}"></i>
      <span>{{ status() }}</span>
    </span>
  `,
})
export class TicketStatus {
  // demo: input() — the status the badge represents (required signal input).
  readonly status = input.required<Ticket['status']>();

  // demo: input() — an optional icon override; when omitted, one is derived from the status.
  readonly icon = input<string>();

  private readonly badgeClasses: Record<Ticket['status'], string> = {
    new: 'bg-info text-dark',
    progress: 'bg-primary',
    done: 'bg-success',
  };

  private readonly defaultIcons: Record<Ticket['status'], string> = {
    new: 'bi-stars',
    progress: 'bi-arrow-repeat',
    done: 'bi-check2',
  };

  // demo: input() read inside the template — the optional override wins over the per-status default.
  protected badgeClass = () => this.badgeClasses[this.status()];
  protected iconClass = () => this.icon() ?? this.defaultIcons[this.status()];
}
