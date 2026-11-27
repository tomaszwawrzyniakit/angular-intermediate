import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import ticketRoutes from './tickets.routes';

describe('tickets routes', () => {
  it('opens the form for /new and the detail for /:id ("first match wins")', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'tickets', children: ticketRoutes }])],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/tickets/new');
    expect(router.routerState.snapshot.root.firstChild?.firstChild?.routeConfig?.path).toBe('new');

    await router.navigateByUrl('/tickets/42');
    expect(router.routerState.snapshot.root.firstChild?.firstChild?.routeConfig?.path).toBe(':id');
  });
});
