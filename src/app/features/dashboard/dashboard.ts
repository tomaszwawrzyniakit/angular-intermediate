import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ticket } from '../../domain/ticket';
import { MOCK_TICKETS } from '../../domain/tickets';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="row g-4 mb-4">
      @for (stat of stats(); track stat.label) {
        <div class="col-6 col-xl-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="kpi-icon d-flex align-items-center justify-content-center rounded-circle">
                <i class="bi {{ stat.icon }} fs-4"></i>
              </div>
              <div>
                <div class="kpi-value">{{ stat.value }}</div>
                <div class="text-secondary small">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-header bg-transparent d-flex align-items-center gap-2">
        <i class="bi bi-list-columns me-1"></i>
        <h1 class="h5 mb-0">Ops overview</h1>
      </div>
      <div class="card-body">
        <p class="text-secondary mb-3">
          OpsBoard tracks live operational and IT tickets across the team. The dashboard, the full
          ticket list and the new-ticket form are being built in the following training tasks.
        </p>
        <a class="btn btn-primary btn-sm" [routerLink]="['/tickets']">
          <i class="bi bi-grid-1x2 me-2"></i>Open ticket list
        </a>
      </div>
    </div>
  `,
  imports: [RouterLink],
})
export class Dashboard {
  private readonly count = (predicate: (t: Ticket) => boolean) =>
    MOCK_TICKETS.filter(predicate).length;

  stats() {
    return [
      { label: 'Open tickets', value: this.count((t) => t.status !== 'done'), icon: 'bi-inbox' },
      {
        label: 'High priority',
        value: this.count((t) => t.priority === 'high'),
        icon: 'bi-exclamation-triangle',
      },
      { label: 'Done', value: this.count((t) => t.status === 'done'), icon: 'bi-check2-circle' },
      { label: 'Unassigned', value: this.count((t) => !t.assignee), icon: 'bi-person-dash' },
    ];
  }
}
