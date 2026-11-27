import { httpResource } from '@angular/common/http';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Ticket } from '../tickets/ticket';
import { StatusChart } from './status-chart';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatusChart],
  template: `
    <h1 class="h3 mb-4">Operations overview</h1>

    <div class="row g-3 mb-4">
      @for (kpi of kpis(); track kpi.label) {
        <div class="col-6 col-lg-3">
          <div class="card h-100">
            <div class="card-body">
              <div class="text-body-secondary small">
                <i class="bi {{ kpi.icon }}"></i> {{ kpi.label }}
              </div>
              <div class="fs-2 fw-semibold {{ kpi.css }}">
                {{ tickets.hasValue() ? kpi.value : '–' }}
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header">Needs an owner (high priority)</div>
          <div class="list-group list-group-flush">
            @for (t of unassignedHigh(); track t.id) {
              <a class="list-group-item list-group-item-action" [routerLink]="['/tickets', t.id]">
                #{{ t.id }} {{ t.title }}
              </a>
            } @empty {
              <!-- Empty state: say why it is empty, and make it a good thing -->
              <div class="list-group-item text-success">
                <i class="bi bi-check2-circle"></i> Every high-priority ticket has an owner.
              </div>
            }
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header">Tickets by status</div>
          <div class="card-body">
            <!--
              @defer: StatusChart goes into its own lazy JS chunk (see DevTools → Network).
              on viewport  – load when the block scrolls into view
              hydrate on viewport – with SSR the chart HTML is rendered on the server,
                                    but its JS is downloaded and hydrated only when visible
            -->
            @defer (on viewport; hydrate on viewport) {
              <app-status-chart [tickets]="tickets.value()" />
            } @placeholder (minimum 300ms) {
              <div class="placeholder-glow">
                <span class="placeholder col-12 mb-2"></span>
                <span class="placeholder col-12 mb-2"></span>
                <span class="placeholder col-12"></span>
              </div>
            } @loading (after 100ms; minimum 300ms) {
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading chart</span>
              </div>
            } @error {
              <div class="alert alert-warning mb-0">The chart could not be loaded.</div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Other @defer triggers, for reference:
         @defer (on interaction(button))  – e.g. a "Show history" panel
         @defer (on hover; prefetch on idle)  – download early, render later
         @defer (when showAdvanced())  – any signal/boolean condition -->
  `,
})
export default class Dashboard {
  protected readonly tickets = httpResource<Ticket[]>(() => '/api/tickets', { defaultValue: [] });

  protected readonly unassignedHigh = computed(() =>
    this.tickets.value().filter((t) => t.priority === 'high' && !t.assignee && t.status !== 'done'),
  );

  protected readonly kpis = computed(() => {
    const all = this.tickets.value();
    return [
      {
        label: 'Open',
        icon: 'bi-inbox',
        css: '',
        value: all.filter((t) => t.status !== 'done').length,
      },
      {
        label: 'High priority',
        icon: 'bi-exclamation-triangle',
        css: 'text-danger',
        value: all.filter((t) => t.priority === 'high').length,
      },
      {
        label: 'Done',
        icon: 'bi-check2-circle',
        css: 'text-success',
        value: all.filter((t) => t.status === 'done').length,
      },
      {
        label: 'Unassigned',
        icon: 'bi-person-dash',
        css: 'text-warning',
        value: all.filter((t) => !t.assignee).length,
      },
    ];
  });
}
