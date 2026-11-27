import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MOCK_TICKETS } from '../../domain/tickets';
import { mockTicketInterceptor } from '../../mock/mock-http';
import { Tickets } from './tickets';

/**
 * Task 05 — exercises the reactive search pipeline end to end:
 * signal -> toObservable -> debounceTime(300) -> distinctUntilChanged ->
 * switchMap(HTTP) -> toSignal. The mock interceptor (700 ms delay) makes the
 * request genuinely in-flight, so `vi.runAllTimersAsync()` flushes the debounce
 * + mock latency and `switchMap`'s cancellation of stale requests is real.
 */
describe('Tickets (reactive search)', () => {
  let fixture: ComponentFixture<Tickets>;

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Tickets],
      providers: [provideHttpClient(withInterceptors([mockTicketInterceptor]))],
    }).compileComponents();
  });

  afterEach(() => {
    // Destroy the last fixture so toSignal/toObservable/effects clean up.
    fixture.destroy();
    vi.useRealTimers();
  });

  /** Flush the debounce (300 ms) + mock latency (700 ms), with microtasks. */
  async function flushSearch(): Promise<void> {
    await vi.runAllTimersAsync();
  }

  function rows(): NodeListOf<Element> {
    return fixture.nativeElement.querySelectorAll('.ticket-row');
  }

  it('renders the search box with a bi-search icon and a clear label', () => {
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#ticket-search')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('label[for="ticket-search"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.bi-search')).toBeTruthy();
  });

  it('shows a pending spinner until the initial (empty) search resolves', async () => {
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();

    // While the request is in flight the list is pending.
    expect(fixture.nativeElement.querySelector('.spinner-border')).toBeTruthy();

    await flushSearch();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner-border')).toBeNull();
    expect(rows().length).toBe(MOCK_TICKETS.length);
  });

  it('re-searches and cancels the stale request as the query changes', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    await flushSearch();
    fixture.detectChanges();
    expect(rows().length).toBe(MOCK_TICKETS.length);

    // Type a query. The debounce waits, then the (slow) request is in flight;
    // refining the query while it is in flight cancels the stale request.
    fixture.componentInstance.search.set('pa');
    await vi.advanceTimersByTimeAsync(300); // debounce -> GET ?q=pa starts (700 ms, in flight)
    fixture.componentInstance.search.set('pai');
    await vi.advanceTimersByTimeAsync(300); // debounce -> switchMap cancels ?q=pa

    expect(log).toHaveBeenCalledWith(expect.stringContaining('cancelled stale search'));

    // Let the latest request resolve and assert the filtered result.
    await vi.runAllTimersAsync();
    fixture.detectChanges();
    // "pai" matches nothing in the mock data -> the empty state is shown.
    expect(fixture.nativeElement.textContent).toContain('No tickets match');
    log.mockRestore();
  });
});
