import { provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TestBed } from '@angular/core/testing';
import { MOCK_TICKETS } from '../ticket';
import { NewTicket } from './new-ticket';

const createdTickets: number[] = []; // ids created by tests, cleaned up after each

function buttons(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll('button')) as HTMLButtonElement[];
}

function prefillButton(host: HTMLElement): HTMLButtonElement {
  return buttons(host).find((b) => b.textContent?.includes('Pre-fill'))!;
}

function titleInput(host: HTMLElement): HTMLInputElement {
  return host.querySelector('input[matInput]')! as HTMLInputElement;
}

function inputByLabel(host: HTMLElement, label: string): HTMLInputElement {
  const ff = Array.from(host.querySelectorAll('mat-form-field')).find((f) =>
    f.textContent?.includes(label),
  );
  return ff?.querySelector('input[matInput]') as HTMLInputElement;
}

/** Let queued microtasks/effects settle so programmatic updates flush to the UI. */
function settle(ms = 30): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Helper: fill the form with a valid title/description so the "Create ticket"
 * button becomes enabled and a submit can reach the mock API.
 */
async function fillValidForm(comp: NewTicket, host: HTMLElement, cd: () => void) {
  prefillButton(host).click();
  cd();
  await settle(80);
  cd();
  // The prefill uses an exact-duplicate title on the 2nd call; override it so
  // the async duplicate check passes.
  const uniqueTitle = `Unique ticket title ${Date.now()}`;
  comp.form.title().value.set(uniqueTitle);
  cd();
  await settle(650); // let the async title check settle
  cd();
}

describe('NewTicket (Signal Form)', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [NewTicket],
      providers: [provideRouter([]), MatSnackBar],
    }).compileComponents();
    const fixture = TestBed.createComponent(NewTicket);
    fixture.detectChanges();
    return {
      comp: fixture.componentInstance,
      host: fixture.nativeElement as HTMLElement,
      cd: () => fixture.detectChanges(),
    };
  }

  beforeEach(() => {
    createdTickets.length = 0;
  });

  afterEach(() => {
    // Remove any tickets the tests appended so cross-test state stays clean.
    while (createdTickets.length) {
      const id = createdTickets.pop()!;
      const i = MOCK_TICKETS.findIndex((t) => t.id === id);
      if (i >= 0) MOCK_TICKETS.splice(i, 1);
    }
  });

  it('renders the four grouped Material cards', async () => {
    const { host } = await setup();
    const titles = Array.from(host.querySelectorAll('mat-card-title')).map((t) =>
      t.textContent?.trim(),
    );
    expect(titles).toEqual(['Ticket', 'Contact', 'Incident', 'Resolution']);
  });

  it('binds nested fields two-way (DOM -> model, programmatic -> DOM)', async () => {
    const { comp, host, cd } = await setup();

    // DOM -> model: type a title into the (native) input.
    const title = titleInput(host);
    title.value = 'Database is on fire';
    title.dispatchEvent(new Event('input'));
    cd();
    expect(comp.model().title).toBe('Database is on fire');

    // Programmatic -> DOM: set a NESTED leaf (contact.email) from code.
    comp.form.contact.email().value.set('ops@opsboard.dev');
    cd();
    expect(comp.model().contact.email).toBe('ops@opsboard.dev');
    expect(inputByLabel(host, 'Contact email').value).toBe('ops@opsboard.dev');
  });

  it('enforces the basic title rules (required + min 5 + max 100)', async () => {
    const { comp, cd } = await setup();

    // Empty title: required.
    expect(comp.form.title().invalid()).toBe(true);
    expect(comp.form.title().errors()[0]?.message).toBe('Title is required.');

    // 4 chars: below minLength 5.
    comp.form.title().value.set('abcd');
    cd();
    expect(comp.form.title().invalid()).toBe(true);
    expect(comp.form.title().errors()[0]?.message).toContain('at least 5');

    // 101 chars: above maxLength 100.
    comp.form.title().value.set('a'.repeat(101));
    cd();
    expect(comp.form.title().invalid()).toBe(true);
    expect(comp.form.title().errors()[0]?.message).toContain('at most 100');

    // 5 chars: passes the length rules.
    comp.form.title().value.set('abcde');
    cd();
    expect(comp.form.title().invalid()).toBe(false);
  });

  it('enforces the basic description rules (required + min 20)', async () => {
    const { comp, cd } = await setup();

    expect(comp.form.description().invalid()).toBe(true);
    comp.form.description().value.set('too short');
    cd();
    expect(comp.form.description().invalid()).toBe(true);
    expect(comp.form.description().errors()[0]?.message).toContain('at least 20');

    comp.form.description().value.set('A sufficiently long description here.');
    cd();
    expect(comp.form.description().invalid()).toBe(false);
  });

  it('enforces the basic contact email rules (required + email format)', async () => {
    const { comp, cd } = await setup();

    expect(comp.form.contact.email().invalid()).toBe(true);
    comp.form.contact.email().value.set('not-an-email');
    cd();
    expect(comp.form.contact.email().invalid()).toBe(true);
    expect(comp.form.contact.email().errors()[0]?.message).toContain('valid e-mail');

    comp.form.contact.email().value.set('ops@opsboard.dev');
    cd();
    expect(comp.form.contact.email().invalid()).toBe(false);
  });

  it('applies the conditional rule: high priority -> description >= 50', async () => {
    const { comp, cd } = await setup();

    // 30-char description is fine at the default medium priority.
    const desc30 = 'x'.repeat(30);
    comp.form.description().value.set(desc30);
    comp.form.priority().value.set('medium');
    cd();
    expect(comp.form.description().invalid()).toBe(false);

    // The same 30-char description is invalid once priority is high.
    comp.form.priority().value.set('high');
    cd();
    expect(comp.form.description().invalid()).toBe(true);
    const highPriorityMsg = comp.form.description().errors()[0]?.message ?? '';
    expect(highPriorityMsg).toContain('50 characters');

    // A 50+ char description satisfies the conditional rule at high priority.
    comp.form.description().value.set('x'.repeat(50));
    cd();
    expect(comp.form.description().invalid()).toBe(false);
  });

  it('applies the cross-field rule: preferredChannel phone -> phone required', async () => {
    const { comp, cd } = await setup();

    // No phone set: valid when the channel is email.
    comp.form.contact.phone().value.set('');
    comp.form.contact.preferredChannel().value.set('email');
    cd();
    expect(comp.form.contact.phone().invalid()).toBe(false);

    // The same empty phone is required once the channel is phone.
    comp.form.contact.preferredChannel().value.set('phone');
    cd();
    expect(comp.form.contact.phone().invalid()).toBe(true);
    expect(comp.form.contact.phone().errors()[0]?.message).toContain('Phone');

    // A valid phone satisfies the cross-field rule.
    comp.form.contact.phone().value.set('+48 123 456 789');
    cd();
    expect(comp.form.contact.phone().invalid()).toBe(false);
  });

  it('applies the business rule: outage + >100 users -> priority must be high', async () => {
    const { comp, cd } = await setup();

    // Small incident: medium priority is allowed.
    comp.form.incident.serviceUnavailable().value.set(true);
    comp.form.incident.affectedUsers().value.set(50);
    comp.form.priority().value.set('medium');
    cd();
    expect(comp.form.priority().invalid()).toBe(false);

    // Big incident: medium priority is rejected by the business rule.
    comp.form.incident.affectedUsers().value.set(200);
    cd();
    expect(comp.form.priority().invalid()).toBe(true);
    expect(comp.form.priority().errors()[0]?.message).toContain('high priority');

    // Switching to high priority satisfies the business rule.
    comp.form.priority().value.set('high');
    cd();
    expect(comp.form.priority().invalid()).toBe(false);
  });

  it('hides the workaround field and its rules while the checkbox is off', async () => {
    const { comp, host, cd } = await setup();

    // Hidden by default: the textarea is not rendered and the field is hidden.
    expect(host.querySelectorAll('textarea[matInput]').length).toBe(1); // only the description
    expect(comp.form.resolution.workaround().hidden()).toBe(true);

    // A hidden workaround must not block the whole form (other fields valid).
    // Its rules are inactive while hidden, so the empty workaround is not
    // invalid and the root form is valid.
    comp.form.title().value.set('Hidden workaround ok');
    comp.form.description().value.set('A sufficiently long description here.');
    comp.form.contact.email().value.set('ops@opsboard.dev');
    cd();
    expect(comp.form.resolution.workaround().invalid()).toBe(false); // rules inactive while hidden
    expect(comp.form().invalid()).toBe(false);

    // Turning the checkbox on shows the field and makes the rules active.
    comp.form.resolution.workaroundAvailable().value.set(true);
    cd();
    expect(host.querySelectorAll('textarea[matInput]').length).toBe(2);
    expect(comp.form.resolution.workaround().hidden()).toBe(false);
    expect(comp.form.resolution.workaround().invalid()).toBe(true);
    expect(comp.form().invalid()).toBe(true); // now it blocks

    // Filling it in clears the rule.
    comp.form.resolution.workaround().value.set('A sufficiently long workaround here.');
    cd();
    expect(comp.form.resolution.workaround().invalid()).toBe(false);
    expect(comp.form().invalid()).toBe(false);
  });

  it('runs the async duplicate check and blocks an exact duplicate', async () => {
    const { comp, cd } = await setup();

    // An exact match against an existing mock ticket.
    const existing = MOCK_TICKETS[0].title;
    comp.form.title().value.set(existing);
    cd();
    await settle(650); // wait past the 500 ms mock delay
    cd();

    expect(comp.form.title().invalid()).toBe(true);
    expect(comp.form.title().errors()[0]?.kind).toBe('duplicateTitle');
    expect(comp.form.title().errors()[0]?.message).toContain('already exists');
  });

  it('shows a non-blocking similar-incident warning for a near-duplicate title', async () => {
    const { comp, host, cd } = await setup();

    // A title sharing a 4+ letter word with an existing ticket but not exact.
    // Ticket 1: "Production database connection pool exhausted"
    comp.form.title().value.set('Production database connection pool');
    cd();
    await settle(650);
    cd();

    // Not an exact duplicate -> the title field itself is valid.
    expect(comp.form.title().invalid()).toBe(false);
    // The non-blocking warning hint is shown.
    const hint = host.querySelector('mat-hint.warning');
    expect(hint).toBeTruthy();
    expect(hint?.textContent).toContain('Similar incident');
  });

  it('blocks submit on a server-side rejection (title contains TEST)', async () => {
    const { comp, host, cd } = await setup();
    const snackBar = TestBed.inject(MatSnackBar);
    const openSpy = vi.spyOn(snackBar, 'open');
    openSpy.mockReturnValue({ close: vi.fn() } as never);

    const before = MOCK_TICKETS.length;
    await fillValidForm(comp, host, cd);
    // Overwrite the title with one that trips the mock server rule.
    comp.form.title().value.set('TEST deploy pipeline broken');
    cd();
    await settle(650); // async check for the TEST title (not a duplicate)
    cd();

    (host.querySelector('form')! as HTMLFormElement).requestSubmit();
    cd();
    await settle(800); // mock API delay (700 ms)
    cd();

    // The server-side error is attached to the title field.
    expect(comp.form.title().errors()[0]?.kind).toBe('serverRejected');
    expect(comp.form.title().errors()[0]?.message).toContain('TEST');
    // Nothing was created and no success snackbar.
    expect(MOCK_TICKETS.length).toBe(before);
    expect(openSpy).not.toHaveBeenCalledWith(expect.stringContaining('created'));
  });

  it('creates the ticket on a valid submit, appends it, and navigates to /tickets', async () => {
    const { comp, host, cd } = await setup();
    const router = TestBed.inject(Router);
    const snackBar = TestBed.inject(MatSnackBar);
    const openSpy = vi.spyOn(snackBar, 'open') as unknown as ReturnType<typeof vi.fn>;
    openSpy.mockReturnValue({ close: vi.fn() } as never);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const before = MOCK_TICKETS.length;
    await fillValidForm(comp, host, cd);
    const uniqueTitle = comp.form.title().value();

    (host.querySelector('form')! as HTMLFormElement).requestSubmit();
    cd();
    await settle(800); // mock API delay
    cd();

    expect(navSpy).toHaveBeenCalledWith(['/tickets']);
    const nextId = Math.max(0, ...MOCK_TICKETS.map((t) => t.id));
    expect(openSpy).toHaveBeenCalledWith(`Ticket #${nextId} created.`, 'Close', {
      duration: 3500,
    });
    expect(comp.model().title).toBe(uniqueTitle);
    expect(MOCK_TICKETS.length).toBe(before + 1);
    createdTickets.push(nextId);
  });
});
