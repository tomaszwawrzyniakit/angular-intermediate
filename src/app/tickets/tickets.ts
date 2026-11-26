import { Component, signal } from '@angular/core';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MOCK_TICKETS } from '../ticket';

@Component({
  selector: 'app-tickets',
  imports: [
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatCardHeader,
    MatCardContent,
    MatChipSet,
    MatChip,
  ],
  template: `
    <h1>Tickets</h1>
    <p>A read-only preview of the team backlog. Filtering and details come later.</p>

    <div class="tickets">
      @for (ticket of tickets(); track ticket.id) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ ticket.title }}</mat-card-title>
            @if (ticket.assignee) {
              <mat-card-subtitle>{{ ticket.assignee }}</mat-card-subtitle>
            }
          </mat-card-header>
          <mat-card-content>
            <p>{{ ticket.description }}</p>
            <mat-chip-set aria-label="Ticket metadata">
              <mat-chip>{{ ticket.status }}</mat-chip>
              <mat-chip>{{ ticket.priority }}</mat-chip>
            </mat-chip-set>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    .tickets {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
  `,
})
export class Tickets {
  protected readonly tickets = signal(MOCK_TICKETS);
}
