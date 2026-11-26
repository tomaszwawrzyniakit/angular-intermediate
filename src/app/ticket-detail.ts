import { Component, computed, inject } from '@angular/core';
import { resource } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipLeadingIcon } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MOCK_TICKETS, Ticket } from './ticket';
import { TicketStatus } from './ticket-status/ticket-status';

/**
 * The ticket detail page for `/tickets/:id`.
 *
 * It demonstrates the two Resource APIs of Angular 22 side by side:
 *
 *  - `httpResource()` — the real ticket lookup. It issues a genuine HTTP GET
 *    through the HttpClient stack, so the request shows up in the browser
 *    Network tab. The request URL is a *reactive* function of the route param:
 *    change `:id` and Angular aborts the in-flight request and issues a new
 *    one (request cancellation).
 *
 *  - `resource()`      — a small, hand-written async loader for the "Related"
 *    section. It `chain`s off the httpResource, so it only runs once the ticket
 *    has loaded and it inherits the ticket's loading/error state.
 *
 * The page reads the resource status as signals: `.value()`, `.isLoading()`,
 * `.error()`, `.status()`, and drives a retry through `.reload()`.
 */
@Component({
  selector: 'app-ticket-detail',
  imports: [
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatCardHeader,
    MatCardContent,
    MatButton,
    MatChip,
    MatChipLeadingIcon,
    MatIcon,
    MatSpinner,
    RouterLink,
    TicketStatus,
  ],
  template: `
    <button mat-button color="primary" (click)="goBack()">
      <mat-icon>arrow_back</mat-icon>
      Back to tickets
    </button>

    <h1>
      Ticket <span class="id">#{{ ticketId() }}</span>
    </h1>

    @if (ticket.isLoading()) {
      <div class="pending" role="status" aria-busy="true">
        <mat-spinner diameter="48" aria-label="Loading ticket"></mat-spinner>
        <p>Loading ticket…</p>
      </div>
    } @else if (ticket.error()) {
      <mat-card class="state-card error">
        <mat-icon class="state-icon">error_outline</mat-icon>
        <div>
          <h2>Could not load ticket #{{ ticketId() }}</h2>
          <p>The ticket could not be fetched. Try again.</p>
        </div>
        <button mat-raised-button color="primary" (click)="reload()">
          <mat-icon>refresh</mat-icon>
          Retry
        </button>
      </mat-card>
    } @else {
      @let t = ticket.value();
      @if (t) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ t.title }}</mat-card-title>
            <mat-card-subtitle>Ticket #{{ t.id }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p class="description">{{ t.description }}</p>
            <div class="fields">
              <span class="label">Status</span>
              <span class="value"><app-ticket-status [status]="t.status" /></span>

              <span class="label">Priority</span>
              <span class="value">
                <mat-chip>
                  <mat-icon matChipLeadingIcon>{{ priorityIcon(t.priority) }}</mat-icon>
                  {{ priorityLabel(t.priority) }}
                </mat-chip>
              </span>

              <span class="label">Assignee</span>
              <span class="value">
                @if (t.assignee) {
                  <mat-chip>
                    <mat-icon matChipLeadingIcon>person</mat-icon>
                    {{ t.assignee }}
                  </mat-chip>
                } @else {
                  <mat-chip>
                    <mat-icon matChipLeadingIcon>person_outline</mat-icon>
                    Unassigned
                  </mat-chip>
                }
              </span>
            </div>
          </mat-card-content>
        </mat-card>

        <section class="related" aria-labelledby="related-heading">
          <h2 id="related-heading">Related open tickets</h2>
          @if (relatedTickets.isLoading()) {
            <div class="related-pending" role="status" aria-busy="true">
              <mat-spinner diameter="20" aria-label="Loading related tickets"></mat-spinner>
              Loading related tickets…
            </div>
          } @else {
            @let related = relatedTickets.value();
            @if (related?.length) {
              <ul class="related-list">
                @for (item of related; track item.id) {
                  <li>
                    <a [routerLink]="['/tickets', item.id]">{{ item.title }}</a>
                    <span class="related-meta">{{ priorityLabel(item.priority) }} priority</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="related-empty">No other open tickets.</p>
            }
          }
        </section>
      } @else {
        <mat-card><mat-card-content>This ticket has no data.</mat-card-content></mat-card>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    h1 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.5rem;
      margin: 8px 0 16px;
    }

    .id {
      color: var(--mat-sys-on-surface-variant);
      font-weight: 400;
    }

    /* A centered, accessible pending state while the request is in flight. */
    .pending {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
      p {
        margin: 0;
      }
    }

    .state-card {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;

      &.error {
        background-color: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error);

        h2 {
          color: inherit;
          font-size: 1rem;
          margin: 0;
        }
        p {
          margin: 4px 0 0;
        }
      }

      .state-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }

    .description {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
      margin: 0 0 16px;
    }

    /* Label / value rows for the ticket fields. */
    .fields {
      display: grid;
      grid-template-columns: 120px 1fr;
      row-gap: 12px;
    }

    .label {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }

    .related {
      margin-top: 24px;
      h2 {
        font-size: 1.1rem;
        margin: 0 0 12px;
      }
    }

    .related-pending {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }

    .related-list {
      list-style: none;
      margin: 0;
      padding: 0;

      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 4px;
        border-bottom: 1px solid var(--mat-sys-outline-variant);

        a {
          color: var(--mat-sys-primary);
          font: var(--mat-sys-body-medium);
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }

          &:focus-visible {
            outline: 2px solid var(--mat-sys-primary);
            outline-offset: 2px;
          }
        }

        .related-meta {
          color: var(--mat-sys-on-surface-variant);
          font: var(--mat-sys-label-large);
        }
      }
    }

    .related-empty {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
      margin: 0;
    }
  `,
})
export class TicketDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // The route param, bridged into a signal. `params` is a BehaviorSubject, so
  // it emits synchronously on subscribe and `requireSync` is safe.
  protected readonly routeParams = toSignal(this.route.params, { requireSync: true });

  // The current :id as a string (for the heading / error text).
  protected readonly ticketId = computed(() => String(this.routeParams()['id']));

  // httpResource(): the ticket, fetched for the current :id. The request URL is
  // a reactive function of the route param signal — change :id and the
  // in-flight request is aborted and a new one is issued automatically.
  protected readonly ticket = httpResource<Ticket>(() => `/tickets/${this.routeParams()['id']}`);

  // A small plain resource() chained off the ticket resource. It resolves the
  // related open tickets only once the ticket has loaded (via `chain`) and
  // inherits the ticket's loading/error state.
  protected readonly relatedTickets = resource({
    params: ({ chain }) => chain(this.ticket)?.id,
    loader: ({ params }) => this.loadRelated(params),
  });

  protected reload(): void {
    this.ticket.reload();
  }

  protected goBack(): void {
    this.router.navigate(['/tickets']);
  }

  protected priorityLabel(priority: Ticket['priority']): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  protected priorityIcon(priority: Ticket['priority']): string {
    switch (priority) {
      case 'high':
        return 'priority_high';
      case 'medium':
        return 'report_problem';
      case 'low':
        return 'remove_circle_outline';
    }
  }

  // A tiny mock async lookup — the teaching point is resource()'s loader shape
  // (a Promise for the value), not real data access.
  private loadRelated(id: number): Promise<Ticket[]> {
    const related = MOCK_TICKETS.filter((t) => t.id !== id && t.status !== 'done').slice(0, 4);
    return new Promise((resolve) => setTimeout(() => resolve(related), 400));
  }
}
