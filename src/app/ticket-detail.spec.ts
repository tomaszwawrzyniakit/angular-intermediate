import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Ticket } from './ticket';
import { TicketDetail } from './ticket-detail';

// A fixed ticket to flush the mock backend with.
const TICKET_1: Ticket = {
  id: 1,
  title: 'Production database connection pool exhausted',
  description: 'The order service is failing with pool-timeout errors.',
  status: 'progress',
  priority: 'high',
  assignee: 'Anita Kowalska',
};

// A second ticket for the cancellation test (the target of the new request).
const TICKET_2: Ticket = {
  id: 2,
  title: 'Payment webhook retries flooding the queue',
  description: 'Duplicate payment confirmation webhooks are being enqueued.',
  status: 'new',
  priority: 'high',
  assignee: 'Marek Nowak',
};

// The app runs zoneless, so a resource's value/error lands on a microtask after
// the test backend answers. Yield to the event loop (a macrotask drains all
// pending microtasks) so the resource state has updated before we assert.
function sleep(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createDetail(id: string) {
  // Seed the route params the way the router would.
  const params$ = new BehaviorSubject<Params>({ id });

  await TestBed.configureTestingModule({
    imports: [TicketDetail],
    providers: [
      // Plain HttpClient wired to the test backend (no app-config interceptors,
      // so HttpTestingController can see and answer every request).
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { params: params$.asObservable() } },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(TicketDetail);
  fixture.detectChanges();
  return { fixture, httpTesting: TestBed.inject(HttpTestingController), params$ };
}

describe('TicketDetail', () => {
  it('loads the ticket for the current :id via httpResource()', async () => {
    const { fixture, httpTesting } = await createDetail('1');
    const host = fixture.nativeElement as HTMLElement;

    // The reactive request URL is built from the route param.
    const req = httpTesting.expectOne('/tickets/1');
    req.flush(TICKET_1);
    await sleep();
    fixture.detectChanges();

    expect(host.textContent).toContain(TICKET_1.title);
    expect(host.textContent).toContain('Ticket #1');
    expect(host.textContent).toContain('Anita Kowalska');
    httpTesting.verify();
  });

  it('shows a pending state while the request is in flight', async () => {
    const { fixture, httpTesting } = await createDetail('1');
    const host = fixture.nativeElement as HTMLElement;

    // Before the response is flushed, the resource is loading.
    expect(host.querySelector('.pending')).not.toBeNull();

    httpTesting.expectOne('/tickets/1').flush(TICKET_1);
    await sleep();
    fixture.detectChanges();
    expect(host.querySelector('.pending')).toBeNull();
    httpTesting.verify();
  });

  it('shows the error state and succeeds after a reload() retry', async () => {
    const { fixture, httpTesting } = await createDetail('999');
    const host = fixture.nativeElement as HTMLElement;

    // Unknown id → the backend errors with a 404.
    httpTesting.expectOne('/tickets/999').error(new ProgressEvent('error'), {
      status: 404,
      statusText: 'Not Found',
    });
    await sleep();
    fixture.detectChanges();

    expect(host.querySelector('.state-card.error')).not.toBeNull();
    expect(host.textContent).toContain('Could not load ticket #999');

    // Retry via .reload() issues a fresh request for the same id.
    const retry = host.querySelector('.state-card.error button') as HTMLButtonElement;
    retry.click();
    await sleep();
    fixture.detectChanges();

    const second = httpTesting.expectOne('/tickets/999');
    second.flush(TICKET_1);
    await sleep();
    fixture.detectChanges();

    expect(host.textContent).toContain(TICKET_1.title);
    httpTesting.verify();
  });

  it('shows related open tickets loaded by a plain resource()', async () => {
    const { fixture, httpTesting } = await createDetail('1');
    const host = fixture.nativeElement as HTMLElement;

    httpTesting.expectOne('/tickets/1').flush(TICKET_1);
    fixture.detectChanges();

    // The related tickets resource chains off the ticket and resolves shortly
    // after the ticket does.
    await new Promise((resolve) => setTimeout(resolve, 500));
    fixture.detectChanges();

    const related = host.querySelector('.related-list');
    expect(related).not.toBeNull();
    // Ticket #1 is excluded from its own related list.
    expect(related!.textContent).not.toContain(TICKET_1.title);
    httpTesting.verify();
  });

  it('aborts the in-flight request when the route param changes', async () => {
    const { fixture, httpTesting, params$ } = await createDetail('1');
    const host = fixture.nativeElement as HTMLElement;

    // The first request is in flight (pending) while the ticket loads.
    const first = httpTesting.expectOne('/tickets/1');

    // Simulate navigating to a different ticket: the router re-emits params,
    // which changes the reactive request URL. httpResource() aborts the stale
    // request and issues a fresh one.
    params$.next({ id: '2' });
    await sleep();
    fixture.detectChanges();

    // The stale request was cancelled by httpResource().
    expect(first.cancelled).toBe(true);

    // The new request resolves and ticket #2 renders.
    httpTesting.expectOne('/tickets/2').flush(TICKET_2);
    await sleep();
    fixture.detectChanges();

    expect(host.textContent).toContain(TICKET_2.title);
    expect(host.textContent).toContain('Ticket #2');
    // The cancelled /tickets/1 request is intentionally left open.
    httpTesting.verify({ ignoreCancelled: true });
  });
});
