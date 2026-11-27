import { httpResource } from '@angular/common/http';
import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Ticket } from '../../domain/ticket';
import { MOCK_TICKETS } from '../../domain/tickets';
import { AssigneePicker } from './assignee-picker';
import { TicketStatus } from './ticket-status';

/** Simulated round-trip for the plain `resource()` side-panel loader. */
const RELATED_TICKETS_LATENCY_MS = 250;

@Component({
  selector: 'app-ticket-detail',
  imports: [RouterLink, TicketStatus, AssigneePicker],
  template: `
    <nav aria-label="Breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <a [routerLink]="['/tickets']">Tickets</a>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Ticket #{{ ticketId() }}</li>
      </ol>
    </nav>

    <div class="row g-4">
      <div class="col-12 col-lg-8">
        <div class="card border-0 shadow-sm h-100">
          <!-- Loading state: httpResource.isLoading() while the GET is in flight. -->
          @if (ticket.isLoading()) {
            <div class="card-body d-flex flex-column align-items-center gap-3 py-5" role="status">
              <span class="spinner-border text-primary" aria-hidden="true"></span>
              <span class="text-secondary small">Loading ticket…</span>
            </div>
          } @else if (ticket.error() !== undefined) {
            <!-- Error state with a retry wired to httpResource.reload(). -->
            <div class="card-body text-center py-5">
              <i class="bi bi-x-octagon d-block mb-3" style="font-size: 2.5rem" aria-hidden="true"></i>
              <h2 class="h5 mb-2">Ticket #{{ ticketId() }} could not be loaded</h2>
              <p class="text-secondary small mb-3">
                {{ ticket.error()?.message }}
                <span class="d-block mt-2">
                  Try <code>/tickets/1</code> through <code>/tickets/10</code>, or retry this request.
                </span>
              </p>
              <button type="button" class="btn btn-primary btn-sm" (click)="retry()">
                <i class="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>Retry
              </button>
            </div>
          } @else {
            @let t = ticket.value();
            @if (t !== undefined) {
              <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-3">
                <i class="bi bi-ticket-detailed" aria-hidden="true"></i>
                <h1 class="h5 mb-0 flex-grow-1">Ticket #{{ t.id }}</h1>
                <app-ticket-status [status]="t.status" />
                @switch (t.priority) {
                  @case ('high') {
                    <span class="badge bg-danger rounded-pill">high priority</span>
                  }
                  @case ('medium') {
                    <span class="badge bg-warning text-dark rounded-pill">medium priority</span>
                  }
                  @case ('low') {
                    <span class="badge bg-success rounded-pill">low priority</span>
                  }
                }
              </div>

              <div class="card-body">
                <h2 class="h6 text-secondary text-uppercase small">Title</h2>
                <p class="fw-semibold mb-3">{{ t.title }}</p>

                <h2 class="h6 text-secondary text-uppercase small">Description</h2>
                <p class="text-secondary mb-3">{{ t.description }}</p>

                <h2 class="h6 text-secondary text-uppercase small">Assignee</h2>
                @if (t.assignee) {
                  <p class="mb-0 d-flex align-items-center gap-2">
                    <span class="avatar" aria-hidden="true">{{ initials(t.assignee) }}</span>
                    {{ t.assignee }}
                  </p>
                } @else {
                  <p class="mb-0 text-secondary d-flex align-items-center gap-2">
                    <i class="bi bi-person-dash" aria-hidden="true"></i>
                    Unassigned
                  </p>
                }
              </div>
            }
          }
        </div>
      </div>

      <!--
        Plain resource() example (contrast with httpResource): the same reactive
        ticketId signal drives its params, but the data comes from a hand-written
        async loader (a delayed filter over the mock data) instead of the Angular
        HTTP stack. The abort signal makes the stale load cancellable when the id
        changes — the same behaviour httpResource provides around HttpClient.
      -->
      <!-- Right rail: related tickets + the Angular Aria assignee picker. -->
      <div class="col-12 col-lg-4 d-flex flex-column gap-4">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent d-flex align-items-center gap-2">
            <i class="bi bi-diagram-3" aria-hidden="true"></i>
            <h2 class="h6 mb-0">Related open tickets</h2>
          </div>
          @if (relatedTickets.isLoading()) {
            <div class="card-body d-flex align-items-center gap-2" role="status">
              <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <span class="small text-secondary">Loading…</span>
            </div>
          } @else {
            <ul class="list-group list-group-flush">
              @for (item of relatedTickets.value() ?? []; track item.id) {
                <li class="list-group-item">
                  <a [routerLink]="['/tickets', item.id]" class="d-block text-reset small">
                    #{{ item.id }} — {{ item.title }}
                  </a>
                </li>
              } @empty {
                <li class="list-group-item text-secondary small py-3">No other open tickets.</li>
              }
            </ul>
          }
        </div>

        <!--
          Task 09 — Angular Aria: headless accessible listbox behaviour on our own
          Bootstrap markup (assignee picker). See assignee-picker.ts for the
          Material-vs-Aria contrast and the keyboard model.
        -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent d-flex align-items-center gap-2">
            <i class="bi bi-person-check" aria-hidden="true"></i>
            <h2 class="h6 mb-0">Assignee</h2>
          </div>
          <div class="card-body pt-3">
            <app-assignee-picker />
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TicketDetail {
  private readonly route = inject(ActivatedRoute);

  /**
   * Reactive route parameter. `ActivatedRoute.params` is an Observable, so it
   * goes through `toSignal` (with `initialValue` from `snapshot`) to become a
   * plain signal of the params map; `computed()` then derives just the `:id`.
   * Reading `ticketId()` inside a resource `params`/`url` function re-runs the
   * fetch whenever the parameter changes.
   */
  readonly routeParams = toSignal(this.route.params, {
    initialValue: this.route.snapshot.params,
  });

  /** The reactive `:id` param that both resources key on. */
  readonly ticketId = computed(() => this.routeParams()['id']);

  /**
   * `httpResource()` — the actual ticket lookup, verified against llms-full.txt
   * and the installed type defs: the argument is `(ctx) => string | undefined`
   * (undefined → the resource stays `idle`), and the loader options carry `parse`
   * for JSON validation. Because `ticketId` is a signal, navigating
   * `/tickets/1` → `/tickets/2` cancels the in-flight GET (its `AbortSignal`
   * fires) and starts a new one.
   *
   * A 404 from the mock surfaces on `error()` as an `HttpErrorResponse` whose
   * `message` is e.g. "Http failure response for /api/tickets/999: 404", which
   * the error branch above renders with the retry button wired to `reload()`.
   */
  readonly ticket = httpResource(
    () => (this.ticketId() !== undefined ? `/api/tickets/${this.ticketId()}` : undefined),
    {
      // `parse` receives the raw JSON body on success; validate + narrow it.
      parse: (value: unknown): Ticket => {
        if (value === null || typeof value !== 'object' || typeof (value as Ticket).id !== 'number') {
          throw new Error('Unexpected ticket response');
        }
        return value as Ticket;
      },
    },
  );

  /**
   * Plain `resource()` — contrast example. Same reactive parameter, but a
   * hand-written async `loader` over local mock data instead of the HTTP stack.
   * It demonstrates the identical `params` → `loader` → status-signal shape that
   * `httpResource` wraps around HttpClient.
   */
  readonly relatedTickets = resource({
    // Route params arrive as strings, so derive the numeric id.
    params: () => (this.ticketId() !== undefined ? Number(this.ticketId()) : undefined),
    loader: ({ params, abortSignal }) =>
      new Promise<Ticket[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          const current = MOCK_TICKETS.find((t) => t.id === params);
          const status = current?.status ?? 'new';
          resolve(MOCK_TICKETS.filter((t) => t.id !== params && t.status === status && status !== 'done'));
        }, RELATED_TICKETS_LATENCY_MS);
        abortSignal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          },
          { once: true },
        );
      }),
  });

  /** Retry button → `httpResource.reload()` re-runs the same request. */
  retry(): void {
    this.ticket.reload();
  }

  /** Initials for the assignee avatar, e.g. "Marta Kowalska" -> "MK". */
  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
