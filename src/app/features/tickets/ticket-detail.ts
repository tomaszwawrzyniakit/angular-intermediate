import { httpResource } from '@angular/common/http';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AssigneePicker } from './assignee-picker';
import { Ticket } from './ticket';
import { TicketStore } from './ticket-store';
import { TicketStatusBadge } from './ticket-status-badge';

@Component({
  selector: 'app-ticket-detail',
  imports: [RouterLink, TicketStatusBadge, AssigneePicker],
  template: `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a routerLink="/tickets">Tickets</a></li>
        <li class="breadcrumb-item active" aria-current="page">#{{ id() }}</li>
      </ol>
    </nav>

    @if (ticket.error(); as error) {
      <div class="alert alert-danger" role="alert">
        <h1 class="h5">Ticket #{{ id() }} could not be loaded</h1>
        <p class="mb-2">{{ error.message }}</p>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="ticket.reload()">
          Retry
        </button>
      </div>
    } @else if (ticket.hasValue()) {
      @let t = ticket.value();
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header d-flex align-items-center gap-2">
              <h1 class="h5 mb-0 me-auto">{{ t.title }}</h1>
              <app-ticket-status-badge [status]="t.status" />
            </div>
            <div class="card-body">
              <p>{{ t.description }}</p>
              <dl class="row mb-0">
                <dt class="col-sm-3">Priority</dt>
                <dd class="col-sm-9">{{ t.priority }}</dd>
                <dt class="col-sm-3">Assignee</dt>
                <dd class="col-sm-9">{{ t.assignee ?? 'Unassigned' }}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <h2 class="h6">Assign to</h2>
          <app-assignee-picker [assignee]="t.assignee" (assigneeChange)="assign($event)" />
          <p class="form-text">Keyboard: ↑/↓ to move, Enter to assign, type a letter to jump.</p>
        </div>
      </div>
    } @else {
      <div class="card placeholder-glow" aria-busy="true">
        <div class="card-body">
          <span class="placeholder col-6 mb-3"></span>
          <span class="placeholder col-12"></span>
          <span class="placeholder col-10"></span>
        </div>
      </div>
    }
  `,
})
export default class TicketDetail {
  // The `:id` route param as a signal input (withComponentInputBinding() in app.config.ts).
  readonly id = input.required<string>();

  // Reactive request: when id() changes (e.g. a link from the quick search), the old request is
  // aborted and a new one starts. 404/500 → error(); reload() repeats the same request.
  protected readonly ticket = httpResource<Ticket>(() => `/api/tickets/${this.id()}`);

  private readonly store = inject(TicketStore);

  protected assign(assignee: string | undefined): void {
    // A resource's value is a WritableSignal: update this page at once…
    this.ticket.value.update((t) => t && { ...t, assignee });
    // …and let the store save it and keep the shared list in sync.
    this.store.update(Number(this.id()), { assignee });
  }
}

// The same "resource pattern" without HttpClient, for reference:
//
//   readonly ticket = resource({
//     params: () => ({ id: this.id() }),          // reactive params; undefined = idle
//     loader: ({ params, abortSignal }) =>
//       fetch(`/api/tickets/${params.id}`, { signal: abortSignal }).then((r) => r.json()),
//   });
//
// With an Observable-based loader: rxResource({ params, stream: ({ params }) => http.get(...) })
//
// Resource GOTCHAS:
//  - Resources are for READING. Saving (POST/PATCH/DELETE) is a command: HttpClient, not a resource.
//  - value() THROWS in the error state → check error()/hasValue() first (see ticket-store.ts).
//  - Return undefined from the request/params function → the resource stays idle (no request):
//      httpResource(() => this.id() ? `/api/tickets/${this.id()}` : undefined)
//  - isLoading() is also true during reload(); the old value stays visible meanwhile
//    (status() === 'reloading') – good for "refresh without a blank screen".
//  - Validate the response shape: httpResource(url, { parse: (raw) => TicketSchema.parse(raw) }).
