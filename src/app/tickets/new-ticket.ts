import { Component, computed, inject, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  email,
  FieldState,
  form,
  FormField,
  FormRoot,
  hidden,
  max,
  maxLength,
  min,
  minLength,
  pattern,
  required,
  validate,
  validateAsync,
  SchemaPathTree,
} from '@angular/forms/signals';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MOCK_TICKETS, Ticket } from '../ticket';

/**
 * The data the form edits. A `signal()` holds this model and `form()` builds a
 * `FieldTree` over it (Task 07 — Signal Forms).
 *
 * The tree mirrors the structure: `form.title`, `form.assignee.email`,
 * `form.contact.preferredChannel`, `form.incident.startedAt`, and so on.
 */
interface TicketFormModel {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee: {
    name: string;
    email: string;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    preferredChannel: 'email' | 'phone';
  };
  incident: {
    affectedUsers: number;
    startedAt: string;
    serviceUnavailable: boolean;
  };
  resolution: {
    workaroundAvailable: boolean;
    workaround: string;
  };
}

// The team a new ticket can be assigned to (kept local to the page on purpose).
const ASSIGNEES: readonly { name: string; email: string }[] = [
  { name: 'Anita Kowalska', email: 'anita.kowalska@opsboard.dev' },
  { name: 'Marek Nowak', email: 'marek.nowak@opsboard.dev' },
  { name: 'Piotr Wiśniewski', email: 'piotr.wisniewski@opsboard.dev' },
  { name: 'Kasia Zielińska', email: 'kasia.zielinska@opsboard.dev' },
];

function emptyModel(): TicketFormModel {
  return {
    title: '',
    description: '',
    priority: 'medium',
    assignee: { name: ASSIGNEES[0].name, email: ASSIGNEES[0].email },
    contact: { name: '', email: '', phone: '', preferredChannel: 'email' },
    incident: { affectedUsers: 0, startedAt: '', serviceUnavailable: false },
    resolution: { workaroundAvailable: false, workaround: '' },
  };
}

// ---------------------------------------------------------------------------
// Advanced validation (Task 08).
//
// Signal Forms rules are declared in the `form()` schema. Every rule receives
// the field *path* it applies to; custom rules additionally receive a
// `FieldContext` whose `valueOf()` reads *any other* field — that is how
// conditional, cross-field and business rules work.
// ---------------------------------------------------------------------------

// (basic) Title: required + length limits.
function titleRules(m: SchemaPathTree<TicketFormModel>): void {
  required(m.title, { message: 'Title is required.' });
  minLength(m.title, 5, { message: 'Title must be at least 5 characters.' });
  maxLength(m.title, 100, { message: 'Title must be at most 100 characters.' });
}

// (basic) Description: required with a minimum length.
function descriptionRules(m: SchemaPathTree<TicketFormModel>): void {
  required(m.description, { message: 'Description is required.' });
  minLength(m.description, 20, {
    message: 'Description must be at least 20 characters.',
  });
}

// (conditional) High priority -> the description must be at least 50 characters.
// The `when` predicate re-runs reactively: the rule is skipped when priority
// is not "high", so it never blocks a low/medium-priority ticket.
function highPriorityDescription(m: SchemaPathTree<TicketFormModel>): void {
  minLength(m.description, 50, {
    message: 'High-priority incidents need a description of at least 50 characters.',
    when: ({ valueOf }) => valueOf(m.priority) === 'high',
  });
}

// (basic) Contact e-mail: required + e-mail format.
function contactEmailRules(m: SchemaPathTree<TicketFormModel>): void {
  required(m.contact.email, { message: 'Contact e-mail is required.' });
  email(m.contact.email, { message: 'Enter a valid e-mail address.' });
}

// (cross-field) preferredChannel == "phone" -> the phone number is required.
// `required` accepts a `when` that reads the *other* field via `valueOf()`.
function phoneWhenPreferred(m: SchemaPathTree<TicketFormModel>): void {
  required(m.contact.phone, {
    message: 'A phone number is required when "Phone" is the preferred channel.',
    when: ({ valueOf }) => valueOf(m.contact.preferredChannel) === 'phone',
  });
}

// (business) A large outage (service unavailable AND more than 100 affected
// users) must be reported as high priority. The rule is attached to the
// priority field but reads the incident fields via the field context.
function outageRequiresHighPriority(m: SchemaPathTree<TicketFormModel>): void {
  validate(m.priority, ({ valueOf }) =>
    valueOf(m.incident.serviceUnavailable) &&
    valueOf(m.incident.affectedUsers) > 100 &&
    valueOf(m.priority) !== 'high'
      ? {
          kind: 'outagePriority',
          message:
            'Outages with more than 100 affected users must have high priority.',
        }
      : null,
  );
}

// (conditional section) The workaround field only exists when the checkbox is
// on. `hidden` marks it out of validation while hidden (so it never blocks
// submission), and the template guards it with @if; when visible the rule
// applies: required + at least 20 characters.
function workaroundRules(m: SchemaPathTree<TicketFormModel>): void {
  hidden(m.resolution.workaround, {
    when: ({ valueOf }) => !valueOf(m.resolution.workaroundAvailable),
  });
  required(m.resolution.workaround, {
    message: 'Describe the workaround.',
    when: ({ valueOf }) => valueOf(m.resolution.workaroundAvailable),
  });
  minLength(m.resolution.workaround, 20, {
    message: 'The workaround must be at least 20 characters.',
    when: ({ valueOf }) => valueOf(m.resolution.workaroundAvailable),
  });
}

// ---------------------------------------------------------------------------
// (async) One async validator: check the title against the existing mock
// tickets. An *exact* duplicate is a blocking error; a *similar* title
// (shared 4-letter word) is a non-blocking warning shown as a mat-hint, so
// the trainer can point at both "pending -> error" and "hint, not error".
// ---------------------------------------------------------------------------

/** Strip punctuation and lowercase, so "Database:" and "database" compare equal. */
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ');
}

function wordSet(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(' ')
      .filter((w) => w.length >= 4),
  );
}

/**
 * Simulates the asynchronous duplicate lookup against the mock tickets. This is
 * the `resource()` loader: `resource` hands it a `ResourceLoaderParams` object
 * whose `params` is the current title (or `undefined`, which keeps the resource
 * idle). The 500 ms delay keeps the pending ("checking…") state visible in the
 * demo; once the title becomes valid it re-runs automatically.
 */
function checkTitle(loaderParams: { params: { title: string } }): Promise<
  { exactId: number | null } | undefined
> {
  return new Promise((resolve) =>
    setTimeout(() => {
      const input = loaderParams.params.title;
      const norm = normalizeTitle(input);
      const exact = MOCK_TICKETS.find((t) => normalizeTitle(t.title) === norm);
      resolve({ exactId: exact?.id ?? null });
    }, 500),
  );
}

/**
 * Wires the ONE async validator onto the title field: `validateAsync` builds a
 * `resource()` that re-runs whenever the title changes. `onSuccess` maps the
 * result to a validation error — an *exact* duplicate is the only thing that
 * blocks; a *similar* title is not an error (the component shows it as a
 * non-blocking warning hint instead).
 */
function titleDuplicateCheck(m: SchemaPathTree<TicketFormModel>): void {
  validateAsync(m.title, {
    params: ({ valueOf }) => ({ title: valueOf(m.title) }),
    factory: (p) => resource({ loader: checkTitle, params: p }),
    onSuccess: (result) =>
      result?.exactId != null
        ? { kind: 'duplicateTitle', message: 'This exact title already exists.' }
        : null,
    onError: () => null,
  });
}

// ---------------------------------------------------------------------------
// (server-side) One server-side validation example: the mock "API" rejects
// titles containing "TEST" (a staging-env rule) 700 ms after submit. The error
// is returned from the submit `action`; Signal Forms attaches it to the
// field referenced by `fieldTree` and the template shows it under the title.
// ---------------------------------------------------------------------------

function mockApiSave(title: string): Promise<{ kind: string; message: string } | null> {
  return new Promise((resolve) =>
    setTimeout(() => {
      if (title.toUpperCase().includes('TEST')) {
        resolve({
          kind: 'serverRejected',
          message:
            'Server rejected the ticket: titles containing "TEST" are reserved for staging data.',
        });
      } else {
        resolve(null);
      }
    }, 700),
  );
}

/**
 * The `/tickets/new` page: a nested Signal Form with the full advanced
 * validation set (Task 08).
 *
 * Signal Forms teaching points demonstrated here:
 *
 *  - `signal()`            → the data model; the single source of truth
 *  - `form()`              → builds a `FieldTree` over that signal (no copy!)
 *  - `[formField]`         → binds a leaf field to a Material control
 *  - nested field access   → `form.contact.email`, `form.incident.startedAt`, …
 *  - programmatic updates  → "Pre-fill from template" sets (nested) field values
 *                            from code; the Material UI follows automatically
 *  - validation            → plain named rule functions: basic, conditional
 *                            (`when`), cross-field (`valueOf` on another
 *                            field), business (a custom `validate`), hidden
 *                            (conditional section), one async validator
 *                            (`validateAsync` + `resource`) and one
 *                            server-side rule (submit `action` result)
 *  - submission            → `formRoot` + `submission.action` runs only when
 *                            the form is valid; returning an error object from
 *                            the action shows a server-side error on the field
 *
 * A `Field` is a function that returns the `FieldState` for one leaf:
 * `title()` → the state, `title().value` → the (writable) value signal, and
 * `title().invalid()` / `.touched()` / `.errors()` the validation state. The
 * template binds the field itself (`[formField]="title"`) and reads its state
 * (`title().invalid()`).
 *
 * The form is grouped into four Material cards: Ticket, Contact, Incident and
 * Resolution.
 */
@Component({
  selector: 'app-new-ticket',
  imports: [
    FormRoot,
    FormField,
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatCardHeader,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatSelect,
    MatOption,
    MatCheckbox,
    MatButton,
    MatIcon,
  ],
  template: `
    <h1>New ticket</h1>

    <p class="intro">
      Fill in the incident details. Fields marked <strong>*</strong> are
      required. Try it: high priority needs a long description, a phone
      channel needs a phone number, a big outage needs high priority, and the
      mock API rejects titles containing "TEST".
    </p>

    <form [formRoot]="form" class="form">
      <div class="grid">
        <!-- ======================= Ticket ======================= -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Ticket</mat-card-title>
            <mat-card-subtitle>Title, description and priority</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline">
              <mat-label>Title</mat-label>
              <input matInput [formField]="title" />
              @if (showFieldError(title())) {
                <mat-error>{{ firstError(title()) }}</mat-error>
              }
              @if (duplicateWarning() && !showFieldError(title())) {
                <mat-hint class="warning">
                  <mat-icon>info</mat-icon>
                  <span
                    >Similar incident: #{{
                      duplicateWarning()?.id
                    }} “{{ duplicateWarning()?.title }}”</span
                  >
                </mat-hint>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Description</mat-label>
              <textarea matInput rows="3" [formField]="description"></textarea>
              @if (showFieldError(description())) {
                <mat-error>{{ firstError(description()) }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <mat-select [formField]="priority">
                <mat-option value="low">Low</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="high">High</mat-option>
              </mat-select>
              @if (showFieldError(priority())) {
                <mat-error>{{ firstError(priority()) }}</mat-error>
              }
            </mat-form-field>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Assignee</mat-label>
                <mat-select [formField]="assigneeName" (selectionChange)="onAssigneeChange($event)">
                  @for (a of assignees; track a.email) {
                    <mat-option [value]="a.name">{{ a.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Assignee email</mat-label>
                <input matInput type="email" [formField]="assigneeEmail" />
                @if (showFieldError(assigneeEmail())) {
                  <mat-error>{{ firstError(assigneeEmail()) }}</mat-error>
                }
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- ======================= Contact ======================= -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Contact</mat-card-title>
            <mat-card-subtitle>How we reach the affected people</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline">
              <mat-label>Contact name</mat-label>
              <input matInput [formField]="contactName" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Contact email</mat-label>
              <input matInput type="email" [formField]="contactEmail" />
              @if (showFieldError(contactEmail())) {
                <mat-error>{{ firstError(contactEmail()) }}</mat-error>
              }
            </mat-form-field>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput type="tel" [formField]="contactPhone" />
                @if (showFieldError(contactPhone())) {
                  <mat-error>{{ firstError(contactPhone()) }}</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Preferred channel</mat-label>
                <mat-select [formField]="preferredChannel">
                  <mat-option value="email">Email</mat-option>
                  <mat-option value="phone">Phone</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- ======================= Incident ======================= -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Incident</mat-card-title>
            <mat-card-subtitle>Scope and timing of the problem</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Affected users</mat-label>
                <input matInput type="number" step="10" [formField]="affectedUsers" />
                @if (showFieldError(affectedUsers())) {
                  <mat-error>{{ firstError(affectedUsers()) }}</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Started at</mat-label>
                <input matInput type="datetime-local" [formField]="startedAt" />
              </mat-form-field>
            </div>

            <mat-checkbox [formField]="serviceUnavailable">Service unavailable</mat-checkbox>
          </mat-card-content>
        </mat-card>

        <!-- ======================= Resolution ======================= -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Resolution</mat-card-title>
            <mat-card-subtitle>Current state of the fix</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-checkbox [formField]="workaroundAvailable">Workaround available</mat-checkbox>

            @if (!workaround().hidden()) {
              <mat-form-field appearance="outline">
                <mat-label>Workaround</mat-label>
                <textarea matInput rows="3" [formField]="workaround"></textarea>
                @if (showFieldError(workaround())) {
                  <mat-error>{{ firstError(workaround()) }}</mat-error>
                }
              </mat-form-field>
            }
          </mat-card-content>
        </mat-card>
      </div>

      @if (submitAttempted() && invalid()) {
        <p class="summary" role="alert">
          <mat-icon>error</mat-icon>
          <span
            >Please fix the {{ errorCount() }} highlighted field{{
              errorCount() === 1 ? '' : 's'
            }}
            before saving.</span
          >
        </p>
      }

      <div class="actions">
        <button mat-stroked-button type="button" (click)="prefillFromTemplate()">
          <mat-icon>content_copy</mat-icon>
          Pre-fill from template
        </button>
        <button mat-flat-button type="submit" [disabled]="submitting()">
          <mat-icon>check</mat-icon>
          Create ticket
        </button>
      </div>
    </form>
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    h1 {
      margin: 0 0 4px;
    }

    .intro {
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 20px;
      font: var(--mat-sys-label-large);
    }

    /* The four group cards lay out in a responsive two-column grid. */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    mat-card {
      display: flex;
      flex-direction: column;
    }

    mat-card-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    mat-checkbox {
      align-self: flex-start;
    }

    /* The "similar incident" async result is a hint, not an error. */
    .warning {
      color: var(--mat-sys-on-surface-variant);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .summary {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      padding: 12px 16px;
      border-radius: var(--mat-sys-corner-large);
      background-color: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error);
      font: var(--mat-sys-label-large);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `,
})
export class NewTicket {
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // signal(): the data model. Everything the UI edits flows into this model,
  // and `form()` reads and writes it directly (no separate form copy).
  // (Public so the trainer and the tests can inspect the single source of truth.)
  readonly model = signal(emptyModel());

  // form(): builds the FieldTree over the model signal and applies the
  // validation rules. The `submission` block is what `formRoot` invokes on
  // submit: `action` runs only when the form is valid, `onInvalid` otherwise.
  // Returning an error object from `action` is the Signal Forms way to report
  // a server-side validation failure on a specific field (server-side rule).
  readonly form = form(
    this.model,
    (m) => {
      // Basic rules
      titleRules(m);
      descriptionRules(m);
      contactEmailRules(m);
      required(m.assignee.email, { message: 'Enter a valid e-mail address.' });
      email(m.assignee.email, { message: 'Enter a valid e-mail address.' });
      min(m.incident.affectedUsers, 0, {
        message: 'Affected users cannot be negative.',
      });
      max(m.incident.affectedUsers, 1_000_000, {
        message: 'Affected users looks too large.',
      });
      pattern(m.contact.phone, /^[+\d][\d\s()-]{6,}$/, {
        message: 'Enter a valid phone number.',
      });

      // Conditional rules (reactive `when` predicates)
      highPriorityDescription(m);
      workaroundRules(m);

      // Cross-field rule (reads the preferred channel)
      phoneWhenPreferred(m);

      // Business rule (reads the incident fields)
      outageRequiresHighPriority(m);

      // The one async validator (duplicate title lookup)
      titleDuplicateCheck(m);
    },
    {
      submission: {
        action: async (field) => {
          // The model signal is the source of truth, so read it directly.
          const v = this.model();

          // (server-side) The mock API rejects titles containing "TEST".
          const rejected = await mockApiSave(v.title);
          if (rejected) {
            // Returning the error attaches it to the title field, which the
            // template renders under the control.
            return { ...rejected, fieldTree: field.title };
          }

          // Persist the ticket: the model signal is the source of truth, so
          // read it directly.
          const id = Math.max(0, ...MOCK_TICKETS.map((t) => t.id)) + 1;
          const ticket: Ticket = {
            id,
            title: v.title,
            description: v.description,
            status: 'new',
            priority: v.priority,
            assignee: v.assignee.name || undefined,
          };
          // Add to the shared mock data source (Tasks 01/05), confirm with a
          // snackbar, then go back to the list where the new ticket shows up.
          MOCK_TICKETS.push(ticket);
          this.snackBar.open(`Ticket #${id} created.`, 'Close', { duration: 3500 });
          await this.router.navigate(['/tickets']);
          return undefined;
        },
        onInvalid: () => {
          this.submitAttempted.set(true);
          // Mark every field touched so all errors become visible.
          this.form().markAsTouched();
        },
      },
    },
  );

  // Named field accessors for the template. Each is a Field (a function that
  // returns the FieldState), so the template binds it with [formField] and
  // reads its state by calling it. Nested access is plain property chains:
  // `this.form.contact.preferredChannel`, `this.form.incident.startedAt`, …
  protected readonly title = this.form.title;
  protected readonly description = this.form.description;
  protected readonly priority = this.form.priority;
  protected readonly assigneeName = this.form.assignee.name;
  protected readonly assigneeEmail = this.form.assignee.email;
  protected readonly contactName = this.form.contact.name;
  protected readonly contactEmail = this.form.contact.email;
  protected readonly contactPhone = this.form.contact.phone;
  protected readonly preferredChannel = this.form.contact.preferredChannel;
  protected readonly affectedUsers = this.form.incident.affectedUsers;
  protected readonly startedAt = this.form.incident.startedAt;
  protected readonly serviceUnavailable = this.form.incident.serviceUnavailable;
  protected readonly workaroundAvailable = this.form.resolution.workaroundAvailable;
  protected readonly workaround = this.form.resolution.workaround;

  // Root-level derived state (a FieldTree is callable: `form()` is the root
  // FieldState).
  protected readonly invalid = computed(() => this.form().invalid());
  protected readonly errorCount = computed(() => this.form().errorSummary().length);
  protected readonly submitting = computed(() => this.form().submitting());

  // True once the user has tried to submit, so we only nag after a failed save.
  protected readonly submitAttempted = signal(false);

  protected readonly assignees = ASSIGNEES;

  /**
   * The "similar incident" warning shown under the title. We re-derive it from
   * the same mock data the async validator uses, only when the title is a
   * valid candidate (>= 5 chars) and is NOT an exact duplicate (that one is a
   * blocking error). Derived state via `computed()`, as the CLAUDE.md rules
   * require — no `effect()`, no mutation.
   */
  protected readonly duplicateWarning = computed(
    () =>
      ((): { id: number; title: string } | null => {
        const input = this.title().value();
        if (input.length < 5) return null;
        // An exact duplicate is a blocking error, not a warning.
        const isExact = MOCK_TICKETS.some((t) => normalizeTitle(t.title) === normalizeTitle(input));
        if (isExact) return null;
        const words = wordSet(input);
        for (const t of MOCK_TICKETS) {
          if ([...wordSet(t.title)].some((w) => words.has(w))) {
            return { id: t.id, title: t.title };
          }
        }
        return null;
      })(),
  );

  protected firstError<T>(state: FieldState<T, string | number>): string {
    return state.errors()[0]?.message ?? 'This field is required.';
  }

  /**
   * A field error is shown once the field is touched (the user edited it) or
   * after a submit attempt (all fields are marked touched then). Hidden fields
   * never show errors because they are out of validation anyway.
   */
  protected showFieldError<T>(state: FieldState<T, string | number>): boolean {
    return state.invalid() && (state.touched() || this.submitAttempted());
  }

  /**
   * Programmatic value updates: set several (nested) fields from code. Because
   * `form()` is a view over the `model` signal, the Material controls pick the
   * new values up on the next change-detection pass — no manual syncing.
   */
  protected prefillFromTemplate(): void {
    const assignee = ASSIGNEES[2];
    this.form.title().value.set('Payment gateway returning 5xx during peak');
    this.form
      .description()
      .value.set(
        'Checkout transactions started failing with upstream 5xx errors around the lunch peak. The payment provider reports elevated latency on the card authorization endpoint.',
      );
    this.form.priority().value.set('high');
    this.form.assignee.name().value.set(assignee.name);
    this.form.assignee.email().value.set(assignee.email);
    this.form.contact.name().value.set('On-call platform engineer');
    this.form.contact.email().value.set('oncall-platform@opsboard.dev');
    this.form.contact.phone().value.set('+48 123 456 789');
    this.form.contact.preferredChannel().value.set('phone');
    this.form.incident.affectedUsers().value.set(350);
    this.form.incident.startedAt().value.set('2026-11-26T12:00');
    this.form.incident.serviceUnavailable().value.set(true);
    this.form.resolution.workaroundAvailable().value.set(true);
    this.form.resolution
      .workaround()
      .value.set(
        'Route card authorizations through the secondary provider until the primary recovers.',
      );
  }

  /** Picking an assignee also fills in their (nested) e-mail address. */
  protected onAssigneeChange(event: { value: string }): void {
    const picked = ASSIGNEES.find((a) => a.name === event.value);
    if (picked) {
      this.form.assignee.email().value.set(picked.email);
    }
  }
}
