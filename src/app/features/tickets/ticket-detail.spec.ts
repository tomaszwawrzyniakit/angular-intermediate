import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { mockTicketInterceptor } from '../../mock/mock-http';
import { TicketDetail } from './ticket-detail';

/**
 * A mutable mock ActivatedRoute: `id()` swaps the `:id` param reactively, so a
 * test can simulate navigating between /tickets/1 and /tickets/4 and observe
 * the resources re-run (and the stale request get cancelled).
 */
function makeMockRoute(initialId: string): ActivatedRoute {
  const id$ = new BehaviorSubject<Params>({ id: initialId });
  // The component reads `route.params` as an Observable; a BehaviorSubject is
  // also a Subject, so it satisfies the read-side contract for the test.
  const route = {
    params: id$,
    get snapshot(): { params: Params } {
      return { params: id$.value };
    },
  };
  return route as unknown as ActivatedRoute;
}

/**
 * Task 06 — exercises the resource APIs end to end against the mock backend:
 * httpResource() for the ticket detail (loading / value / error / reload) and
 * the plain resource() side panel, both driven by the reactive route param.
 * The mock interceptor's 400 ms latency keeps requests genuinely in-flight, so
 * the pending spinner is observable with fake timers.
 */
describe('TicketDetail (resource APIs)', () => {
  let fixture: ComponentFixture<TicketDetail>;
  let route: ActivatedRoute;

  /** Swap the `:id` route param (simulate navigating between ticket ids). */
  function setId(next: string): void {
    (route as unknown as { params: BehaviorSubject<Params> }).params.next({ id: next });
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    route = makeMockRoute('1');
    await TestBed.configureTestingModule({
      imports: [TicketDetail],
      // The ActivatedRoute mock must come LAST so it overrides the real
      // (empty-params) route that provideRouter installs in the environment.
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([mockTicketInterceptor])),
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  /** Advance past the detail GET (400 ms) + side-panel loader (250 ms). */
  async function flush(): Promise<void> {
    await vi.advanceTimersByTimeAsync(500);
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  it('loads the ticket through httpResource and shows a loading spinner first', async () => {
    fixture = TestBed.createComponent(TicketDetail);
    fixture.detectChanges();

    // While the GET is in flight: httpResource.isLoading() drives the spinner.
    expect(fixture.nativeElement.querySelector('.spinner-border')).toBeTruthy();

    await flush();
    // Resolved: the ticket title and assignee render; the spinner is gone.
    expect(text()).toContain('Payment gateway timeouts in production');
    expect(text()).toContain('Marta Kowalska');
    expect(fixture.nativeElement.querySelector('.spinner-border')).toBeNull();
    expect(text()).not.toContain('Loading ticket…');
  });

  it('re-requests when the reactive route param changes (cancelling the stale GET)', async () => {
    fixture = TestBed.createComponent(TicketDetail);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300); // detail GET in flight (400 ms)

    // Navigate /tickets/1 -> /tickets/4 mid-flight.
    setId('4');
    await flush();

    // httpResource cancelled the stale request and resolved with ticket 4.
    // Scope the assertion to the main card so the side panel (which now lists
    // ticket 1 as a related 'progress' ticket) does not interfere.
    const mainCard = fixture.nativeElement.querySelector('.col-lg-8') as HTMLElement;
    expect(mainCard.textContent).toContain('Slow dashboard queries on the analytics DB');
    expect(mainCard.textContent).not.toContain('Payment gateway timeouts in production');
  });

  it('shows an error state with a retry button for an unknown id (404)', async () => {
    setId('999');
    fixture = TestBed.createComponent(TicketDetail);
    fixture.detectChanges();

    await flush();
    // httpResource.error() is the HttpErrorResponse from the mock 404.
    expect(text()).toContain('could not be loaded');
    expect(text()).toContain('404');
    // The retry button is wired to httpResource.reload().
    const retry = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
    expect(retry).toBeTruthy();
    retry.click();
    fixture.detectChanges();
    // Reloading a still-missing id stays in the error state (mock is static).
    await flush();
    expect(text()).toContain('could not be loaded');
  });

  it('drives the plain resource() side panel from the same reactive param', async () => {
    fixture = TestBed.createComponent(TicketDetail);
    fixture.detectChanges();
    await flush();

    // The side panel lists other tickets sharing the loaded ticket's status
    // (ticket 1 is 'progress', so its open peers are tickets 4, 5 and 8).
    expect(text()).toContain('Related open tickets');
    expect(text()).toContain('Slow dashboard queries on the analytics DB');
    expect(text()).toContain('Enable 2FA for all on-call engineers');
  });
});
