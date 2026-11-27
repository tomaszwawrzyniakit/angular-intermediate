import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ticket-detail',
  template: `<h1 class="h3">Ticket #{{ id() }}</h1>`,
})
export default class TicketDetail {
  // The `:id` route param arrives as a signal input
  // (thanks to `withComponentInputBinding()` in app.config.ts).
  // Before: inject(ActivatedRoute).paramMap.pipe(map(...)) + subscribe / toSignal.
  readonly id = input.required<string>();
}
