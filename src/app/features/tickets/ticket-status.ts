import { Component, input } from '@angular/core';
import { Ticket } from '../../domain/ticket';

/** Reusable Bootstrap badge for a ticket's workflow status. */
@Component({
  selector: 'app-ticket-status',
  template: `
    <span class="badge rounded-pill d-inline-flex align-items-center gap-1 {{ badgeClass() }}">
      <i class="bi {{ icon() }}"></i>
      <span>{{ status() }}</span>
    </span>
  `,
})
export class TicketStatus {
  readonly status = input.required<Ticket['status']>();

  private readonly badgeClasses: Record<Ticket['status'], string> = {
    new: 'bg-info text-dark',
    progress: 'bg-primary',
    done: 'bg-success',
  };

  private readonly icons: Record<Ticket['status'], string> = {
    new: 'bi-stars',
    progress: 'bi-arrow-repeat',
    done: 'bi-check2',
  };

  badgeClass = () => this.badgeClasses[this.status()];
  icon = () => this.icons[this.status()];
}
