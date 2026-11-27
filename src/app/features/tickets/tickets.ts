import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ticket } from '../../domain/ticket';
import { MOCK_TICKETS } from '../../domain/tickets';
import { TicketStatus } from './ticket-status';

@Component({
  selector: 'app-tickets',
  imports: [RouterLink, TicketStatus],
  template: `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-transparent d-flex align-items-center gap-2">
        <i class="bi bi-kanban" aria-hidden="true"></i>
        <h1 class="h5 mb-0">
          Tickets
          <span class="badge text-bg-secondary rounded-pill">{{ tickets.length }} total</span>
        </h1>
      </div>

      <ul class="list-group list-group-flush">
        @for (ticket of tickets; track ticket.id) {
          @let assigned = ticket.assignee !== undefined;

          <li class="ticket-row list-group-item list-group-item-action py-3">
            <a
              class="d-flex flex-wrap align-items-center gap-3 text-decoration-none"
              [routerLink]="['/tickets', ticket.id]"
            >
              <span class="ticket-id text-secondary small">#{{ ticket.id }}</span>

              <div class="flex-grow-1 min-w-0">
                <div class="fw-semibold text-truncate">{{ ticket.title }}</div>
                <div class="text-secondary small text-truncate d-none d-md-block">
                  {{ ticket.description }}
                </div>
              </div>

              @switch (ticket.priority) {
                @case ('high') {
                  <span class="badge bg-danger rounded-pill">high</span>
                }
                @case ('medium') {
                  <span class="badge bg-warning text-dark rounded-pill">medium</span>
                }
                @case ('low') {
                  <span class="badge bg-success rounded-pill">low</span>
                }
                @default never;
              }

              <app-ticket-status [status]="ticket.status" />

              @if (assigned) {
                <span class="assignee d-flex align-items-center gap-2 min-w-0">
                  <span class="avatar" aria-hidden="true">{{
                    initials(ticket.assignee ?? '')
                  }}</span>
                  <span class="small text-truncate">{{ ticket.assignee }}</span>
                </span>
              } @else {
                <span class="assignee text-secondary small d-flex align-items-center gap-2">
                  <i class="bi bi-person-dash" aria-hidden="true"></i>
                  Unassigned
                </span>
              }
            </a>
          </li>
        } @empty {
          <li class="list-group-item text-center py-5">
            <i
              class="bi bi-inbox d-block mx-auto mb-3"
              style="font-size: 2.5rem"
              aria-hidden="true"
            ></i>
            <p class="text-secondary mb-3">No tickets yet. Create the first one to get started.</p>
            <a class="btn btn-primary btn-sm" [routerLink]="['/tickets/new']">
              <i class="bi bi-plus-circle me-2" aria-hidden="true"></i>New ticket
            </a>
          </li>
        }
      </ul>
    </div>
  `,
})
export class Tickets {
  readonly tickets: Ticket[] = MOCK_TICKETS;

  /** Initials for the assignee avatar, e.g. "Marta Kowalska" -> "MK". */
  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
