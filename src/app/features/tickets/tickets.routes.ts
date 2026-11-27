import { CanDeactivateFn, Routes } from '@angular/router';

import type NewTicket from './new-ticket/new-ticket';

// Functional guard: a plain function (inject() works inside). Real use case: do not lose a
// half-filled wizard when the user clicks another link.
const confirmLeaveWizard: CanDeactivateFn<NewTicket> = (wizard) =>
  !wizard.hasUnsavedChanges() || confirm('Discard the new ticket?');

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
    loadComponent: () => import('./new-ticket/new-ticket'),
    canDeactivate: [confirmLeaveWizard],
  },
  {
    path: ':id',
    title: 'Ticket · OpsBoard',
    loadComponent: () => import('./ticket-detail'),
  },
] satisfies Routes;

// More modern routing, for reference:
//   canActivate: [() => inject(AuthService).isLoggedIn() || inject(Router).parseUrl('/login')],
//   canMatch:    [() => inject(Features).enabled('beta')],      // otherwise try the next route
//   redirectTo: ({ queryParams }) => queryParams['legacyId'] ? `/tickets/${queryParams['legacyId']}` : '/tickets',
//   resolve: { ticket: (route) => inject(TicketApi).get(route.params['id']) },  // blocks navigation;
//                                  prefer httpResource + loading state for a snappier UI
//   provideRouter(routes, withViewTransitions())                 // animated page changes
