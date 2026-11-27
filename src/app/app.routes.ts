import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'tickets',
    loadComponent: () => import('./features/tickets/tickets').then((m) => m.Tickets),
  },
  {
    // Task 06: ticket detail, lazy. The id is a reactive route param for the resources.
    path: 'tickets/:id',
    loadComponent: () => import('./features/tickets/ticket-detail').then((m) => m.TicketDetail),
  },
  {
    // Placeholder only; the real Signal Forms form arrives in Task 07.
    path: 'tickets/new',
    loadComponent: () => import('./features/tickets/new-ticket').then((m) => m.NewTicket),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
