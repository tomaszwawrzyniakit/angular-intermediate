import { Component, model } from '@angular/core';

import { TicketStatus } from './ticket';

export type StatusFilterValue = TicketStatus | 'all';

/** Button group bound two-way by the parent: `<app-status-filter [(value)]="status" />`. */
@Component({
  selector: 'app-status-filter',
  template: `
    <div class="btn-group btn-group-sm" role="group" aria-label="Filter by status">
      @for (option of options; track option.value) {
        <button
          type="button"
          class="btn btn-outline-secondary"
          [class.active]="value() === option.value"
          [attr.aria-pressed]="value() === option.value"
          (click)="value.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class StatusFilter {
  // model() = input + output in one: writing to it notifies the parent (valueChange).
  readonly value = model<StatusFilterValue>('all');

  protected readonly options: { value: StatusFilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'progress', label: 'In progress' },
    { value: 'done', label: 'Done' },
  ];
}
