import { provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TestBed } from '@angular/core/testing';
import { MOCK_TICKETS } from '../ticket';
import { NewTicket } from './new-ticket';

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
function settle(): Promise<void> {
  return new Promise((r) => setTimeout(r, 30));
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

  it('keeps the title required and reports it after a failed submit', async () => {
    const { comp, host, cd } = await setup();

    // Invalid before any interaction, but not "touched", so no error is shown.
    expect(comp.form.title().invalid()).toBe(true);
    expect(host.querySelector('.summary')).toBeNull();

    // A submit attempt is blocked (invalid) and marks the fields touched.
    (host.querySelector('form')! as HTMLFormElement).requestSubmit();
    cd();
    await settle();
    cd();

    expect(comp.form.title().touched()).toBe(true);
    expect(host.querySelector('.summary')?.textContent).toContain('Please fix');
    // The field-level error is now visible in the mat-form-field.
    expect(host.querySelector('mat-error')?.textContent?.trim()).toBe('This field is required.');
  });

  it('lets the "Pre-fill from template" button set nested values programmatically', async () => {
    const { comp, host, cd } = await setup();

    prefillButton(host).click();
    cd();
    await settle();
    cd();

    // The model (single source of truth) is updated for every leaf, nested ones
    // included.
    expect(comp.model().title).toBe('Payment gateway returning 5xx during peak');
    expect(comp.model().priority).toBe('high');
    expect(comp.model().assignee.email).toBe('piotr.wisniewski@opsboard.dev');
    expect(comp.model().contact.preferredChannel).toBe('phone');
    expect(comp.model().incident.affectedUsers).toBe(350);
    expect(comp.model().incident.serviceUnavailable).toBe(true);
    expect(comp.model().resolution.workaroundAvailable).toBe(true);
    expect(comp.model().resolution.workaround).toContain('secondary provider');

    // The DOM follows: the title input shows the pre-filled value and the
    // conditional "Workaround" textarea appeared.
    expect(titleInput(host).value).toBe('Payment gateway returning 5xx during peak');
    expect(host.querySelectorAll('textarea[matInput]').length).toBe(2);
    expect(comp.form().invalid()).toBe(false);
  });

  it('creates the ticket on a valid submit, appends it, and navigates to /tickets', async () => {
    const { comp, host, cd } = await setup();
    const router = TestBed.inject(Router);
    const snackBar = TestBed.inject(MatSnackBar);
    const openSpy = vi.spyOn(snackBar, 'open') as unknown as ReturnType<typeof vi.fn>;
    openSpy.mockReturnValue({ close: vi.fn() } as never);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const before = MOCK_TICKETS.length;
    const nextId = Math.max(0, ...MOCK_TICKETS.map((t) => t.id)) + 1;
    prefillButton(host).click(); // fills every required field
    cd();
    await settle();
    cd();

    (host.querySelector('form')! as HTMLFormElement).requestSubmit();
    cd();
    await settle();
    cd();

    expect(navSpy).toHaveBeenCalledWith(['/tickets']);
    expect(openSpy).toHaveBeenCalledWith(`Ticket #${nextId} created.`, 'Close', {
      duration: 3500,
    });
    expect(comp.model().title).toBe('Payment gateway returning 5xx during peak');
    // A new ticket was appended to the shared mock data source.
    expect(MOCK_TICKETS.length).toBe(before + 1);
    expect(MOCK_TICKETS[MOCK_TICKETS.length - 1]).toMatchObject({
      id: nextId,
      title: 'Payment gateway returning 5xx during peak',
      status: 'new',
      priority: 'high',
    });
  });
});
