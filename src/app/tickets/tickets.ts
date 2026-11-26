import {
  PLATFORM_ID,
  afterNextRender,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { Listbox, Option } from '@angular/aria/listbox';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MOCK_TICKETS, Ticket, TicketStatusFilter } from '../ticket';
import { TicketSearch } from '../ticket-search';
import { TicketFilter } from '../ticket-filter/ticket-filter';
import { TicketList } from './ticket-list';

const STORAGE_KEY = 'opsboard.ticket-list';
const STATUS_FILTERS: readonly TicketStatusFilter[] = ['all', 'new', 'progress', 'done'];

// The shape of what the persist effect writes to localStorage.
interface SavedState {
  search?: string;
  statusFilter?: TicketStatusFilter;
}

// The ops team (every known assignee in the mock backlog) for the Aria listbox.
const AGENTS: readonly string[] = [
  ...new Set(MOCK_TICKETS.map((t) => t.assignee).filter((name): name is string => !!name)),
];

/**
 * The tickets page. Day-1 signal APIs plus the Day-2 reactive-search pipeline:
 *
 *  - signal()               → the search text
 *  - toObservable()         → the text as a stream of its changes (signal → RxJS)
 *  - debounceTime()         → wait 300 ms until typing pauses
 *  - distinctUntilChanged() → ignore repeats of the same term
 *  - switchMap()            → one search per term; a new term cancels the previous request
 *  - toSignal()             → the latest result back as a signal (RxJS → signal)
 *
 * The teaching point: Signals hold state; RxJS owns the asynchronous bits —
 * the timer (debounce) and the cancellation of a stale, in-flight search.
 *
 * The pipeline is subscribed to exactly once (through toSignal). Everything the
 * UI needs — the list and the "is a search in flight?" flag — is derived from
 * that single subscription, so there is no second subscription to re-run the
 * (cold) debounce/switchMap chain.
 */
@Component({
  selector: 'app-tickets',
  imports: [
    Listbox,
    Option,
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatCardHeader,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    MatPrefix,
    MatIcon,
    MatSpinner,
    TicketFilter,
    TicketList,
  ],
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

    @if (searching()) {
      <div class="pending" role="status" aria-busy="true">
        <mat-spinner diameter="48" aria-label="Searching tickets"></mat-spinner>
        <p>Searching tickets…</p>
      </div>
    } @else {
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
    }

    @if (selectedTicket()) {
      <p class="selected" role="status">
        <mat-icon>check_circle</mat-icon>
        <span
          >Selected: <strong>{{ selectedTicket()?.title }}</strong></span
        >
      </p>
    }

    <!--
      ANGULAR ARIA (headless) vs ANGULAR MATERIAL (styled):
      Material gives you pre-styled widgets (mat-select, mat-menu). Angular Aria
      gives you *behavior* — ARIA roles, a roving tabindex, arrow/Home/End
      keyboard navigation — and leaves the markup and styling to YOU.
      Drive this listbox with the keyboard only: Tab in, then
      ArrowUp/ArrowDown, Home/End, Enter to confirm a pick.
    -->
    <mat-card class="aria-demo">
      <mat-card-header>
        <mat-card-title>Angular Aria — assignee listbox</mat-card-title>
        <mat-card-subtitle>
          Material ships styled widgets; Angular Aria ships headless accessible
          behavior. So this listbox is plain markup getting its ARIA roles,
          roving tabindex and keyboard behavior from <code>&#64;angular/aria</code>.
        </mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <span class="aria-label" id="assignee-listbox-label">
          Assign the selected ticket to
        </span>
        <ul
          ngListbox
          selectionMode="explicit"
          aria-labelledby="assignee-listbox-label"
          [value]="assigneeSelection()"
          (valueChange)="assigneeSelection.set($event)"
          class="assignee-list"
        >
          @for (agent of agents; track agent) {
            <li ngOption [value]="agent" [label]="agent" class="assignee-option">
              {{ agent }}
            </li>
          }
        </ul>
        <p class="assignee-result" role="status">
          @if (assignee()) {
            Assignee: <strong>{{ assignee() }}</strong>
          } @else {
            No assignee picked yet — Tab into the list, then use the arrow keys
            and Enter.
          }
        </p>
      </mat-card-content>
    </mat-card>
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

    /* Visible pending state while a search is in flight. */
    .pending {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
      p {
        margin: 0;
      }
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

    /* Angular Aria provides no styling — this tiny block is ALL the look the
       listbox gets, which is the point: behavior from Aria, markup + style ours. */
    .aria-demo {
      margin-top: 24px;

      code {
        color: var(--mat-sys-primary);
        font-size: 0.85em;
      }
    }

    .aria-label {
      display: block;
      margin-bottom: 8px;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }

    .assignee-list {
      list-style: none;
      margin: 0;
      padding: 4px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-full);
      max-height: 192px;
      overflow: auto;
    }

    .assignee-result {
      margin: 12px 0 0;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);

      strong {
        color: var(--mat-sys-on-surface);
      }
    }

    .assignee-option {
      padding: 8px 12px;
      border-radius: var(--mat-sys-corner-medium);
      cursor: pointer;
      font: var(--mat-sys-body-medium);

      /* Aria drives aria-selected / data-active / the roving tabindex; we just
         give the focused and selected rows a visible highlight. */
      &[aria-selected='true'],
      &[data-active='true'] {
        background-color: var(--mat-sys-primary-container);
      }
    }
  `,
})
export class Tickets {
  private readonly ticketSearch = inject(TicketSearch);

  // signal(): the single source of truth for the search text.
  protected readonly search = signal('');

  // model() target: <app-ticket-filter [(filter)]="statusFilter"> writes the
  // user's pick back into this signal.
  protected readonly statusFilter = signal<TicketStatusFilter>('all');

  // A flag that is true while a search is in flight, so the template can show
  // a spinner. It is driven by the single pipeline subscription below.
  protected readonly searching = signal(false);

  // toObservable(): the search signal as a stream of its changes. Field
  // initializers run in an injection context, so this is allowed.
  private readonly searchChanges$ = toObservable(this.search);

  // RxJS owns the asynchronous parts: debounce the typing, drop repeats, then
  // run one search per term and CANCEL the previous (stale) request when a new
  // term arrives (switchMap). Setting the flag inside the switchMap means the
  // spinner appears exactly when a fresh request is about to go out; the outer
  // `tap` clears it once the latest request has answered.
  private readonly searchResults$ = this.searchChanges$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((term) => {
      this.searching.set(true);
      return this.ticketSearch.search(term);
    }),
    tap({
      next: () => this.searching.set(false),
    }),
  );

  // toSignal(): the latest search results back as a signal. It starts with the
  // full backlog and only flips to a new list once a search resolves. This is
  // the single subscription that drives the whole reactive UI.
  protected readonly tickets = toSignal(this.searchResults$, { initialValue: MOCK_TICKETS });

  // computed(): derived state — the search results narrowed by the status filter.
  protected readonly filteredTickets = computed(() => {
    const status = this.statusFilter();
    return this.tickets().filter((ticket) => status === 'all' || ticket.status === status);
  });

  // linkedSignal(): the highlighted ticket. It defaults to the first visible
  // ticket and follows the filtered list, but a user click overrides it until
  // the filter no longer contains that ticket.
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
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    // SSR + hydration: the first render — on the SERVER and on the client's
    // hydration pass — must show the SAME state, or the server HTML and the
    // client render differ and hydration errors out. So the persisted
    // search/filter is read here (browser-only; the server has no localStorage)
    // but NOT applied yet. Applying it in afterNextRender() — a browser-only
    // callback that runs after the first paint, and under SSR after hydration
    // completes — keeps the first render identical on both platforms while
    // still restoring the user's saved state right after.
    //
    // Reading it up front (before the persist effect's first write) also means
    // the effect below can never clobber the saved value before it is applied.
    const saved = isBrowser ? this.readSavedState() : null;
    afterNextRender(() => this.applySavedState(saved));

    // effect(): a side-effect only. It mirrors search + filter to localStorage.
    // Registered browser-only because localStorage does not exist on the
    // server; the effect body is a side effect, not derived state.
    if (isBrowser) {
      effect(() => {
        const value = {
          search: this.search(),
          statusFilter: this.statusFilter(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      });
    }
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onTicketSelected(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
  }

  // --- Angular Aria (headless listbox) -------------------------------------
  // The team members the listbox can pick from, derived from the mock backlog.
  protected readonly agents = AGENTS;

  // The listbox value is a MODEL input ([value] + (valueChange)): the selected
  // agent name(s). Angular Aria owns the ARIA wiring, roving tabindex and the
  // arrow/Home/End keyboard behavior; the little style block below is ALL the
  // look the control gets (Material would have styled it for us).
  protected readonly assigneeSelection = signal<string[]>([]);

  // The picked agent, for the visible result line.
  protected readonly assignee = computed(() => this.assigneeSelection()[0]);

  // Reads the persisted state (browser-only). A null value means "nothing to
  // restore"; a corrupt value is ignored so it can never break the page.
  private readSavedState(): SavedState | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw) as SavedState;
      return saved;
    } catch {
      return null;
    }
  }

  // Applies the previously-read state. Runs in afterNextRender(), i.e. in the
  // browser and only after the first render (and, under SSR, after hydration),
  // so the server and hydration passes are guaranteed to have rendered the
  // identical initial state.
  private applySavedState(saved: SavedState | null): void {
    if (!saved) return;
    if (typeof saved.search === 'string') this.search.set(saved.search);
    if (typeof saved.statusFilter === 'string' && STATUS_FILTERS.includes(saved.statusFilter)) {
      this.statusFilter.set(saved.statusFilter);
    }
  }
}
