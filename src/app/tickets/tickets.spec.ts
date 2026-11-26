import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ticket } from '../ticket';
import { TicketList } from './ticket-list';
import { Tickets } from './tickets';

const MOCK_COUNT = 10;

// The search is now a reactive pipeline (debounce 300 ms + simulated 500 ms
// "network"). The tests drive it with the real clock and a short sleep, which
// also mirrors how a trainer runs the app (type, watch the spinner, get results).
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rows(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll('app-ticket-list .ticket')) as HTMLButtonElement[];
}

function searchInput(host: HTMLElement): HTMLInputElement {
  return host.querySelector('input[matInput]') as HTMLInputElement;
}

function type(host: HTMLElement, value: string): void {
  searchInput(host).value = value;
  searchInput(host).dispatchEvent(new Event('input'));
}

function clickFilter(host: HTMLElement, value: string): void {
  const toggle = host.querySelector(`app-ticket-filter mat-button-toggle[value="${value}"]`)!;
  (toggle.querySelector('button') as HTMLButtonElement).click();
}

/** Test-only host that consumes the list's output() the way the page does. */
@Component({
  imports: [TicketList],
  template: ` <app-ticket-list [tickets]="tickets()" (ticketSelected)="emitted = $event" /> `,
})
class HostWithList {
  tickets = signal<Ticket[]>([
    { id: 1, title: 'Alpha', description: 'd', status: 'new', priority: 'low' },
    { id: 2, title: 'Beta', description: 'd', status: 'done', priority: 'high' },
  ]);
  emitted: unknown = null;
}

describe('Tickets', () => {
  let fixture: ComponentFixture<Tickets> | undefined;

  beforeEach(() => {
    localStorage.clear();
  });

  // Destroying the fixture releases the search subscription, so a leftover
  // debounce timer never leaks into the next test.
  afterEach(() => {
    fixture?.destroy();
    fixture = undefined;
  });

  it('should render one row per ticket', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(rows(host).length).toBe(MOCK_COUNT);
    expect(host.textContent).toContain('Production database connection pool exhausted');
  });

  it('should reactively search tickets (signal → toObservable → … → toSignal)', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    type(host, 'payment');
    // 300 ms debounce + 500 ms simulated network, with a little margin.
    await sleep(900);
    fixture.detectChanges();

    expect(rows(host).length).toBe(1);
    expect(host.textContent).toContain('Showing 1 of 1 ticket.');
    expect(host.textContent).toContain('Payment webhook retries flooding the queue');
  });

  it('should show a pending state while a search is in flight', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // Let the (300 ms) debounce fire so a request is in flight, but not long
    // enough for the (500 ms) "network" to answer.
    type(host, 'payment');
    await sleep(450);
    fixture.detectChanges();
    expect(host.querySelector('.pending')).not.toBeNull();
    expect(rows(host).length).toBe(0);

    // The request resolves and the results render.
    await sleep(600);
    fixture.detectChanges();
    expect(host.querySelector('.pending')).toBeNull();
    expect(rows(host).length).toBe(1);
  });

  it('should cancel a stale search so the newest result wins', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // First term: let its 300 ms debounce fire and start the request.
    type(host, 'payment');
    await sleep(450); // in-flight window is ~300 ms → ~800 ms
    expect(host.querySelector('.pending')).not.toBeNull();

    // Second term lands while the first is still in flight: the stale request
    // is cancelled (switchMap) and a new one starts (debounce ~750 ms, then a
    // fresh 500 ms "network").
    type(host, 'backup');
    await sleep(400); // now ~850 ms: past the second debounce, request in flight
    expect(host.querySelector('.pending')).not.toBeNull();

    // The newest request resolves.
    await sleep(500); // now ~1350 ms: well past the second request's 500 ms delay
    fixture.detectChanges();
    expect(host.querySelector('.pending')).toBeNull();

    // The stale "payment" result never won; only the newest ("backup") does.
    expect(rows(host).length).toBe(1);
    expect(host.textContent).toContain('Nightly backup job failed for the analytics warehouse');
    expect(host.textContent).not.toContain('Payment webhook retries flooding the queue');
  });

  it('should filter tickets by the status filter (model)', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    clickFilter(host, 'done');
    fixture.detectChanges();

    // Three tickets have status "done".
    expect(rows(host).length).toBe(3);
    expect(host.textContent).toContain(`Showing 3 of ${MOCK_COUNT} tickets`);
  });

  it('should show the empty state when nothing matches', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    type(host, 'zzz-not-a-ticket');
    await sleep(900);
    fixture.detectChanges();

    expect(rows(host).length).toBe(0);
    expect(host.textContent).toContain('No tickets found');
  });

  it('should highlight the ticket emitted by the list output()', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    rows(host)[1].click();
    fixture.detectChanges();

    expect(host.querySelector('.selected')?.textContent).toContain(
      'Payment webhook retries flooding the queue',
    );
    const selected = Array.from(host.querySelectorAll('.ticket.selected'));
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toContain('Payment webhook');
  });

  it('should reset the linkedSignal selection when the filter removes it', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // Pick ticket #2, then switch the status filter to "done": #2 is no
    // longer in the filtered list, so the linkedSignal falls back to the
    // first visible ticket.
    rows(host)[1].click();
    fixture.detectChanges();
    expect(host.querySelector('.selected')?.textContent).toContain('Payment webhook');

    clickFilter(host, 'done');
    fixture.detectChanges();

    expect(host.querySelector('.selected')?.textContent).toContain(
      'Email delivery service latency above SLA',
    );
  });

  it('should persist search + filter with effect() and restore them on init', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();

    // Seed the values the way the effect persists them.
    localStorage.setItem(
      'opsboard.ticket-list',
      JSON.stringify({ search: 'email', statusFilter: 'done' }),
    );

    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // Restored on init: the search fires and narrows the list.
    expect(searchInput(host).value).toBe('email');
    await sleep(900);
    fixture.detectChanges();
    expect(rows(host).length).toBe(1);
    expect(host.textContent).toContain('Email delivery service latency above SLA');

    // The effect mirrors new changes back to localStorage.
    type(host, 'webhook');
    await sleep(900);
    fixture.detectChanges();

    const saved = JSON.parse(localStorage.getItem('opsboard.ticket-list')!) as {
      search: string;
      statusFilter: string;
    };
    expect(saved.search).toBe('webhook');
    expect(saved.statusFilter).toBe('done');
  });

  it('should label the filter group for assistive tech', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const group = host.querySelector('app-ticket-filter mat-button-toggle-group');
    expect(group?.getAttribute('aria-label')).toBe('Filter tickets by status');
  });
});

describe('TicketList (reusable)', () => {
  it('should emit the ticket when a row is clicked (output)', async () => {
    await TestBed.configureTestingModule({ imports: [HostWithList] }).compileComponents();
    const fixture = TestBed.createComponent(HostWithList);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    (host.querySelector('.ticket') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.emitted).toEqual(
      expect.objectContaining({ id: 1, title: 'Alpha' }),
    );
  });
});
