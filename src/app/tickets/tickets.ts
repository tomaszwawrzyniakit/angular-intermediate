import { Component, computed, effect, linkedSignal, signal } from '@angular/core';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MOCK_TICKETS, Ticket, TicketStatusFilter } from '../ticket';
import { TicketFilter } from '../ticket-filter/ticket-filter';
import { TicketList } from './ticket-list';

const STORAGE_KEY = 'opsboard.ticket-list';
const STATUS_FILTERS: readonly TicketStatusFilter[] = ['all', 'new', 'progress', 'done'];

/**
 * The tickets page. This is where the modern signal APIs come together:
 *
 *  - signal()        → the search text
 *  - computed()      → the filtered list (derived, never hand-written)
 *  - input() / output() / model() → the <app-ticket-list> and <app-ticket-filter>
 *  - linkedSignal()  → the highlighted ticket, linked to the filtered list
 *  - effect()        → a side-effect that mirrors search + filter to localStorage
 */
@Component({
  selector: 'app-tickets',
  imports: [MatFormField, MatLabel, MatInput, MatPrefix, MatIcon, TicketFilter, TicketList],
  template: `
    <h1>Tickets</h1>

    <div class="controls">
      <mat-form-field appearance="outline" subscriptSizing="fixed" class="search">
        <mat-label>Search tickets</mat-label>
        <mat-icon matIconPrefix>search</mat-icon>
        <input matInput [value]="search()" (input)="onSearch($event)" />
      </mat-form-field>

      <app-ticket-filter [(filter)]="statusFilter" />
    </div>

    <p class="count" role="status">
      Showing {{ filteredTickets().length }} of {{ tickets().length }} ticket{{
        tickets().length === 1 ? '' : 's'
      }}.
    </p>

    <app-ticket-list
      [tickets]="filteredTickets()"
      [selectedId]="selectedTicket()?.id ?? null"
      (ticketSelected)="onTicketSelected($event)"
    />

    @if (selectedTicket()) {
      <p class="selected" role="status">
        <mat-icon>check_circle</mat-icon>
        <span
          >Selected: <strong>{{ selectedTicket()?.title }}</strong></span
        >
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    .controls {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
    }

    .search {
      flex: 1 1 280px;
    }

    .count {
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 16px;
      font: var(--mat-sys-label-large);
    }

    .selected {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 24px 0 0;
      padding: 12px 16px;
      border-radius: var(--mat-sys-corner-large);
      background-color: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
      mat-icon {
        color: var(--mat-sys-primary);
      }
    }
  `,
})
export class Tickets {
  // // demo: signal() — the single source of truth for the search text.
  protected readonly search = signal('');

  // // demo: model() target — <app-ticket-filter [(filter)]="statusFilter">
  // // writes the user's pick back into this signal.
  protected readonly statusFilter = signal<TicketStatusFilter>('all');

  // The full backlog (source of truth for the data).
  protected readonly tickets = signal<Ticket[]>(MOCK_TICKETS);

  // // demo: computed() — derived state. Reading it re-runs only when a
  // // dependency changes; never mutate a computed, read the source.
  protected readonly filteredTickets = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.tickets().filter((ticket) => {
      const matchesStatus = status === 'all' || ticket.status === status;
      const matchesQuery =
        query === '' ||
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  });

  // // demo: linkedSignal() — the highlighted ticket. It defaults to the
  // // first filtered ticket and follows that list, but a user click can
  // // override it until the filter no longer contains that ticket.
  // // (Two-argument form: a separate `source` and `computation`.)
  protected readonly selectedTicket = linkedSignal<Ticket[], Ticket | null>({
    source: this.filteredTickets,
    computation: (tickets, previous) => {
      const prev = previous?.value;
      if (prev) {
        const stillVisible = tickets.find((t) => t.id === prev.id);
        if (stillVisible) return stillVisible;
      }
      return tickets[0] ?? null;
    },
  });

  constructor() {
    // Restore the previously persisted search + filter before the first render.
    this.restoreFromStorage();

    // // demo: effect() — a side-effect only. It watches `search` and
    // // `statusFilter` and mirrors them into localStorage. It is NOT used
    // // for derived state (that lives in the computed() above).
    effect(() => {
      const value = {
        search: this.search(),
        statusFilter: this.statusFilter(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    });
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onTicketSelected(ticket: Ticket): void {
    // Consume the list's output() to highlight the chosen row.
    this.selectedTicket.set(ticket);
  }

  private restoreFromStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as {
        search?: string;
        statusFilter?: TicketStatusFilter;
      };
      if (typeof saved.search === 'string') this.search.set(saved.search);
      if (typeof saved.statusFilter === 'string' && STATUS_FILTERS.includes(saved.statusFilter)) {
        this.statusFilter.set(saved.statusFilter);
      }
    } catch {
      // A corrupt value should not break the page; just ignore it.
    }
  }
}
