import { Routes } from '@angular/router';

// Every feature is lazy: its code is downloaded the first time the route is visited.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · OpsBoard',
    loadComponent: () => import('./features/dashboard/dashboard'),
  },
  {
    // A whole feature area: the tickets feature owns its own child routes.
    path: 'tickets',
    loadChildren: () => import('./features/tickets/tickets.routes'),
  },
  { path: '**', redirectTo: 'dashboard' },
];
