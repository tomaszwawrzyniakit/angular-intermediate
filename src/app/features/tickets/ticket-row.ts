import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Ticket } from './ticket';
import { TicketStatusBadge } from './ticket-status-badge';

/** One row of the ticket list. Presentational: data in via input(), user intent out via output(). */
@Component({
  selector: 'app-ticket-row',
  imports: [RouterLink, TicketStatusBadge],
  host: { class: 'list-group-item d-flex flex-wrap align-items-center gap-3' },
  template: `
    @let t = ticket();
    <span class="text-body-secondary small">#{{ t.id }}</span>

    <div class="flex-grow-1 overflow-hidden">
      <a class="fw-semibold text-truncate d-block" [routerLink]="['/tickets', t.id]">{{
        t.title
      }}</a>
      <small class="text-body-secondary">{{ t.assignee ?? 'Unassigned' }}</small>
    </div>

    <!-- @switch + "@default never" = exhaustive check: a new priority value is a compile error. -->
    @switch (t.priority) {
      @case ('high') {
        <span class="badge text-bg-danger">high</span>
      }
      @case ('medium') {
        <span class="badge text-bg-warning">medium</span>
      }
      @case ('low') {
        <span class="badge text-bg-secondary">low</span>
      }
      @default never;
    }

    <app-ticket-status-badge [status]="t.status" />

    @if (t.status !== 'done') {
      <button type="button" class="btn btn-sm btn-outline-primary" (click)="advance.emit(t)">
        {{ t.status === 'new' ? 'Start' : 'Resolve' }}
      </button>
    }
  `,
})
export class TicketRow {
  readonly ticket = input.required<Ticket>();
  // input() GOTCHAS:
  //  - inputs are READ-ONLY: this.ticket.set(...) does not exist. Need a local, editable copy that
  //    resets when the parent sends a new value? → draft = linkedSignal(() => this.ticket().title);
  //    Need the parent to see the change? → model() (see status-filter.ts).
  //  - reading a required input in the constructor / field initializer throws (NG0950):
  //    it is set before the first render, so read it in computed()/template/effects.
  //  - transforms for attribute-style inputs:  compact = input(false, { transform: booleanAttribute });
  //  - alias:  ticket = input.required<Ticket>({ alias: 'appTicket' });

  // The row does not change data itself: it tells the parent what the user wants.
  readonly advance = output<Ticket>();
  // output() is not an EventEmitter/Observable. Turning an Observable into an output:
  //   readonly changed = outputFromObservable(this.something$);
}
