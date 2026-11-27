import {
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { from, map, Observable, throwError } from 'rxjs';

import { Ticket } from '../domain/ticket';
import { MOCK_TICKETS } from '../domain/tickets';

/** URL of the mock ticket-search endpoint served by the interceptor. */
export const TICKETS_API = '/api/tickets';

/** Matches the mock ticket-detail endpoint: `/api/tickets/42`. */
const TICKET_ID_PATTERN = /^\/api\/tickets\/(\d+)$/;

/** Simulated network round-trip for the ticket search. */
const MOCK_LATENCY_MS = 700;

/** Simulated round-trip for a single-ticket detail GET. */
const MOCK_TICKET_LATENCY_MS = 400;

/** HTTP error shape returned by the mock for a 404. */
interface ApiError {
  error: string;
}

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

  // Task 06: single-ticket detail, e.g. GET /api/tickets/42. A known id resolves
  // to the ticket after the delay; an unknown id resolves to a 404, which we turn
  // into an `HttpErrorResponse` on the error channel (mirroring a real backend)
  // so `httpResource` enters its error state. Demoable with /tickets/999 and the
  // retry button wired to `.reload()`.
  const detailMatch = TICKET_ID_PATTERN.exec(req.url);
  if (req.method === 'GET' && detailMatch !== null) {
    const id = Number(detailMatch[1]);
    return from(
      new Promise<HttpResponse<Ticket>>(resolve => {
        setTimeout(() => {
          const ticket = MOCK_TICKETS.find(candidate => candidate.id === id);
          // Unknown id -> a 404 response that `asHttpEvent` converts to an
          // HttpErrorResponse on the error channel (mirrors a real backend).
          resolve(
            ticket !== undefined
              ? new HttpResponse<Ticket>({ body: ticket, url: req.urlWithParams })
              : new HttpResponse<Ticket>({
                  body: null,
                  status: 404,
                  statusText: 'Not Found',
                  url: req.urlWithParams,
                }),
          );
        }, MOCK_TICKET_LATENCY_MS);
      }),
    ).pipe(map(asHttpEvent));
  }

  return throwError(() => new Error(`Mock backend has no route for ${req.method} ${req.url}`));
};

/**
 * Mirror a real backend: 2xx responses pass through, any other status becomes
 * an `HttpErrorResponse` thrown onto the error channel (a non-ok response on
 * the *success* channel would be treated by `httpResource` as a plain value).
 */
function asHttpEvent(response: HttpResponse<unknown>): HttpResponse<unknown> {
  if (response.ok) {
    return response;
  }
  throw new HttpErrorResponse({
    error: { error: 'Ticket not found' } as ApiError,
    status: response.status,
    statusText: response.statusText,
    url: response.url ?? undefined,
  });
}

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
