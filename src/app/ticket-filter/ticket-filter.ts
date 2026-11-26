import { Component, model } from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { TicketStatusFilter } from '../ticket';

/**
 * Reusable status filter built from a Material button-toggle group.
 *
 * // demo: model() gives this control a two-way property — the parent binds
 * // with [(filter)] and never wires an output() by hand.
 */
@Component({
  selector: 'app-ticket-filter',
  imports: [MatButtonToggleGroup, MatButtonToggle],
  template: `
    <mat-button-toggle-group
      aria-label="Filter tickets by status"
      [value]="filter()"
      (valueChange)="filter.set($event)"
    >
      <mat-button-toggle value="all">All</mat-button-toggle>
      <mat-button-toggle value="new">New</mat-button-toggle>
      <mat-button-toggle value="progress">In progress</mat-button-toggle>
      <mat-button-toggle value="done">Done</mat-button-toggle>
    </mat-button-toggle-group>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class TicketFilter {
  // // demo: model() — a two-way binding point. Reading it is a signal;
  // // .set() writes back through the parent's [(filter)] binding.
  readonly filter = model<TicketStatusFilter>('all');
}
