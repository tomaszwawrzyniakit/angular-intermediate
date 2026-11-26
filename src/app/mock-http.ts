import {
  HttpEvent,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MOCK_TICKETS, Ticket } from './ticket';

// How long the mock "network" takes to answer a ticket-detail request. Long
// enough that the pending state is visible in the UI and in DevTools' Network
// tab, and that a stale request can be aborted if the route param changes.
const MOCK_LATENCY_MS = 600;

/**
 * A functional HTTP interceptor that pretends to be the ticket backend.
 *
 * `httpResource()` issues real HTTP requests through the HttpClient stack, so
 * interceptors apply. This app has no server, so the interceptor answers the
 * `GET /tickets/:id` requests itself (with simulated latency) instead of
 * calling `next(req)` — which means the real backend is never hit and the
 * request shows up in the browser Network tab as a cancelled/finalized entry.
 *
 * Unknown ids surface a 404 so the error + retry path is easy to demonstrate
 * live (just open `/tickets/999`).
 */
export const mockTicketBackend: HttpInterceptorFn = (req, next) => {
  const match = req.url.match(/^\/tickets\/([^/]+)$/);

  if (req.method === 'GET' && match) {
    const id = Number(match[1]);
    const ticket = MOCK_TICKETS.find((t) => t.id === id);

    const answer: Observable<HttpEvent<unknown>> = ticket
      ? of(new HttpResponse<Ticket>({ status: 200, body: ticket }))
      : throwError(
          () => new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: req.url }),
        );

    return answer.pipe(delay(MOCK_LATENCY_MS));
  }

  // Anything else falls through to the real backend (this app has no others).
  return next(req);
};
