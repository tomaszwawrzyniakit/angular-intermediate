import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MOCK_TICKETS } from '../../domain/tickets';

@Component({
  selector: 'app-tickets',
  template: `
    <div class="card border-0 shadow-sm">
      <div
        class="card-header bg-transparent d-flex align-items-center justify-content-between gap-2"
      >
        <h1 class="h5 mb-0 d-flex align-items-center gap-2">
          <i class="bi bi-kanban"></i>
          Tickets
          <span class="badge text-bg-secondary rounded-pill"> {{ tickets.length }} total </span>
        </h1>
      </div>
      <div class="list-group list-group-flush">
        @for (ticket of tickets; track ticket.id) {
          <a
            class="ticket-row list-group-item list-group-item-action py-3"
            [routerLink]="['/tickets', ticket.id]"
          >
            <div class="d-flex w-100 align-items-center gap-3">
              <span class="ticket-id text-secondary small">#{{ ticket.id }}</span>
              <span class="flex-grow-1 text-truncate">{{ ticket.title }}</span>
              <span class="badge text-bg-{{ priorityColor[ticket.priority] }}">
                {{ ticket.priority }}
              </span>
              <span class="badge text-bg-{{ statusColor[ticket.status] }}">
                {{ ticket.status }}
              </span>
              <span class="assignee text-secondary small text-truncate">
                @if (ticket.assignee) {
                  <i class="bi bi-person me-1"></i>{{ ticket.assignee }}
                } @else {
                  unassigned
                }
              </span>
            </div>
          </a>
        }
      </div>
    </div>
  `,
  imports: [RouterLink],
})
export class Tickets {
  readonly tickets = MOCK_TICKETS;

  // Maps domain values to Bootstrap semantic color tokens.
  readonly priorityColor = { high: 'danger', medium: 'warning', low: 'secondary' } as const;
  readonly statusColor = { new: 'info', progress: 'primary', done: 'success' } as const;
}
