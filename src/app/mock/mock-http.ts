import { HttpClient, HttpInterceptorFn, HttpParams, HttpResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';

import { Ticket } from '../domain/ticket';
import { MOCK_TICKETS } from '../domain/tickets';

/** URL of the mock ticket-search endpoint served by the interceptor. */
export const TICKETS_API = '/api/tickets';

/** Simulated network round-trip for the ticket search. */
const MOCK_LATENCY_MS = 700;

/**
 * Mock HTTP layer for the demo (no real backend in this training app).
 *
 * `provideHttpClient(withInterceptors([mockTicketInterceptor]))` routes
 * requests into here. A GET to `/api/tickets?q=...` is short-circuited: it
 * returns the mock tickets after a 700 ms delay — long enough to see the
 * pending spinner, and to watch `switchMap` cancel a still-in-flight request
 * (visible in the console via the pipeline's `tap` and in DevTools).
 *
 * Any other URL fails loudly, so an accidental stray request cannot silently
 * return data.
 */
export const mockTicketInterceptor: HttpInterceptorFn = (req) => {
  if (req.method === 'GET' && req.url === TICKETS_API) {
    const query = req.params.get('q') ?? '';
    // A real (in-memory) GET: the promise only resolves after the mock delay,
    // so the in-flight subscription is genuinely cancellable.
    return from(
      new Promise<HttpResponse<Ticket[]>>((resolve) => {
        setTimeout(
          () => resolve(new HttpResponse({ body: mockSearch(query), url: req.urlWithParams })),
          MOCK_LATENCY_MS,
        );
      }),
    );
  }
  return throwError(() => new Error(`Mock backend has no route for ${req.method} ${req.url}`));
};

/**
 * Small service in front of the mock HTTP layer (CLAUDE.md: `@Service` for
 * singletons, `inject()` for DI). The component only talks to this, keeping
 * the RxJS pipeline in the component and the "server" behaviour here.
 */
@Service()
export class TicketSearchService {
  private readonly http = inject(HttpClient);

  /** GET /api/tickets?q=… — the observable the component's pipeline switches on. */
  search(query: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(TICKETS_API, {
      params: new HttpParams().set('q', query),
    });
  }
}

/** Case-insensitive filter over title/description/assignee (simulated server side). */
function mockSearch(query: string): Ticket[] {
  const q = query.trim().toLowerCase();
  if (q === '') {
    return MOCK_TICKETS;
  }
  return MOCK_TICKETS.filter(
    (ticket) =>
      ticket.title.toLowerCase().includes(q) ||
      ticket.description.toLowerCase().includes(q) ||
      (ticket.assignee?.toLowerCase().includes(q) ?? false),
  );
}
