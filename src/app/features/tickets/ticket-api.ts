import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { Ticket } from './ticket';

/**
 * Commands and one-off queries for /api/tickets.
 * Reactive reads (list, detail) use httpResource() directly in the components.
 */
@Service()
export class TicketApi {
  private readonly http = inject(HttpClient);

  search(query: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>('/api/tickets', { params: { q: query } });
  }

  update(id: number, changes: Partial<Pick<Ticket, 'status' | 'assignee'>>): Observable<Ticket> {
    return this.http.patch<Ticket>(`/api/tickets/${id}`, changes);
  }
}
