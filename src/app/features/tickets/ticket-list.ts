import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  Injector,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';

import { Ticket, TicketStatus } from './ticket';
import { TicketStore } from './ticket-store';
import { TicketRow } from './ticket-row';
import { StatusFilter, StatusFilterValue } from './status-filter';

const PAGE_SIZE = 5;
const STORAGE_KEY = 'opsboard.ticket-filters';
const NEXT_STATUS: Record<TicketStatus, TicketStatus> = {
  new: 'progress',
  progress: 'done',
  done: 'done',
};

@Component({
  selector: 'app-ticket-list',
  imports: [TicketRow, StatusFilter],
  host: { '(document:keydown)': 'focusSearchOnSlash($event)' },
  template: `
    <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
      <h1 class="h3 mb-0 me-auto">Tickets</h1>
      <input
        #search
        type="search"
        class="form-control form-control-sm w-auto"
        placeholder="Filter…  (press /)"
        aria-label="Filter tickets"
        [value]="query()"
        (input)="query.set(search.value)"
      />
      <app-status-filter [(value)]="status" />
    </div>

    @if (store.error()) {
      <div class="alert alert-danger d-flex align-items-center gap-3" role="alert">
        <i class="bi bi-exclamation-octagon"></i> Could not load tickets.
        <button
          type="button"
          class="btn btn-sm btn-outline-danger ms-auto"
          (click)="store.reload()"
        >
          Retry
        </button>
      </div>
    } @else if (store.loading()) {
      <div class="list-group mb-3 placeholder-glow" aria-busy="true">
        @for (i of [1, 2, 3, 4, 5]; track i) {
          <div class="list-group-item"><span class="placeholder col-8"></span></div>
        }
      </div>
    } @else {
      <!-- @for GOTCHA: track by a stable id. "track $index" re-uses DOM rows by position, so after
           sorting/removing, focus and component state stay on the wrong row; "track ticket"
           re-creates every row after each re-fetch (new objects). -->
      <div class="list-group mb-3">
        @for (ticket of pageTickets(); track ticket.id) {
          <app-ticket-row [ticket]="ticket" (advance)="advance($event)" />
        } @empty {
          <div class="list-group-item text-center text-body-secondary py-5">
            <i class="bi bi-inbox fs-1 d-block"></i>
            No tickets match the filters.
            <button type="button" class="btn btn-link" (click)="clearFilters()">
              Clear filters
            </button>
          </div>
        }
      </div>
    }

    @if (pageCount() > 1) {
      <nav aria-label="Ticket pages">
        <ul class="pagination pagination-sm">
          @for (p of pages(); track p) {
            <li class="page-item" [class.active]="p === page()">
              <button type="button" class="page-link" (click)="page.set(p)">{{ p }}</button>
            </li>
          }
        </ul>
      </nav>
    }
  `,
})
export default class TicketList {
  private readonly injector = inject(Injector);

  // Shared data comes from the store (module 6); filters and paging stay local UI state.
  protected readonly store = inject(TicketStore);

  // signal(): local UI state ("local state first").
  protected readonly query = signal('');
  protected readonly status = signal<StatusFilterValue>('all');

  // computed(): derived state. Recalculated only when query, status or tickets change.
  // GOTCHAS:
  //  - dependencies are tracked dynamically: a signal read only inside an `if` branch that did not
  //    run is NOT a dependency (until the branch runs);
  //  - computed() must be pure – no set(), no HTTP; a signal write inside throws (NG0600);
  //  - the result is compared with Object.is: return a new array/object to notify readers.
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.status();
    return this.store
      .tickets()
      .filter(
        (t) => (status === 'all' || t.status === status) && t.title.toLowerCase().includes(q),
      );
  });

  // linkedSignal(): writable (the user clicks a page) BUT reset to 1 when the FILTERS change –
  // otherwise you could stay on page 3 of a list that now has only one page.
  //
  // GOTCHA – choose the source carefully. With `source: this.filtered` the page jumped back to 1
  // every time ANY ticket changed (clicking "Start" on page 2 creates a new array → new source).
  // The source is "what should reset me", here only the filter criteria:
  protected readonly page = linkedSignal({
    source: () => ({ query: this.query(), status: this.status() }),
    computation: () => 1,
  });
  // Shorthand form – same thing, the dependencies are whatever the function reads:
  //   page = linkedSignal(() => { this.query(); this.status(); return 1; });
  // With `previous` you can keep the user's choice when it is still valid:
  //   computation: (src, previous) => Math.min(previous?.value ?? 1, pageCountFor(src)),

  protected readonly pageCount = computed(() => Math.ceil(this.filtered().length / PAGE_SIZE));
  protected readonly pages = computed(() =>
    Array.from({ length: this.pageCount() }, (_, i) => i + 1),
  );
  protected readonly pageTickets = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  // viewChild(): signal query for an element of our own template.
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('search');

  constructor() {
    // localStorage exists only in the browser. afterNextRender() never runs on the server and runs
    // after hydration, so the server HTML and the first client render stay identical.
    //
    // WRONG (hydration mismatch, try it live):
    //   query = signal(isPlatformBrowser(inject(PLATFORM_ID)) ? localStorage.getItem(...) : '');
    // The server renders all tickets, the browser's first render shows only the filtered ones →
    // the DOM differs → NG0500 errors in the console / "mismatch" in Angular DevTools.
    afterNextRender(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      this.query.set(saved.query ?? '');
      this.status.set(saved.status ?? 'all');

      // effect(): a SIDE EFFECT (sync to the outside world), never to derive state.
      effect(
        () =>
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ query: this.query(), status: this.status() }),
          ),
        { injector: this.injector },
      );
    });

    // effect() GOTCHAS:
    //  - WRONG: deriving state with an effect (extra render, glitches, loops):
    //      effect(() => this.filtered.set(this.tickets().filter(...)));   → use computed()
    //  - Every signal read inside is a dependency. Read without tracking with untracked():
    //      effect(() => log(this.query(), untracked(() => this.status())));  // re-runs on query only
    //  - Effects run asynchronously (during change detection), not right after set().
    //  - Need the DOM after render (measure, 3rd-party chart, focus)? afterRenderEffect():
    //      afterRenderEffect(() => chart.update(this.filtered()));
  }

  /** GitHub-style shortcut: "/" focuses the filter box. */
  protected focusSearchOnSlash(event: KeyboardEvent): void {
    const typing =
      event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (event.key === '/' && !typing) {
      event.preventDefault();
      this.searchInput().nativeElement.focus();
    }
  }

  protected advance(ticket: Ticket): void {
    this.store.update(ticket.id, { status: NEXT_STATUS[ticket.status] });
  }

  protected clearFilters(): void {
    this.query.set('');
    this.status.set('all');
  }
}

// Other signal queries, for reference:
//   items = viewChildren(TicketRow);                  // Signal<readonly TicketRow[]>
//   header = contentChild(CardHeader);                // projected <ng-content>, in a wrapper component
//   tabs = contentChildren(Tab, { descendants: true });
