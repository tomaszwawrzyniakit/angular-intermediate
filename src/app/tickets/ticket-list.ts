import { Component, input, output } from '@angular/core';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { Ticket } from '../ticket';
import { TicketStatus } from '../ticket-status/ticket-status';

/**
 * A dumb, presentational list of tickets.
 *
 * // demo: input() feeds the data in; output() reports a row click back to
 * // the parent (which highlights the selection and will navigate later).
 *
 * The template also walks the native control flow API: @if/@else, @for/@empty,
 * @switch/@case, @let and `track`.
 */
@Component({
  selector: 'app-ticket-list',
  imports: [
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatCardHeader,
    MatCardContent,
    MatIcon,
    TicketStatus,
  ],
  template: `
    @for (ticket of tickets(); track ticket.id) {
      @let priority = ticket.priority;
      <button
        type="button"
        class="ticket"
        [class.selected]="selectedId() === ticket.id"
        (click)="select(ticket)"
        aria-label="Select ticket: {{ ticket.title }}"
      >
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ ticket.title }}</mat-card-title>
            @if (ticket.assignee) {
              <mat-card-subtitle>{{ ticket.assignee }}</mat-card-subtitle>
            }
          </mat-card-header>
          <mat-card-content>
            <p class="description">{{ ticket.description }}</p>
            <div class="meta">
              <app-ticket-status [status]="ticket.status" />
              @switch (priority) {
                @case ('high') {
                  <span class="priority priority--high"
                    ><mat-icon>priority_high</mat-icon>High priority</span
                  >
                }
                @case ('medium') {
                  <span class="priority priority--medium"
                    ><mat-icon>report_problem</mat-icon>Medium priority</span
                  >
                }
                @case ('low') {
                  <span class="priority priority--low"
                    ><mat-icon>remove_circle_outline</mat-icon>Low priority</span
                  >
                }
              }
            </div>
            @if (ticket.assignee) {
              @let name = ticket.assignee;
              <span class="assignee">
                <span class="avatar" aria-hidden="true">{{ initials(name) }}</span>
                <span>{{ name }}</span>
              </span>
            } @else {
              <span class="assignee unassigned">
                <mat-icon>person_outline</mat-icon>
                Unassigned
              </span>
            }
          </mat-card-content>
        </mat-card>
      </button>
    } @empty {
      <div class="empty">
        <mat-icon>inbox</mat-icon>
        <h2>No tickets found</h2>
        <p>Try clearing the search or picking a different status filter.</p>
      </div>
    }
  `,
  styles: `
    .ticket {
      display: block;
      width: 100%;
      margin: 0 0 16px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      border-radius: var(--mat-sys-corner-large);
    }

    /* Keyboard focus lands on the button; the card stays purely presentational. */
    .ticket:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }

    /* Selected row: a visible ring driven by the parent's [selectedId]. */
    .ticket.selected {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }

    mat-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .description {
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 16px;
      font: var(--mat-sys-body-medium);
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .priority {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px 4px 8px;
      border-radius: 999px;
      font: var(--mat-sys-label-large);
      font-weight: 500;
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .priority--high {
      color: var(--mat-sys-on-error);
      background-color: var(--mat-sys-error-container);
    }

    .priority--medium {
      color: var(--mat-sys-on-tertiary);
      background-color: var(--mat-sys-tertiary-container);
    }

    .priority--low {
      color: var(--mat-sys-on-primary);
      background-color: var(--mat-sys-primary-container);
    }

    .assignee {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font: var(--mat-sys-label-large);
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .unassigned {
      color: var(--mat-sys-on-surface-variant);
    }

    .avatar {
      display: inline-grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 48px 0;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }
    }
  `,
})
export class TicketList {
  // // demo: input() — the list is fed its tickets by the parent as a signal.
  // (Public: inputs are bound from the *parent's* template.)
  readonly tickets = input.required<Ticket[]>();
  // The id the parent has highlighted, so the row can draw its selection ring.
  readonly selectedId = input<number | null>(null);

  // // demo: output() — a row click emits the ticket back to the parent.
  readonly ticketSelected = output<Ticket>();

  protected select(ticket: Ticket): void {
    this.ticketSelected.emit(ticket);
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
