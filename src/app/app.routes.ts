import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'tickets',
    loadComponent: () => import('./tickets/tickets').then((m) => m.Tickets),
  },
  {
    path: 'tickets/new',
    loadComponent: () => import('./tickets/new-ticket').then((m) => m.NewTicket),
  },
  { path: '**', redirectTo: 'dashboard' },
];
