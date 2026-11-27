import { Component, computed, inject, resource, signal } from '@angular/core';
import {
  FieldState,
  FormField,
  FormRoot,
  ValidationError,
  email,
  form,
  hidden,
  maxLength,
  minLength,
  required,
  submit,
  validateAsync,
  validateTree,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { Ticket } from '../../domain/ticket';
import { MOCK_TICKETS } from '../../domain/tickets';

/**
 * The nested model the Signal Form is built around (IMPLEMENTATION_PLAN.md
 * Task 07). `form()` mirrors this shape into a `FieldTree`, so nested access
 * such as `form.contact.name()` type-checks all the way down.
 */
export interface TicketFormModel {
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

/** A realistic example the "Pre-fill from template" button writes into the form. */
const TEMPLATE_TICKET: TicketFormModel = {
  title: 'Payment provider outage — checkout failing',
  description:
    'The payment provider is returning 503s under load and roughly 6% of checkouts fail. Customers are being asked to retry, which is doubling the traffic on the failing endpoints.',
  priority: 'high',
  assignee: { name: 'Marta Kowalska', email: 'marta.kowalska@example.com' },
  contact: {
    name: 'Lena Fischer',
    email: 'lena.fischer@example.com',
    phone: '+48 512 345 678',
    preferredChannel: 'phone',
  },
  incident: { affectedUsers: 120, startedAt: '2026-01-12T09:30', serviceUnavailable: true },
  resolution: { workaroundAvailable: true, workaround: 'Customers can use the invoice-based checkout' },
};

/** The mock backend rejects titles containing this marker (Task 08 server-side rule). */
const SERVER_FORBIDDEN_TITLE_MARK = 'TEST';

/** Simulated round-trip of the server-side validation on submit. */
const SERVER_SIDE_LATENCY_MS = 700;

/** Simulated round-trip of the async duplicate check against existing tickets. */
const DUPLICATE_CHECK_LATENCY_MS = 900;

/** Result of the async title duplicate check against the existing (mock) tickets. */
interface TitleDuplicateCheck {
  /** An existing ticket with an identical normalized title. */
  exact: { id: number; title: string } | null;
  /** The most similar existing ticket (normalized titles share at least one word). */
  similar: { id: number; title: string } | null;
}

/** Normalize a title for comparison: trim, lowercase, collapse whitespace. */
function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Task 07 — the nested ticket Signal Form (`/tickets/new`, lazy route);
 * Task 08 — extended with the full validation catalogue from the plan.
 *
 * Angular APIs used here (all verified against the Angular 22 API reference —
 * `llms-full.txt` links to the Signal Forms guide, and the installed
 * `@angular/forms` 22.3 type defs document the exact shapes):
 *
 * - `signal()`:   `model` is a plain writable signal that OWNS the data —
 *                 `form()` wraps it, it does not copy it.
 * - `form()`:     the nested `FieldTree`. `form` itself is the root field
 *                 (a signal function); calling it — `form()` — gives the root
 *                 `FieldState`. Nested fields are reached by dotting through
 *                 the tree and calling at the leaf, e.g. `form.priority`
 *                 (the field) or `form.contact.name()` (its `FieldState`).
 * - Schema (2nd argument to `form()`): binds the rules. Standard validators
 *                 `required` / `minLength` / `maxLength` / `email` each take a
 *                 `when` predicate — the conditional rules reuse them instead
 *                 of inventing a validation framework.
 * - `hidden()`:   the workaround field is excluded from validation while the
 *                 switch is off, so it cannot block submission while invisible
 *                 (its `<textarea>` is additionally guarded by `@if`).
 * - `validateTree()`: cross-field and business rules. The `FieldContext`
 *                 gives `valueOf(p)` / `stateOf(p)` / `fieldTreeOf(p)` access
 *                 to sibling fields; a returned error may target any field
 *                 of the tree via `fieldTree`.
 * - `validateAsync()`: the async duplicate check. `params` keys the check on
 *                 the title (re-runs on every change), `debounce` avoids
 *                 re-checking on every keystroke, `factory` builds a plain
 *                 `resource()` per parameter, `onSuccess` maps the result to
 *                 a blocking `duplicate` error (exact match) or nothing.
 * - Submission:   the third-argument `FormOptions.submission` carries
 *                 `action` (server-side validation: it may reject with errors
 *                 targeted at a sub-field) and `onInvalid`;
 *                 `<form [formRoot]>` fires the `submit()` call, and the
 *                 action's returned errors are applied to the tree.
 * - `FieldState`:  `invalid()`, `touched()`, `pending()`, `errors()`,
 *                 `errorSummary()` and `valid()` drive the Bootstrap UI.
 */
@Component({
  selector: 'app-new-ticket',
  imports: [FormField, FormRoot, RouterLink],
  template: `
    <h1 class="visually-hidden">New ticket</h1>

    <div class="card border-0 shadow-sm">
      <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-2">
        <i class="bi bi-plus-circle" aria-hidden="true"></i>
        <h2 class="h5 mb-0 flex-grow-1">New ticket</h2>
        <!-- demo: programmatic value update — writes the whole nested model at once. -->
        <button type="button" class="btn btn-outline-secondary btn-sm" (click)="prefill()">
          <i class="bi bi-magic me-1" aria-hidden="true"></i>Pre-fill from template
        </button>
        <a class="btn btn-outline-secondary btn-sm" [routerLink]="['/tickets']">
          <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Back to tickets
        </a>
      </div>

      <div class="card-body">
        <!-- submit() ran onInvalid: list every rule that is still failing. -->
        @if (showInvalidAlert().length > 0) {
          <div class="alert alert-danger d-flex align-items-start gap-2" role="alert">
            <i class="bi bi-exclamation-triangle mt-1" aria-hidden="true"></i>
            <div>
              <strong>The form is not valid yet.</strong> The fields below show what is missing:
              <ul class="mb-0 mt-1 ms-2">
                @for (message of showInvalidAlert(); track message) {
                  <li>{{ message }}</li>
                }
              </ul>
            </div>
          </div>
        }

        <!-- [formRoot] fires submit(form) with the configured submission
             options on the native submit event: onInvalid while invalid, the
             action (server-side check) once valid. The button below just
             submits the form the native way. -->
        <form [formRoot]="form">
          <div class="row g-4">
            <div class="col-12 col-lg-6">
              <!-- Section: Ticket -->
              <div class="card h-100">
                <div class="card-header bg-transparent d-flex align-items-center gap-2">
                  <i class="bi bi-ticket-detailed" aria-hidden="true"></i>
                  <h3 class="h6 mb-0">Ticket</h3>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label for="ticket-title" class="form-label">Title</label>
                    <input
                      id="ticket-title"
                      class="form-control"
                      [class.is-invalid]="isInvalidAndTouched(form.title())"
                      type="text"
                      placeholder="Short, searchable summary"
                      [formField]="form.title"
                    />
                    @if (showFieldError(form.title())) {
                      <div class="invalid-feedback">{{ showFieldError(form.title()) }}</div>
                    }
                    <!-- demo: async duplicate check — spinner while it runs,
                          non-blocking "similar incident" warning, and a
                          blocking duplicate error only on an exact match. -->
                    @if (form.title().pending()) {
                      <div class="form-text">
                        <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Checking existing tickets for duplicates…
                      </div>
                    } @else if (similarTitle()) {
                      <div class="text-warn small d-flex align-items-center gap-1">
                        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                        <span>Similar incident: <strong>{{ similarTitle()!.title }}</strong> (#{{
                          similarTitle()!.id
                        }}). Not a problem — just double-check it is not a duplicate.</span>
                      </div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="ticket-description" class="form-label">Description</label>
                    <textarea
                      id="ticket-description"
                      class="form-control"
                      [class.is-invalid]="isInvalidAndTouched(form.description())"
                      rows="4"
                      placeholder="What is broken, who is affected, what was tried…"
                      [formField]="form.description"
                    ></textarea>
                    @if (showFieldError(form.description())) {
                      <div class="invalid-feedback">{{ showFieldError(form.description()) }}</div>
                    }
                    <!-- the conditional rule (high → 50 chars) shows here as a hint. -->
                    @if (needsLongDescription()) {
                      <div class="form-text">
                        High-priority incidents need a longer description (at least 50 characters).
                      </div>
                    }
                  </div>

                  <div class="row g-3">
                    <div class="col-sm-5">
                      <label for="ticket-priority" class="form-label">Priority</label>
                      <select
                        id="ticket-priority"
                        class="form-select"
                        [formField]="form.priority"
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </div>
                    <div class="col-sm-7">
                      <label for="assignee-name" class="form-label">Assignee</label>
                      <input
                        id="assignee-name"
                        class="form-control"
                        [class.is-invalid]="isInvalidAndTouched(form.assignee.name())"
                        type="text"
                        placeholder="e.g. Marta Kowalska"
                        [formField]="form.assignee.name"
                      />
                      @if (showFieldError(form.assignee.name())) {
                        <div class="invalid-feedback">{{ showFieldError(form.assignee.name()) }}</div>
                      }
                    </div>
                  </div>

                  <div class="mt-3">
                    <label for="assignee-email" class="form-label">Assignee email</label>
                    <input
                      id="assignee-email"
                      class="form-control"
                      [class.is-invalid]="isInvalidAndTouched(form.assignee.email())"
                      type="email"
                      placeholder="name@example.com"
                      [formField]="form.assignee.email"
                    />
                    @if (showFieldError(form.assignee.email())) {
                      <div class="invalid-feedback">{{ showFieldError(form.assignee.email()) }}</div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-lg-6">
              <!-- Section: Contact -->
              <div class="card h-100">
                <div class="card-header bg-transparent d-flex align-items-center gap-2">
                  <i class="bi bi-telephone" aria-hidden="true"></i>
                  <h3 class="h6 mb-0">Contact</h3>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-12 col-sm-6">
                      <label for="contact-name" class="form-label">Name</label>
                      <input
                        id="contact-name"
                        class="form-control"
                        [class.is-invalid]="isInvalidAndTouched(form.contact.name())"
                        type="text"
                        placeholder="Reporting customer"
                        [formField]="form.contact.name"
                      />
                      @if (showFieldError(form.contact.name())) {
                        <div class="invalid-feedback">{{ showFieldError(form.contact.name()) }}</div>
                      }
                    </div>
                    <div class="col-12 col-sm-6">
                      <label for="contact-email" class="form-label">Email</label>
                      <input
                        id="contact-email"
                        class="form-control"
                        [class.is-invalid]="isInvalidAndTouched(form.contact.email())"
                        type="email"
                        placeholder="name@example.com"
                        [formField]="form.contact.email"
                      />
                      @if (showFieldError(form.contact.email())) {
                        <div class="invalid-feedback">{{ showFieldError(form.contact.email()) }}</div>
                      }
                    </div>
                  </div>

                  <div class="row g-3 mt-0">
                    <div class="col-sm-7">
                      <label for="contact-phone" class="form-label">Phone</label>
                      <input
                        id="contact-phone"
                        class="form-control"
                        [class.is-invalid]="isInvalidAndTouched(form.contact.phone())"
                        type="tel"
                        placeholder="+48 …"
                        [formField]="form.contact.phone"
                      />
                      @if (showFieldError(form.contact.phone())) {
                        <div class="invalid-feedback">{{ showFieldError(form.contact.phone()) }}</div>
                      }
                    </div>
                    <div class="col-sm-5">
                      <label for="contact-channel" class="form-label">Preferred channel</label>
                      <select
                        id="contact-channel"
                        class="form-select"
                        [formField]="form.contact.preferredChannel"
                      >
                        <option value="email">email</option>
                        <option value="phone">phone</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-lg-6">
              <!-- Section: Incident -->
              <div class="card h-100">
                <div class="card-header bg-transparent d-flex align-items-center gap-2">
                  <i class="bi bi-exclamation-octagon" aria-hidden="true"></i>
                  <h3 class="h6 mb-0">Incident</h3>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-sm-5">
                      <label for="incident-users" class="form-label">Affected users</label>
                      <input
                        id="incident-users"
                        class="form-control"
                        type="number"
                        [formField]="form.incident.affectedUsers"
                      />
                    </div>
                    <div class="col-sm-7">
                      <label for="incident-started" class="form-label">Started at</label>
                      <input
                        id="incident-started"
                        class="form-control"
                        type="datetime-local"
                        [formField]="form.incident.startedAt"
                      />
                    </div>
                  </div>

                  <!-- demo: a boolean field — the [formField] binding syncs the checkbox state. -->
                  <div class="form-check form-switch mt-3">
                    <input
                      id="incident-unavailable"
                      class="form-check-input"
                      type="checkbox"
                      role="switch"
                      [formField]="form.incident.serviceUnavailable"
                    />
                    <label for="incident-unavailable" class="form-check-label">
                      Service currently unavailable
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-lg-6">
              <!-- Section: Resolution -->
              <div class="card h-100">
                <div class="card-header bg-transparent d-flex align-items-center gap-2">
                  <i class="bi bi-check2-circle" aria-hidden="true"></i>
                  <h3 class="h6 mb-0">Resolution</h3>
                </div>
                <div class="card-body">
                  <div class="form-check form-switch">
                    <input
                      id="resolution-workaround-available"
                      class="form-check-input"
                      type="checkbox"
                      role="switch"
                      [formField]="form.resolution.workaroundAvailable"
                    />
                    <label for="resolution-workaround-available" class="form-check-label">
                      A workaround is available
                    </label>
                  </div>

                  <!-- Conditional section: the workaround field only exists in
                        the DOM while the switch is on, and the hidden rule
                        removes it from validation while the switch is off, so
                        an empty workaround never blocks submission. -->
                  @if (form.resolution.workaroundAvailable().value()) {
                    <div class="mt-3">
                      <label for="resolution-workaround" class="form-label">Workaround</label>
                      <textarea
                        id="resolution-workaround"
                        class="form-control"
                        [class.is-invalid]="isInvalidAndTouched(form.resolution.workaround())"
                        rows="3"
                        placeholder="How can customers work around this?"
                        [formField]="form.resolution.workaround"
                      ></textarea>
                      @if (showFieldError(form.resolution.workaround())) {
                        <div class="invalid-feedback">
                          {{ showFieldError(form.resolution.workaround()) }}
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex align-items-center gap-3 mt-4">
            <button type="submit" class="btn btn-primary" [disabled]="isSubmitting()">
              <i class="bi bi-send me-1" aria-hidden="true"></i>Create ticket
            </button>
            <a class="btn btn-link link-secondary" [routerLink]="['/tickets']">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class NewTicket {
  private readonly router = inject(Router);

  // demo: signal() — a plain writable signal that OWNS the nested model;
  // `form()` wraps it (it does not copy the data).
  private readonly model = signal<TicketFormModel>({
    title: '',
    description: '',
    priority: 'medium',
    assignee: { name: '', email: '' },
    contact: { name: '', email: '', phone: '', preferredChannel: 'email' },
    incident: { affectedUsers: 0, startedAt: '', serviceUnavailable: false },
    resolution: { workaroundAvailable: false, workaround: '' },
  });

  // Gates the invalid-submission alert so required errors never flash before
  // the user has tried to submit; set by `onInvalid` (and the submit handler).
  private readonly submitAttempted = signal(false);

  // demo: form() — the nested FieldTree with the Task 08 rule catalogue. The
  // third argument carries the submission options (server-side validation).
  readonly form = form(
    this.model,
    (t) => {
      // --- basic validation (per-field rules) ---
      required(t.title, { message: 'A title is required.' });
      minLength(t.title, 5, { message: 'Title needs at least 5 characters.' });
      maxLength(t.title, 100, { message: 'Title must be 100 characters or fewer.' });
      required(t.description, { message: 'A description is required.' });
      minLength(t.description, 20, { message: 'Description needs at least 20 characters.' });
      required(t.assignee.name, { message: 'An assignee is required.' });
      required(t.assignee.email, { message: 'An assignee email is required.' });
      required(t.contact.name, { message: 'A contact name is required.' });
      required(t.contact.email, { message: 'A contact email is required.' });
      email(t.contact.email, { message: 'Contact email is not a valid email address.' });

      // --- conditional rule: the same standard validator, gated by `when` ---
      // high priority → description must be at least 50 characters.
      minLength(t.description, 50, {
        message: 'High-priority incidents need a description of at least 50 characters.',
        when: (ctx) => ctx.valueOf(t.priority) === 'high',
      });

      // --- cross-field rule: the preferred channel decides what else is
      // required — `when` reads a sibling field through the field context. ---
      required(t.contact.phone, {
        message: 'A phone number is required when phone is the preferred channel.',
        when: (ctx) => ctx.valueOf(t.contact.preferredChannel) === 'phone',
      });

      // --- business rule: outage + >100 affected users forces high priority.
      // `validateTree` reads sibling fields with `valueOf` and reports the
      // error back on the current field. ---
      validateTree(t.incident, (ctx) => {
        const outage = ctx.valueOf(t.incident.serviceUnavailable);
        const affected = ctx.valueOf(t.incident.affectedUsers);
        const priority = ctx.valueOf(t.priority);
        return outage && affected > 100 && priority !== 'high'
          ? {
              kind: 'business',
              message: 'Outage with more than 100 affected users must be high priority.',
            }
          : undefined;
      });

      // --- conditional nested section: while the switch is off the field is
      // hidden, which excludes it from validation (it cannot block submit).
      // When visible it is required with the same 20-character minimum. ---
      hidden(t.resolution.workaround, {
        when: (ctx) => !ctx.valueOf(t.resolution.workaroundAvailable),
      });
      required(t.resolution.workaround, { message: 'Describe the workaround.' });
      minLength(t.resolution.workaround, 20, {
        message: 'The workaround needs at least 20 characters.',
      });

      // --- async rule (the ONE async validator): duplicate/similar-title
      // check against the existing mock tickets. `params` re-keys the check on
      // every title change; `debounce` keeps it quiet while typing; `factory`
      // builds a plain resource() per check; `onSuccess` maps the result to a
      // blocking `duplicate` error on an exact match only. A merely similar
      // title produces the non-blocking warning in the UI (see below). ---
      validateAsync<string, string, TitleDuplicateCheck>(t.title, {
        params: (ctx) => ctx.value().trim(),
        debounce: 500,
        // The form passes the debounced parameter through this signal and sets
        // it to undefined while the check should not run (empty title).
        factory: (title) =>
          resource<TitleDuplicateCheck, string | undefined>({
            // The form sets this to undefined while the check should not run
            // (empty title); a `resource` with an undefined param stays idle.
            params: () => title(),
            loader: ({ params, abortSignal }) =>
              new Promise<TitleDuplicateCheck>((resolve, reject) => {
                const timer = setTimeout(
                  () => resolve(findSimilarTicket(params)),
                  DUPLICATE_CHECK_LATENCY_MS,
                );
                abortSignal.addEventListener(
                  'abort',
                  () => {
                    clearTimeout(timer);
                    reject(new DOMException('Aborted', 'AbortError'));
                  },
                  { once: true },
                );
              }),
          }),
        onError: () => undefined,
        onSuccess: (result) => {
          // onSuccess runs inside the form's reactive validation computation,
          // where writing to a signal would throw NG0600 — so the (pure) error
          // return happens here and the side-effect (updating the warning
          // signal) is deferred to a microtask, outside the computation.
          queueMicrotask(() => this.similarTitle.set(result?.similar ?? null));
          if (result?.exact !== null) {
            return {
              kind: 'duplicate',
              message: `A ticket with this exact title already exists (#${result.exact.id}).`,
            };
          }
          return undefined;
        },
      });
    },
    {
      // Names the root field so sub-field names read "ticket.title",
      // "ticket.contact.email", … (used by the field labels in the alert).
      name: 'ticket',
      // --- server-side validation + submission. `action` runs only when
      // every client-side rule already passed (the [formRoot] directive calls
      // submit() with these options). It simulates the backend round-trip,
      // rejects titles containing 'TEST' by returning an error targeted at
      // the title sub-field (applied to the tree by submit()), and on success
      // creates the ticket and navigates. The small delay makes the failure
      // demoable. ---
      submission: {
        action: async (root) => {
          const value = root().value();
          await new Promise((resolve) => setTimeout(resolve, SERVER_SIDE_LATENCY_MS));
          if (value.title.toUpperCase().includes(SERVER_FORBIDDEN_TITLE_MARK)) {
            return [
              {
                fieldTree: root.title,
                kind: 'server',
                message: 'The backend rejected this title: it contains a test marker.',
              },
            ];
          }
          this.createTicket(value);
          return undefined;
        },
        onInvalid: () => this.submitAttempted.set(true),
      },
    },
  );

  /** demo: programmatic value update — writes the whole nested model through
   * the root field's writable `value` signal; every bound input follows. */
  prefill(): void {
    this.form().value.set(TEMPLATE_TICKET);
  }

  /**
   * demo: computed() — the invalid-submission alert. It is derived from the
   * form's own `errorSummary()` (the errors of the field and all of its
   * descendants) and only shows after a submit attempt. Because it is a
   * computed, the list clears on its own once the user fixes the fields.
   */
  protected readonly showInvalidAlert = computed<string[]>(() => {
    if (!this.submitAttempted() || this.form().valid()) {
      return [];
    }
    const messages: string[] = [];
    for (const error of this.form().errorSummary()) {
      const message = this.labelOf(error) + ': ' + (error.message ?? 'invalid');
      if (!messages.includes(message)) {
        messages.push(message);
      }
    }
    return messages;
  });

  /** The duplicate check only runs while the title passes the basic rules. */
  protected readonly needsLongDescription = computed(
    () => this.form.priority().value() === 'high' && this.form.description().value().length > 0,
  );

  /**
   * The non-blocking "similar incident" warning. The async validator writes it
   * when the check resolves; the template renders it as `text-warn` next to the
   * title. (An exact match instead produces a blocking `duplicate` error.)
   */
  protected readonly similarTitle = signal<TitleDuplicateCheck['similar']>(null);

  /**
   * demo: programmatic submission — the same `submit(form)` the `<form
   * [formRoot]>` directive fires on the native submit event. It runs
   * `onInvalid` (flagging the attempt) while the form is invalid and
   * `action` (server-side check + ticket creation) when it is valid. Exposed
   * so tests can drive submission without simulating a form event and await
   * the async `action`.
   */
  onSubmit(): Promise<boolean> {
    return submit(this.form);
  }

  /**
   * Adds the ticket to the shared mock data (Tasks 01/05) and navigates to
   * the list — called from the `action` above once server-side validation
   * has passed.
   */
  private createTicket(value: TicketFormModel): void {
    const ticket: Ticket = {
      id: Math.max(...MOCK_TICKETS.map((t) => t.id)) + 1,
      title: value.title,
      description: value.description,
      status: 'new',
      priority: value.priority,
      assignee: value.assignee.name || undefined,
    };
    MOCK_TICKETS.push(ticket);
    this.submitAttempted.set(false);
    this.toast(`Ticket #${ticket.id} created.`);
    this.router.navigate(['/tickets']);
  }

  /**
   * Field-level error, shown only once the field is invalid AND touched, so
   * required errors never flash before the user has interacted with the form.
   * Server-side and duplicate errors (which the user cannot "un-touch") are
   * shown as soon as they appear — the field is invalid by definition then.
   */
  protected showFieldError(state: FieldState<unknown>): string | null {
    if (!state.invalid()) {
      return null;
    }
    const error = state.errors().at(0);
    if (error === undefined) {
      return null;
    }
    const isAutoError = error.kind === 'server' || error.kind === 'duplicate';
    if (!isAutoError && !state.touched()) {
      return null;
    }
    return error.message ?? 'This field is invalid.';
  }

  /** `is-invalid` for Bootstrap: invalid AND touched (or an auto error). */
  protected isInvalidAndTouched(state: FieldState<unknown>): boolean {
    return this.showFieldError(state) !== null;
  }

  /** True while the root field reports a pending (in-flight) validator. */
  protected isSubmitting(): boolean {
    return this.form().submitting();
  }

  /** Human-readable label for an error's target field (for the alert list). */
  private labelOf(error: ValidationError.WithFieldTree): string {
    // The error's `fieldTree` is a callable tree; calling it gives the
    // `FieldState`, whose `name` signal holds the field's unique path
    // (e.g. "title" or "contact.email").
    const name = error.fieldTree?.().name();
    return name !== undefined && name.length > 0 ? name : 'Form';
  }

  /**
   * Bootstrap toast confirmation. Uses the `.toast` CSS classes already loaded
   * in main.ts (the Bootstrap JS `Toast` class is imported there for the
   * sidebar collapse); this is a self-dismissing, CSS-only instance so the
   * confirmation survives the navigation to /tickets — the form component
   * itself is destroyed by that navigation.
   */
  private toast(message: string): void {
    document.getElementById('ticket-created-toast')?.remove();

    const el = document.createElement('div');
    el.id = 'ticket-created-toast';
    el.className = 'toast align-items-center text-bg-success border-0 show';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.position = 'fixed';
    el.style.zIndex = '1080';
    el.style.bottom = '1rem';
    el.style.right = '1rem';
    el.innerHTML =
      '<div class="d-flex">' +
      '<div class="toast-body d-flex align-items-center gap-2">' +
      '<i class="bi bi-check-circle" aria-hidden="true"></i><span></span>' +
      '</div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>' +
      '</div>';
    el.querySelector('span')!.textContent = message;
    el.querySelector('button')!.addEventListener('click', () => el.remove());
    document.body.appendChild(el);

    window.setTimeout(() => el.remove(), 3000);
  }
}

/**
 * The async duplicate check: compare the (normalized) title against the
 * existing mock tickets. An exact match is blocking; a title sharing any word
 * is "similar" (a non-blocking warning for the user).
 */
function findSimilarTicket(title: string): TitleDuplicateCheck {
  const normalized = normalizeTitle(title);
  const words = new Set(normalized.split(' ').filter((w) => w.length > 2));

  let exact: TitleDuplicateCheck['exact'] = null;
  let similar: TitleDuplicateCheck['similar'] = null;

  for (const ticket of MOCK_TICKETS) {
    const ticketNormalized = normalizeTitle(ticket.title);
    if (ticketNormalized === normalized) {
      exact = { id: ticket.id, title: ticket.title };
      break;
    }
    if (similar === null) {
      const shared = ticket.title
        .toLowerCase()
        .split(/\s+/)
        .some((w) => w.length > 2 && words.has(w));
      if (shared) {
        similar = { id: ticket.id, title: ticket.title };
      }
    }
  }

  return { exact, similar };
}
