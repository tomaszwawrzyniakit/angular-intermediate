import { Routes } from '@angular/router';

// ORDER MATTERS: the router uses "first match wins".
// 'new' must come before ':id', otherwise /tickets/new would open a ticket with id "new".
export default [
  {
    path: '',
    title: 'Tickets · OpsBoard',
    loadComponent: () => import('./ticket-list'),
  },
  {
    path: 'new',
    title: 'New ticket · OpsBoard',
    loadComponent: () => import('./new-ticket'),
  },
  {
    path: ':id',
    title: 'Ticket · OpsBoard',
    loadComponent: () => import('./ticket-detail'),
  },
] satisfies Routes;
