import { Component, computed, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardTitle } from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MOCK_TICKETS } from '../ticket';

@Component({
  selector: 'app-dashboard',
  imports: [MatCard, MatCardTitle, MatCardContent, MatChipSet, MatChip],
  template: `
    <h1>Dashboard</h1>

    @let total = tickets().length;
    @let open = openTickets().length;
    @let done = doneTickets().length;

    <div class="kpis">
      <mat-card>
        <mat-card-title class="kpi-label">Total</mat-card-title>
        <p class="kpi-value">{{ total }}</p>
      </mat-card>
      <mat-card>
        <mat-card-title class="kpi-label">Open</mat-card-title>
        <p class="kpi-value">{{ open }}</p>
      </mat-card>
      <mat-card>
        <mat-card-title class="kpi-label">Done</mat-card-title>
        <p class="kpi-value">{{ done }}</p>
      </mat-card>
    </div>

    <h2>Latest tickets</h2>
    <mat-card>
      <mat-card-content>
        <mat-chip-set aria-label="Sample tickets">
          @for (ticket of tickets().slice(0, 5); track ticket.id) {
            <mat-chip>{{ ticket.title }}</mat-chip>
          }
        </mat-chip-set>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    .kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .kpi-label {
      font-size: 0.875rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .kpi-value {
      font-size: 2rem;
      font-weight: 600;
      margin: 4px 0 16px;
    }

    h2 {
      margin: 32px 0 16px;
    }
  `,
})
export class Dashboard {
  protected readonly tickets = signal(MOCK_TICKETS);
  protected readonly openTickets = computed(() =>
    this.tickets().filter((t) => t.status !== 'done'),
  );
  protected readonly doneTickets = computed(() =>
    this.tickets().filter((t) => t.status === 'done'),
  );
}
