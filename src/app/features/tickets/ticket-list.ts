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

import { MOCK_TICKETS } from './mock-tickets';
import { Ticket, TicketStatus } from './ticket';
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

    <div class="list-group mb-3">
      @for (ticket of pageTickets(); track ticket.id) {
        <app-ticket-row [ticket]="ticket" (advance)="advance($event)" />
      } @empty {
        <div class="list-group-item text-center text-body-secondary py-5">
          <i class="bi bi-inbox fs-1 d-block"></i>
          No tickets match the filters.
          <button type="button" class="btn btn-link" (click)="clearFilters()">Clear filters</button>
        </div>
      }
    </div>

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

  // signal(): local, writable state. Module 2 keeps the data in the component ("local state first").
  protected readonly tickets = signal<Ticket[]>(MOCK_TICKETS);
  protected readonly query = signal('');
  protected readonly status = signal<StatusFilterValue>('all');

  // computed(): derived state. Recalculated only when query, status or tickets change.
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.status();
    return this.tickets().filter(
      (t) => (status === 'all' || t.status === status) && t.title.toLowerCase().includes(q),
    );
  });

  // linkedSignal(): writable (the user clicks a page) BUT reset to 1 whenever the filtered list
  // changes – otherwise you could stay on page 3 of a list that now has only one page.
  protected readonly page = linkedSignal({ source: this.filtered, computation: () => 1 });

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
    const status = NEXT_STATUS[ticket.status];
    this.tickets.update((list) => list.map((t) => (t.id === ticket.id ? { ...t, status } : t)));
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
