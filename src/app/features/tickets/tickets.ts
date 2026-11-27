import {
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';

import { Ticket } from '../../domain/ticket';
import { MOCK_TICKETS } from '../../domain/tickets';
import { TICKETS_API, TicketSearchService } from '../../mock/mock-http';
import { TicketFilter, TicketFilterValue } from './ticket-filter';
import { TicketStatus } from './ticket-status';

/** localStorage keys for the persisted filter state (demo: effect()). */
const SEARCH_STORAGE_KEY = 'opsboard:search';
const FILTER_STORAGE_KEY = 'opsboard:ticket-filter';

@Component({
  selector: 'app-tickets',
  imports: [TicketFilter, TicketStatus],
  template: `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-3">
        <i class="bi bi-kanban" aria-hidden="true"></i>
        <h1 class="h5 mb-0">
          Tickets
          <span class="badge text-bg-secondary rounded-pill">{{ tickets.length }} total</span>
        </h1>

        <div class="ms-auto d-flex flex-wrap align-items-center gap-2">
          <div class="position-relative">
            <label for="ticket-search" class="visually-hidden">Search tickets</label>
            <i class="bi bi-search position-absolute top-50 translate-middle-y start-0 ms-2"
               aria-hidden="true"></i>
            <!-- demo: signal() — a plain writable signal bound with [value] + (input). -->
            <input
              #searchInput
              id="ticket-search"
              type="search"
              class="form-control form-control-sm input-icon"
              placeholder="Search tickets..."
              [value]="search()"
              (input)="search.set(searchInput.value)"
            />
          </div>

          <!-- demo: model() — the filter control is bound two-way: [(filter)] syncs both ways. -->
          <app-ticket-filter [(filter)]="statusFilter" />
        </div>
      </div>

      <!--
        Task 05 — pending state: the live search GET is in flight. role="status"
        announces the change politely (aria-live="polite") for screen readers.
      -->
      @if (searchPending()) {
        <div class="list-group list-group-flush" aria-busy="true">
          <div class="list-group-item d-flex align-items-center gap-3 py-4" role="status">
            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <span class="small">
              Searching tickets… type faster and the stale request is cancelled.
            </span>
          </div>
        </div>
      } @else {
        <ul class="list-group list-group-flush">
          @for (ticket of displayedTickets(); track ticket.id) {
            @let assigned = ticket.assignee !== undefined;

            <li class="ticket-row list-group-item py-3">
              <!-- demo: output() — the row is an accessible button; clicking emits ticketSelected. -->
              <button
                type="button"
                class="ticket-select d-flex flex-wrap align-items-center gap-3"
                (click)="selectTicket(ticket)"
              >
                <span class="ticket-id text-secondary small">#{{ ticket.id }}</span>

                <span class="flex-grow-1 min-w-0">
                  <span class="d-block fw-semibold text-truncate">{{ ticket.title }}</span>
                  <span class="d-none d-md-block text-secondary small text-truncate">
                    {{ ticket.description }}
                  </span>
                </span>

                @switch (ticket.priority) {
                  @case ('high') {
                    <span class="badge bg-danger rounded-pill">high</span>
                  }
                  @case ('medium') {
                    <span class="badge bg-warning text-dark rounded-pill">medium</span>
                  }
                  @case ('low') {
                    <span class="badge bg-success rounded-pill">low</span>
                  }
                  @default never;
                }

                <app-ticket-status [status]="ticket.status" />

                @if (assigned) {
                  <span class="assignee d-flex align-items-center gap-2 min-w-0">
                    <span class="avatar" aria-hidden="true">{{ initials(ticket.assignee ?? '') }}</span>
                    <span class="small text-truncate">{{ ticket.assignee }}</span>
                  </span>
                } @else {
                  <span class="assignee text-secondary small d-flex align-items-center gap-2">
                    <i class="bi bi-person-dash" aria-hidden="true"></i>
                    Unassigned
                  </span>
                }
              </button>
            </li>
          } @empty {
            <li class="list-group-item text-center py-5">
              <i class="bi bi-inbox d-block mx-auto mb-3" style="font-size: 2.5rem"
                 aria-hidden="true"></i>
              <p class="text-secondary mb-3">
                No tickets match the current search and filter.
              </p>
              <button type="button" class="btn btn-primary btn-sm" (click)="clearFilters()">
                <i class="bi bi-x-circle me-2" aria-hidden="true"></i>Clear filters
              </button>
            </li>
          }
        </ul>
      }

      <div class="card-footer bg-transparent d-flex flex-wrap align-items-center gap-2 border-top">
        <!--
          demo: linkedSignal() — the available assignees come from the filtered data and the
          user can still pick one; if the pick is no longer valid it resets to "Anyone".
        -->
        <label for="assignee-select" class="form-label small mb-0">Show only assignee</label>
        <select
          #assigneeSelect
          id="assignee-select"
          class="form-select form-select-sm"
          style="width: auto"
          [value]="assignee()"
          (change)="assignee.set(assigneeSelect.value)"
        >
          <option value="">Anyone</option>
          @for (name of assignees(); track name) {
            <option [value]="name">{{ name }}</option>
          }
        </select>
        <span class="ms-auto text-secondary small">
          {{ displayedTickets().length }} of {{ tickets.length }} tickets
        </span>
      </div>
    </div>
  `,
})
export class Tickets {
  // demo: output() — emits whenever the user selects a ticket row.
  readonly ticketSelected = output<Ticket>();

  readonly tickets: Ticket[] = MOCK_TICKETS;

  /** Single search service for the component (CLAUDE.md: `inject()`, not constructor DI). */
  private readonly searchService = inject(TicketSearchService);

  // demo: signal() — the raw search text and the status filter are plain local state signals.
  readonly search = signal('');
  readonly statusFilter = signal<TicketFilterValue>('all');

  /**
   * Task 05 — the reactive search pipeline (each API verified in llms-full.txt):
   *
   * signal
   * → toObservable()          the query signal as an Observable (rxjs-interop)
   * → debounceTime(300)       ignore keystrokes faster than 300 ms apart
   * → distinctUntilChanged()  skip re-sends when the query did not change
   * → switchMap(...)          a real GET /api/tickets?q=…; a new query unsubscribes
   *                           — i.e. cancels — the still-in-flight request
   * → toSignal()              back into a signal for the template
   *
   * `toSignal` without an `initialValue` returns `undefined` until the first
   * emission, which is exactly what drives the pending spinner below. The `tap`
   * logging (plus the 700 ms delay in the mock interceptor) makes the debounce,
   * the new request and the cancellation of the stale one visible in the
   * browser console and DevTools → Network.
   */
  protected readonly results = toSignal(
    toObservable(this.search).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) =>
        this.searchService.search(query).pipe(
          tap({
            subscribe: () =>
              console.log(`[tickets] GET ${TICKETS_API}${query ? `?q=${query}` : ''}`),
            unsubscribe: () =>
              console.log(
                `[tickets] cancelled stale search GET ${TICKETS_API}${query ? `?q=${query}` : ''}`,
              ),
            error: (err) => console.error('[tickets] search failed', err),
          }),
        ),
      ),
    ),
  );

  /** demo: computed() — the pending state that drives the spinner. */
  protected readonly searchPending = computed(() => this.results() === undefined);

  /** demo: computed() — status filter applied to the live search results. */
  protected readonly statusFiltered = computed(() => {
    const status = this.statusFilter();
    return (this.results() ?? []).filter((ticket) => status === 'all' || ticket.status === status);
  });

  /** Assignees present in the currently filtered data — the linked signal's source. */
  protected readonly assignees = computed(() => {
    const names = this.statusFiltered()
      .map((ticket) => ticket.assignee)
      .filter((name): name is string => name !== undefined);
    return [...new Set(names)];
  });

  /**
   * demo: linkedSignal() — two-argument form (source + computation, verified in
   * llms-full.txt). The assignee filter is always valid with respect to the
   * available data: it defaults to "Anyone", the user can still pick a person,
   * and as the live search narrows the available assignees the computation
   * re-runs — keeping the user's pick while it is still present, otherwise
   * resetting to "Anyone" instead of leaving a stale selection behind.
   */
  protected readonly assignee = linkedSignal<string[], string>({
    source: this.assignees,
    computation: (names, previous) => {
      const chosen = previous?.value;
      if (chosen === undefined || chosen === '') {
        return ''; // default / user chose "Anyone" — stays "Anyone".
      }
      return names.includes(chosen) ? chosen : ''; // drop a pick that is no longer valid
    },
  });

  /** demo: computed() — the final derived list (live search + status + assignee). */
  protected readonly displayedTickets = computed(() => {
    const person = this.assignee();
    return this.statusFiltered().filter(
      (ticket) =>
        person === '' || (ticket.assignee !== undefined && ticket.assignee === person),
    );
  });

  constructor() {
    // Restore the persisted search/filter state once, before the effect runs.
    this.search.set(localStorage.getItem(SEARCH_STORAGE_KEY) ?? '');
    const restored = localStorage.getItem(FILTER_STORAGE_KEY) as TicketFilterValue | null;
    this.statusFilter.set(
      restored === 'all' || restored === 'new' || restored === 'progress' || restored === 'done'
        ? restored
        : 'all',
    );

    // demo: effect() — side effect only: mirror search/filter into localStorage on change.
    effect(() => {
      localStorage.setItem(SEARCH_STORAGE_KEY, this.search());
      localStorage.setItem(FILTER_STORAGE_KEY, this.statusFilter());
    });
  }

  /** demo: output() — emit the clicked ticket so a parent could react (detail view, etc). */
  selectTicket(ticket: Ticket): void {
    this.ticketSelected.emit(ticket);
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.assignee.set('');
  }

  /** Initials for the assignee avatar, e.g. "Marta Kowalska" -> "MK". */
  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
