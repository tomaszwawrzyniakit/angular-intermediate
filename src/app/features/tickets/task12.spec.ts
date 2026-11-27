import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { MOCK_TICKETS } from '../../domain/tickets';
import { mockTicketInterceptor } from '../../mock/mock-http';
import { NewTicket, TicketFormModel } from './new-ticket';
import { Tickets } from './tickets';

/**
 * Task 12 — the focused, high-value tests for the four-day course. Each test
 * maps to a teaching point from the plan and drives the real component +
 * real pipeline (no fake abstractions). Timers are faked because the mock
 * backend introduces a 700 ms round-trip, so `vi.runAllTimersAsync()` flushes
 * the debounce + latency deterministically.
 */
describe('Task 12 — focused training examples', () => {
  describe('query → computed ticket list', () => {
    let fixture: ComponentFixture<Tickets>;

    beforeEach(async () => {
      localStorage.clear();
      vi.useFakeTimers();
      await TestBed.configureTestingModule({
        imports: [Tickets],
        providers: [
          provideRouter([]),
          provideHttpClient(withInterceptors([mockTicketInterceptor])),
        ],
      }).compileComponents();
    });

    afterEach(() => {
      fixture.destroy();
      vi.useRealTimers();
    });

    function rows(): NodeListOf<Element> {
      return fixture.nativeElement.querySelectorAll('.ticket-row');
    }

    it('re-derives the list whenever the status filter (signal) changes', async () => {
      fixture = TestBed.createComponent(Tickets);
      fixture.detectChanges();
      await vi.runAllTimersAsync(); // flush the initial search
      fixture.detectChanges();
      expect(rows().length).toBe(MOCK_TICKETS.length);

      // The computed `statusFiltered` reads the `statusFilter` signal: set it,
      // and the derived list must shrink to just the matching tickets. No new
      // HTTP request is fired — the same in-memory results are re-filtered.
      fixture.componentInstance.statusFilter.set('progress');
      fixture.detectChanges();
      const progress = MOCK_TICKETS.filter((t) => t.status === 'progress').length;
      expect(progress).toBeGreaterThan(0);
      expect(rows().length).toBe(progress);

      // A different status re-derives again, proving the computed tracks the
      // signal rather than a one-shot snapshot.
      fixture.componentInstance.statusFilter.set('new');
      fixture.detectChanges();
      const fresh = MOCK_TICKETS.filter((t) => t.status === 'new').length;
      expect(rows().length).toBe(fresh);
    });
  });

  describe('rapid searches → newest result wins', () => {
    let fixture: ComponentFixture<Tickets>;

    beforeEach(async () => {
      localStorage.clear();
      vi.useFakeTimers();
      await TestBed.configureTestingModule({
        imports: [Tickets],
        providers: [
          provideRouter([]),
          provideHttpClient(withInterceptors([mockTicketInterceptor])),
        ],
      }).compileComponents();
    });

    afterEach(() => {
      fixture.destroy();
      vi.useRealTimers();
    });

    function rows(): NodeListOf<Element> {
      return fixture.nativeElement.querySelectorAll('.ticket-row');
    }

    it('cancels the in-flight request and keeps only the newest query result', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      fixture = TestBed.createComponent(Tickets);
      fixture.detectChanges();
      await vi.runAllTimersAsync();
      fixture.detectChanges();

      // Two quick keystrokes: "log" then "login". The debounce (300 ms) fires
      // for "log", starting a 700 ms request that would list two tickets
      // (#2 logging cluster, #3 login flow). Before it resolves the query
      // becomes "login", whose debounce fires 300 ms later and `switchMap`
      // cancels the "log" request — so only the newest result may win.
      fixture.componentInstance.search.set('log');
      await vi.advanceTimersByTimeAsync(300); // debounce → GET ?q=log (in flight)
      fixture.componentInstance.search.set('login');
      await vi.advanceTimersByTimeAsync(300); // debounce → switchMap cancels ?q=log

      // The stale request was genuinely cancelled (the pipeline's tap logs it).
      expect(log).toHaveBeenCalledWith(
        '[tickets] cancelled stale search GET /api/tickets?q=log',
      );

      // Let the surviving request resolve. The list must show the newest
      // query's results ("login" → 1 ticket) — never the cancelled "log"
      // results (2 tickets), which is what makes "newest wins" observable.
      await vi.runAllTimersAsync();
      fixture.detectChanges();
      const login = MOCK_TICKETS.filter(
        (t) =>
          t.title.toLowerCase().includes('login') ||
          t.description.toLowerCase().includes('login') ||
          (t.assignee?.toLowerCase().includes('login') ?? false),
      );
      const logMatches = MOCK_TICKETS.filter(
        (t) =>
          t.title.toLowerCase().includes('log') ||
          t.description.toLowerCase().includes('log') ||
          (t.assignee?.toLowerCase().includes('log') ?? false),
      );
      expect(login.length).toBe(1); // "login" → ticket #3
      expect(logMatches.length).toBeGreaterThan(1); // "log" → #2 and #3
      expect(rows().length).toBe(login.length);
      const rendered = Array.from(rows()).map((row) =>
        row.querySelector('.text-truncate')?.textContent?.trim(),
      );
      for (const ticket of login) {
        expect(rendered).toContain(ticket.title);
      }
      log.mockRestore();
    });
  });

  describe('nested Signal Form business rule', () => {
    let fixture: ComponentFixture<NewTicket>;

    beforeEach(async () => {
      vi.useFakeTimers();
      await TestBed.configureTestingModule({
        imports: [NewTicket],
        providers: [provideRouter([{ path: '**', redirectTo: '' }])],
      }).compileComponents();
    });

    afterEach(() => {
      fixture.destroy();
      vi.useRealTimers();
      document.getElementById('ticket-created-toast')?.remove();
    });

    /** A fully valid base value the business rule can be toggled against. */
    function baseValue(priority: 'low' | 'medium' | 'high'): TicketFormModel {
      return {
        title: 'Database replication stalled overnight',
        description:
          'The primary to replica replication lag keeps growing and read traffic is hitting the primary.',
        priority,
        assignee: { name: 'Marta Kowalska', email: 'marta.kowalska@example.com' },
        contact: {
          name: 'Lena Fischer',
          email: 'lena.fischer@example.com',
          phone: '',
          preferredChannel: 'email',
        },
        incident: {
          affectedUsers: 120,
          startedAt: '2026-01-12T09:30',
          serviceUnavailable: true,
        },
        resolution: { workaroundAvailable: false, workaround: '' },
      };
    }

    it('marks the form invalid when outage + >100 users but priority is not high', async () => {
      fixture = TestBed.createComponent(NewTicket);
      fixture.detectChanges();

      // Drive the Signal Form programmatically through the root field's
      // writable `value` signal (the same API `prefill()` uses).
      fixture.componentInstance.form().value.set(baseValue('medium'));
      await vi.runAllTimersAsync(); // settle the async duplicate check (title is unique)
      fixture.detectChanges();

      // The business rule: serviceUnavailable && affectedUsers > 100 &&
      // priority !== 'high' → invalid, with the exact teaching message.
      const incident = fixture.componentInstance.form.incident();
      expect(incident.value().serviceUnavailable).toBe(true);
      expect(incident.value().affectedUsers).toBe(120);
      expect(incident.invalid()).toBe(true);
      expect(
        incident.errors().some((e) => e.message === 'Outage with more than 100 affected users must be high priority.'),
      ).toBe(true);
      // The error is reported on the root form too (a tree-level rule), so a
      // failed submit lists it under its field label.
      const root = fixture.componentInstance.form();
      expect(root.invalid()).toBe(true);
      void fixture.componentInstance.onSubmit();
      fixture.detectChanges();
      expect(document.body.textContent).toContain('not valid yet');
      expect(document.body.textContent).toContain(
        'Outage with more than 100 affected users must be high priority.',
      );
    });

    it('clears the rule when the priority is raised to high', async () => {
      fixture = TestBed.createComponent(NewTicket);
      fixture.detectChanges();
      fixture.componentInstance.form().value.set(baseValue('medium'));
      await vi.runAllTimersAsync();
      expect(
        fixture.componentInstance.form.incident().errors().some(
          (e) => e.message === 'Outage with more than 100 affected users must be high priority.',
        ),
      ).toBe(true);

      // The same outage, but now high priority → the business rule no longer
      // fires and the incident field is valid again.
      fixture.componentInstance.form().value.set(baseValue('high'));
      await vi.runAllTimersAsync();
      fixture.detectChanges();
      expect(
        fixture.componentInstance.form.incident().errors().some(
          (e) => e.message === 'Outage with more than 100 affected users must be high priority.',
        ),
      ).toBe(false);
    });
  });
});
