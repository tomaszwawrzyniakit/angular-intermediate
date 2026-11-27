import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { MOCK_TICKETS } from '../../domain/tickets';
import { NewTicket } from './new-ticket';

/**
 * Task 08 — exercises the advanced validation catalogue on the nested Signal
 * Form: basic rules (min/length/email), the conditional rule (high → 50-char
 * description), the cross-field rule (phone channel → phone required), the
 * business rule (outage + >100 users → high priority), the conditional
 * workaround section (hidden → excluded from validation), the async
 * duplicate/similar-title check, and the mock server-side rejection.
 *
 * Timers: the async validators (500 ms debounce + 900 ms mock round-trip) and
 * the submit action (700 ms) all schedule `setTimeout`s, so the tests run
 * under `vi.useFakeTimers()` and flush them with `vi.runAllTimersAsync()` —
 * the same pattern the Task 05/06 specs use against the mock backend.
 *
 * A valid submit must be *started* (not awaited) before advancing the timers:
 * `onSubmit()` awaits the 700 ms `action` timer internally, so awaiting it
 * directly would block the test body and the timer would never fire.
 */
describe('NewTicket (advanced Signal Form validation)', () => {
  let fixture: ComponentFixture<NewTicket>;

  // MOCK_TICKETS is module-level (shared) state; a valid submit pushes a row.
  const BASE_TICKET_COUNT = MOCK_TICKETS.length;

  beforeEach(async () => {
    vi.useFakeTimers();
    // NewTicket injects the Router (it navigates to /tickets on a valid submit).
    // The wildcard route makes that navigation succeed in the test.
    await TestBed.configureTestingModule({
      imports: [NewTicket],
      providers: [provideRouter([{ path: '**', redirectTo: '' }])],
    }).compileComponents();
    MOCK_TICKETS.length = BASE_TICKET_COUNT;
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
    MOCK_TICKETS.length = BASE_TICKET_COUNT;
    document.getElementById('ticket-created-toast')?.remove();
  });

  function setup() {
    const initialCount = MOCK_TICKETS.length;
    fixture = TestBed.createComponent(NewTicket);
    fixture.detectChanges();
    return { initialCount };
  }

  function setValue(id: string, value: string): void {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Blur by dispatching the event directly: the [formField] directive listens
  // for the native `blur` to mark the field touched, and `el.blur()` only
  // fires it when the element is focused (unreliable in a unit test).
  function blur(id: string): void {
    (document.getElementById(id) as HTMLElement).dispatchEvent(new Event('blur'));
  }

  // The [formField] binding reads the native `input` event; checkboxes also
  // fire `change`, so send both to be safe.
  function toggleSwitch(id: string, checked: boolean): void {
    const el = document.getElementById(id) as HTMLInputElement;
    el.checked = checked;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function hasClass(el: HTMLElement | null, className: string): boolean {
    return el?.classList.contains(className) ?? false;
  }

  /** Fill the six basic-required fields so only the targeted rule fails. */
  function fillBasics(title: string, description: string): void {
    setValue('ticket-title', title);
    setValue('ticket-description', description);
    setValue('assignee-name', 'Marta');
    setValue('assignee-email', 'marta@example.com');
    setValue('contact-name', 'Lena');
    setValue('contact-email', 'lena@example.com');
  }

  it('flags a too-short title only after the field is touched', () => {
    setup();
    // Untouched: no error text even though the title is empty.
    expect(hasClass(document.getElementById('ticket-title'), 'is-invalid')).toBe(false);
    expect(document.body.textContent).not.toContain('A title is required.');

    const title = document.getElementById('ticket-title') as HTMLInputElement;
    title.value = 'abc';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    title.dispatchEvent(new Event('blur')); // blur marks the field touched
    fixture.detectChanges();
    // Touched and too short (basic rule: minLength 5) -> the feedback shows.
    expect(hasClass(title, 'is-invalid')).toBe(true);
    expect(document.body.textContent).toContain('Title needs at least 5 characters.');
  });

  it('flags an invalid contact email with the email rule', () => {
    setup();
    setValue('contact-email', 'not-an-email');
    blur('contact-email');
    fixture.detectChanges();
    expect(hasClass(document.getElementById('contact-email'), 'is-invalid')).toBe(true);
    expect(document.body.textContent).toContain('not a valid email address');
  });

  it('blocks submit with a conditional rule: high priority needs a 50-char description', () => {
    setup();
    fillBasics('Login page returns a 500 error', 'Too short for high priority.');
    setValue('ticket-priority', 'high');
    fixture.detectChanges();
    // The description fails the conditional 50-char rule, so the submit is
    // rejected and the alert lists it.
    void fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(document.body.textContent).toContain('not valid yet');
    expect(document.body.textContent).toContain('at least 50 characters');
  });

  it('blocks submit with a cross-field rule: phone channel requires a phone number', () => {
    setup();
    fillBasics('Login page returns a 500 error', 'Every login attempt fails with a 500 error page shown.');
    setValue('contact-channel', 'phone');
    fixture.detectChanges();
    // The phone input stays empty -> the cross-field rule fails on submit.
    void fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(document.body.textContent).toContain('not valid yet');
    expect(document.body.textContent).toContain('required when phone is the preferred channel');
  });

  it('blocks submit with a business rule: outage + >100 users forces high priority', () => {
    setup();
    fillBasics('Login page returns a 500 error', 'Every login attempt fails with a 500 error page shown.');
    toggleSwitch('incident-unavailable', true);
    setValue('incident-users', '120');
    fixture.detectChanges();
    // Priority stays 'medium' -> the business rule fails on submit.
    void fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(document.body.textContent).toContain('not valid yet');
    expect(document.body.textContent).toContain('must be high priority');
  });

  it('does not block a valid submit while the workaround field is hidden', async () => {
    const { initialCount } = setup();
    fixture.componentInstance.prefill();
    // Turn the switch off: the workaround section disappears and its value no
    // longer matters (hidden fields are excluded from validation).
    toggleSwitch('resolution-workaround-available', false);
    fixture.detectChanges();
    expect(document.getElementById('resolution-workaround')).toBeNull();

    // Let the async title check settle, then start the (valid) submit and
    // advance the 700 ms action timer before awaiting its result.
    await vi.runAllTimersAsync();
    fixture.detectChanges();
    const pending = fixture.componentInstance.onSubmit();
    await vi.runAllTimersAsync();
    const ok = await pending;
    fixture.detectChanges();
    expect(ok).toBe(true);
    expect(MOCK_TICKETS.length).toBe(initialCount + 1);
  });

  it('requires the workaround (minLength 20) once the conditional section is shown', () => {
    setup();
    toggleSwitch('resolution-workaround-available', true);
    fixture.detectChanges();
    expect(document.getElementById('resolution-workaround')).toBeTruthy();

    const workaround = document.getElementById('resolution-workaround') as HTMLTextAreaElement;
    workaround.value = 'too short';
    workaround.dispatchEvent(new Event('input', { bubbles: true }));
    workaround.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(hasClass(workaround, 'is-invalid')).toBe(true);
    expect(document.body.textContent).toContain('The workaround needs at least 20 characters.');
  });

  it('raises a blocking duplicate error when the title exactly matches an existing ticket', async () => {
    const { initialCount } = setup();
    fixture.componentInstance.prefill();
    // An exact title match against mock ticket #1.
    setValue('ticket-title', 'Payment gateway timeouts in production');
    fixture.detectChanges();
    await vi.runAllTimersAsync(); // 500 ms debounce + 900 ms mock round-trip
    fixture.detectChanges();

    expect(hasClass(document.getElementById('ticket-title'), 'is-invalid')).toBe(true);
    expect(document.body.textContent).toContain('already exists (#1)');
    // The form is now invalid -> the submit must not create a ticket.
    const pending = fixture.componentInstance.onSubmit();
    await vi.runAllTimersAsync();
    const ok = await pending;
    fixture.detectChanges();
    expect(ok).toBe(false);
    expect(MOCK_TICKETS.length).toBe(initialCount);
  });

  it('shows a non-blocking similar-incident warning for a close (but not exact) title', async () => {
    setup();
    setValue('ticket-title', 'Disk usage climbing on the logging cluster again');
    fixture.detectChanges();
    await vi.runAllTimersAsync();
    fixture.detectChanges();

    // Warning, not an error: the input is valid, the text is a text-warn hint.
    expect(hasClass(document.getElementById('ticket-title'), 'is-invalid')).toBe(false);
    expect(document.body.textContent).toContain('Similar incident:');
    expect(document.body.textContent).toContain('Disk usage above 90% on logging cluster');
  });

  it('shows a server-side rejection under the title when the title contains a test marker', async () => {
    const { initialCount } = setup();
    fixture.componentInstance.prefill();
    setValue('ticket-title', 'TEST: staging smoke run after deploy');
    fixture.detectChanges();
    await vi.runAllTimersAsync(); // settle the async duplicate check first
    fixture.detectChanges();

    // The title now passes every client-side rule, so the submit runs the
    // (server-side) action, which rejects the 'TEST' marker after 700 ms.
    const pending = fixture.componentInstance.onSubmit();
    await vi.runAllTimersAsync();
    const ok = await pending;
    fixture.detectChanges();

    expect(ok).toBe(false);
    expect(hasClass(document.getElementById('ticket-title'), 'is-invalid')).toBe(true);
    expect(document.body.textContent).toContain('The backend rejected this title');
    expect(MOCK_TICKETS.length).toBe(initialCount);
  });

  it('adds a ticket to the mock data on a fully valid submit', async () => {
    const { initialCount } = setup();
    fixture.componentInstance.prefill();
    fixture.detectChanges();
    // Let the async duplicate check settle (the title is not a duplicate) so
    // the form is valid — not just not-invalid.
    await vi.runAllTimersAsync();
    fixture.detectChanges();

    const pending = fixture.componentInstance.onSubmit();
    await vi.runAllTimersAsync();
    const ok = await pending;
    fixture.detectChanges();
    expect(ok).toBe(true);
    expect(MOCK_TICKETS.length).toBe(initialCount + 1);
    const created = MOCK_TICKETS[MOCK_TICKETS.length - 1];
    expect(created.title).toContain('Payment provider outage');
    expect(created.priority).toBe('high');
  });

  it('lists every failing rule with its field label after a failed submit', () => {
    setup();
    void fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    // onInvalid flagged the attempt: the alert lists field-labelled messages
    // from the root field's errorSummary().
    expect(document.body.textContent).toContain('not valid yet');
    expect(document.body.textContent).toContain('ticket.title');
    expect(document.body.textContent).toContain('ticket.contact.email');
    expect(document.body.textContent).toContain('A title is required.');
  });
});
