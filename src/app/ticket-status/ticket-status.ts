import { Component, computed, input } from '@angular/core';
import { MatChip, MatChipLeadingIcon } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { Ticket } from '../ticket';

export type TicketStatusValue = Ticket['status'];

/**
 * Small reusable chip that renders a ticket status with a matching icon.
 * Shows off `input()` plus a `computed()` that turns it into label/icon data.
 */
@Component({
  selector: 'app-ticket-status',
  imports: [MatChip, MatChipLeadingIcon, MatIcon],
  template: `
    <mat-chip>
      <mat-icon matChipLeadingIcon>{{ look().icon }}</mat-icon>
      {{ look().label }}
    </mat-chip>
  `,
  styles: `
    :host {
      display: inline-block;
    }
  `,
})
export class TicketStatus {
  readonly status = input.required<TicketStatusValue>();

  protected readonly look = computed(() => {
    const value = this.status();
    switch (value) {
      case 'new':
        return { label: 'New', icon: 'info' };
      case 'progress':
        return { label: 'In progress', icon: 'sync' };
      case 'done':
        return { label: 'Done', icon: 'check' };
    }
  });
}
