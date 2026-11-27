import { Component, model } from '@angular/core';

/** Status filter values for the ticket list: 'all' or one ticket status. */
export type TicketFilterValue = 'all' | 'new' | 'progress' | 'done';

const OPTIONS: { value: TicketFilterValue; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'bi-list-ul' },
  { value: 'new', label: 'New', icon: 'bi-stars' },
  { value: 'progress', label: 'In progress', icon: 'bi-arrow-repeat' },
  { value: 'done', label: 'Done', icon: 'bi-check2' },
];

/**
 * Reusable ticket status filter — a Bootstrap button group bound two-way
 * with the `[(filter)]` model syntax.
 */
@Component({
  selector: 'app-ticket-filter',
  template: `
    <div class="btn-group btn-group-sm" role="group" aria-label="Filter tickets by status">
      @for (option of options; track option.value) {
        <button
          type="button"
          class="btn btn-outline-secondary"
          [class.active]="filter() === option.value"
          [attr.aria-pressed]="filter() === option.value"
          (click)="filter.set(option.value)"
        >
          <i class="bi {{ option.icon }} me-1" aria-hidden="true"></i>
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class TicketFilter {
  // demo: model() — two-way value: the parent binds it with [(filter)] and the
  // component writes new values back on button clicks (the implicit filterChange
  // output does the rest).
  readonly filter = model<TicketFilterValue>('all');

  protected readonly options = OPTIONS;
}
