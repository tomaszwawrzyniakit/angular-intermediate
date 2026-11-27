import { httpResource } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';

import { Ticket } from './ticket';
import { TicketApi } from './ticket-api';

/**
 * Store pattern with plain signals: ONE place that owns the ticket collection.
 *
 * Why: the list and the dashboard need the same data, and both change it (status, assignee,
 * new tickets). Instead of every component fetching and patching its own copy, they read the
 * store's signals and call its methods. Start with local state; move it here only when it is shared.
 *
 *   state     → private resource (writable)
 *   selectors → readonly signals + computed()
 *   commands  → methods; the only way to change state
 */
@Service()
export class TicketStore {
  private readonly api = inject(TicketApi);
  private readonly resource = httpResource<Ticket[]>(() => '/api/tickets', { defaultValue: [] });

  // Selectors (read-only for the outside world)
  readonly tickets = this.resource.value.asReadonly();
  readonly loading = computed(() => this.resource.isLoading() && !this.resource.hasValue());
  readonly error = this.resource.error;

  readonly openCount = computed(() => this.tickets().filter((t) => t.status !== 'done').length);
  readonly unassignedHigh = computed(() =>
    this.tickets().filter((t) => t.priority === 'high' && !t.assignee && t.status !== 'done'),
  );

  // Commands
  reload(): void {
    this.resource.reload();
  }

  /** Optimistic update: the UI changes at once; if the server says no, we re-fetch the truth. */
  update(id: number, changes: Partial<Pick<Ticket, 'status' | 'assignee'>>): void {
    this.resource.value.update((list) => list.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    this.api.update(id, changes).subscribe({ error: () => this.reload() });
  }

  added(ticket: Ticket): void {
    this.resource.value.update((list) => [...list, ticket]);
  }
}

/*
 * The same store with NgRx Signal Store (npm i @ngrx/signals), for comparison:
 *
 *   export const TicketStore = signalStore(
 *     { providedIn: 'root' },
 *     withState({ tickets: [] as Ticket[], loading: false }),
 *     withComputed(({ tickets }) => ({
 *       openCount: computed(() => tickets().filter((t) => t.status !== 'done').length),
 *     })),
 *     withMethods((store, api = inject(TicketApi)) => ({
 *       update(id: number, changes: Partial<Ticket>) {
 *         patchState(store, { tickets: store.tickets().map((t) => (t.id === id ? { ...t, ...changes } : t)) });
 *         api.update(id, changes).subscribe();
 *       },
 *     })),
 *     withHooks({ onInit: (store) => { ...load tickets... } }),
 *   );
 *
 * Same idea (state + computed + methods), more structure and plugins (entities, devtools, events).
 * Worth it when many stores share conventions; a plain @Service store is enough for one feature.
 */
