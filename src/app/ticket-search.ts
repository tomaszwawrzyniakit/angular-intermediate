import { Service } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MOCK_TICKETS, Ticket } from './ticket';

// How long the mock "network" takes to answer. Long enough that a newer
// search can land while an older one is still in flight, so switchMap()'s
// cancellation is easy to point at during the live demo.
const NETWORK_DELAY_MS = 500;

/**
 * A tiny mock of a ticket-search backend.
 *
 * There is no server in this training app, so this does NOT do real HTTP. It
 * filters the local mock backlog by the search term and pretends the answer
 * took a little while to "travel" over the network (the `delay` below). That
 * simulated latency is what makes the pending state visible in the UI and lets
 * a newer search cancel an older, still-pending one.
 */
@Service()
export class TicketSearch {
  search(query: string): Observable<Ticket[]> {
    const term = query.trim().toLowerCase();
    const results =
      term === ''
        ? MOCK_TICKETS
        : MOCK_TICKETS.filter(
            (t) =>
              t.title.toLowerCase().includes(term) || t.description.toLowerCase().includes(term),
          );

    // A fake request URL, logged so the lifecycle (started / cancelled /
    // resolved) is easy to demonstrate in the browser console.
    const url = `/tickets?query=${term || '(all)'}`;

    return of(results).pipe(
      tap(() => console.log(`[TicketSearch] GET ${url}`)),
      delay(NETWORK_DELAY_MS),
      tap(() => console.log(`[TicketSearch] ${results.length} ticket(s) for ${url}`)),
      tap({
        unsubscribe: () => console.log(`[TicketSearch] ${url} cancelled by a newer search`),
      }),
    );
  }
}
