import { Component, signal } from '@angular/core';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MOCK_TICKETS } from '../ticket';
import { TicketStatus } from '../ticket-status/ticket-status';

/**
 * The team backlog, rendered as Material cards.
 *
 * This template intentionally walks through the native control flow API:
 * @if/@else, @for/@empty, @switch/@case, @let and `track`.
 */
@Component({
  selector: 'app-tickets',
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
    <h1>Tickets</h1>
    @let count = tickets().length;
    <p>{{ count }} ticket{{ count === 1 ? '' : 's' }} in the team backlog.</p>

    @for (ticket of tickets(); track ticket.id) {
      @let priority = ticket.priority;
      <article class="ticket">
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
      </article>
    } @empty {
      <div class="empty">
        <mat-icon>inbox</mat-icon>
        <h2>No tickets found</h2>
        <p>The backlog is empty. Enjoy the quiet while it lasts.</p>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    .ticket {
      margin-bottom: 16px;
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
export class Tickets {
  protected readonly tickets = signal(MOCK_TICKETS);

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
