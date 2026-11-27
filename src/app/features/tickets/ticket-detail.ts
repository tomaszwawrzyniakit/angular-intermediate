import { httpResource } from '@angular/common/http';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Ticket } from './ticket';
import { TicketStatusBadge } from './ticket-status-badge';

@Component({
  selector: 'app-ticket-detail',
  imports: [RouterLink, TicketStatusBadge],
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
