import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Ticket } from '../ticket';
import { TicketList } from './ticket-list';
import { Tickets } from './tickets';

const MOCK_COUNT = 10;

function rows(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll('app-ticket-list .ticket')) as HTMLButtonElement[];
}

function searchInput(host: HTMLElement): HTMLInputElement {
  return host.querySelector('input[matInput]') as HTMLInputElement;
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
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render one row per ticket', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    const fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(rows(host).length).toBe(MOCK_COUNT);
    expect(host.textContent).toContain('Production database connection pool exhausted');
  });

  it('should filter tickets by the search text (computed)', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    const fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    searchInput(host).value = 'payment';
    searchInput(host).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(rows(host).length).toBe(1);
    expect(host.textContent).toContain(`Showing 1 of ${MOCK_COUNT} tickets`);
    expect(host.textContent).toContain('Payment webhook retries flooding the queue');
  });

  it('should filter tickets by the status filter (model)', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    const fixture = TestBed.createComponent(Tickets);
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
    const fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    searchInput(host).value = 'zzz-not-a-ticket';
    searchInput(host).dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(rows(host).length).toBe(0);
    expect(host.textContent).toContain('No tickets found');
  });

  it('should highlight the ticket emitted by the list output()', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    const fixture = TestBed.createComponent(Tickets);
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
    const fixture = TestBed.createComponent(Tickets);
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

    const fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // Restored on init: search "email" + status "done" narrows to one ticket.
    expect(searchInput(host).value).toBe('email');
    expect(rows(host).length).toBe(1);
    expect(host.textContent).toContain('Email delivery service latency above SLA');

    // The effect mirrors new changes back to localStorage.
    searchInput(host).value = 'webhook';
    searchInput(host).dispatchEvent(new Event('input'));
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
    const fixture = TestBed.createComponent(Tickets);
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
