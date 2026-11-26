import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'tickets',
    loadComponent: () => import('./tickets/tickets').then((m) => m.Tickets),
  },
  { path: '**', redirectTo: 'dashboard' },
];
