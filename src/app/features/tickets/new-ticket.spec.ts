import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_TICKETS } from '../../domain/tickets';
import { NewTicket } from './new-ticket';

/**
 * Task 07 — exercises the nested Signal Form: the `form()` tree renders real
 * Bootstrap controls bound with `[formField]`, programmatic value updates
 * (pre-fill) flow from the root `value` signal into the inputs, and a valid
 * submit adds a ticket to the shared mock data.
 */
describe('NewTicket (nested Signal Form)', () => {
  // MOCK_TICKETS is module-level (shared) state; a valid submit pushes a row.
  const BASE_TICKET_COUNT = MOCK_TICKETS.length;

  beforeEach(async () => {
    // NewTicket injects the Router (it navigates to /tickets on a valid submit).
    // The wildcard route makes that navigation succeed in the test.
    await TestBed.configureTestingModule({
      imports: [NewTicket],
      providers: [provideRouter([{ path: '**', redirectTo: '' }])],
    }).compileComponents();
    MOCK_TICKETS.length = BASE_TICKET_COUNT;
  });

  afterEach(() => {
    MOCK_TICKETS.length = BASE_TICKET_COUNT;
    document.getElementById('ticket-created-toast')?.remove();
  });

  function setup() {
    const initialCount = MOCK_TICKETS.length;
    const fixture = TestBed.createComponent(NewTicket);
    fixture.detectChanges();
    return { fixture, initialCount };
  }

  function valueOf(id: string): string {
    return (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  }

  it('renders the four Bootstrap section cards with their labels', () => {
    setup();
    const text = document.body.textContent ?? '';
    expect(text).toContain('Ticket');
    expect(text).toContain('Contact');
    expect(text).toContain('Incident');
    expect(text).toContain('Resolution');
    // The form is wrapped by the [formRoot] directive (Signal Forms).
    expect(document.querySelector('form')).toBeTruthy();
  });

  it('pre-fills the whole nested model into the bound controls', () => {
    const { fixture } = setup();
    fixture.componentInstance.prefill();
    fixture.detectChanges();

    expect(valueOf('ticket-title')).toContain('Payment provider outage');
    // Nested field access: form.contact.email() flows into the bound input.
    expect(valueOf('contact-email')).toBe('lena.fischer@example.com');
    expect(valueOf('contact-phone')).toBe('+48 512 345 678');
    expect(valueOf('incident-users')).toBe('120');
    // Boolean field: the switch is checked after pre-fill.
    const switch_ = document.getElementById('incident-unavailable') as HTMLInputElement;
    expect(switch_.checked).toBe(true);
    // Conditional UI: the workaround textarea appears once the switch is on.
    expect(valueOf('resolution-workaround')).toContain('invoice-based checkout');
  });

  it('adds a ticket to the mock data on a valid submit', () => {
    const { fixture, initialCount } = setup();
    fixture.componentInstance.prefill();
    fixture.componentInstance.onSubmit();

    expect(MOCK_TICKETS.length).toBe(initialCount + 1);
    const created = MOCK_TICKETS[MOCK_TICKETS.length - 1];
    expect(created.id).toBe(initialCount + 1);
    expect(created.status).toBe('new');
    expect(created.priority).toBe('high');
    expect(created.assignee).toBe('Marta Kowalska');
  });

  it('does not add a ticket when the form is invalid', () => {
    const { fixture, initialCount } = setup();
    // No pre-fill: every required field is empty -> invalid.
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(MOCK_TICKETS.length).toBe(initialCount);
    // The invalid alert lists the missing fields.
    expect(document.body.textContent).toContain('not valid yet');
  });
});
