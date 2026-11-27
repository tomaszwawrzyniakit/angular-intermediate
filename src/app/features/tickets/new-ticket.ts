import { Component, computed, inject, signal } from '@angular/core';
import {
  FieldState,
  FormField,
  FormRoot,
  ValidationError,
  form,
  required,
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

/**
 * Task 07 — the nested ticket Signal Form (`/tickets/new`, lazy route).
 *
 * Angular APIs used here (all verified against the Angular 22 API reference —
 * `llms-full.txt` links to the Signal Forms guide, and the installed
 * `@angular/forms` 22.3 type defs document the exact `form()` / `[formField]`
 * / `submit()` shapes):
 *
 * - `signal()`:   `model` is a plain writable signal that OWNS the data —
 *                 `form()` wraps it, it does not copy it.
 * - `form()`:     the nested `FieldTree`. `form` itself is the root field
 *                 (a signal function); calling it — `form()` — gives the root
 *                 `FieldState`. Nested fields are reached by dotting through
 *                 the tree and calling at the leaf, e.g. `form.priority`
 *                 (the field) or `form.contact.name()` (its `FieldState`).
 * - `[formField]`: binds a native control to one field. It receives the
 *                 *callable field* (`form.title`, `form.assignee.name`) — the
 *                 directive calls it internally to get the `FieldState` — and
 *                 keeps the control's value in sync with the field's `value`
 *                 signal (checkbox → `checked`), reflecting `required`.
 * - Programmatic value updates: the "Pre-fill" button writes the whole nested
 *                 model through the root field's writable `value` signal.
 * - Submission:   `<form [formRoot]>` auto-adds `novalidate` and calls
 *                 `submit()`, which only runs `action` while the form is
 *                 valid — `onInvalid` runs instead when it is not.
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
        <!-- The submit() call fired onInvalid: list what is still missing. -->
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

        <form [formRoot]="form" (submit)="onSubmit()">
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
                      type="text"
                      placeholder="Short, searchable summary"
                      [formField]="form.title"
                    />
                    @if (showFieldError(form.title())) {
                      <div class="invalid-feedback d-block">{{ showFieldError(form.title()) }}</div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="ticket-description" class="form-label">Description</label>
                    <textarea
                      id="ticket-description"
                      class="form-control"
                      rows="4"
                      placeholder="What is broken, who is affected, what was tried…"
                      [formField]="form.description"
                    ></textarea>
                    @if (showFieldError(form.description())) {
                      <div class="invalid-feedback d-block">
                        {{ showFieldError(form.description()) }}
                      </div>
                    }
                  </div>

                  <div class="row g-3">
                    <div class="col-sm-5">
                      <label for="ticket-priority" class="form-label">Priority</label>
                      <select id="ticket-priority" class="form-select" [formField]="form.priority">
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
                        type="text"
                        placeholder="e.g. Marta Kowalska"
                        [formField]="form.assignee.name"
                      />
                      @if (showFieldError(form.assignee.name())) {
                        <div class="invalid-feedback d-block">
                          {{ showFieldError(form.assignee.name()) }}
                        </div>
                      }
                    </div>
                  </div>

                  <div class="mt-3">
                    <label for="assignee-email" class="form-label">Assignee email</label>
                    <input
                      id="assignee-email"
                      class="form-control"
                      type="email"
                      placeholder="name@example.com"
                      [formField]="form.assignee.email"
                    />
                    @if (showFieldError(form.assignee.email())) {
                      <div class="invalid-feedback d-block">
                        {{ showFieldError(form.assignee.email()) }}
                      </div>
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
                        type="text"
                        placeholder="Reporting customer"
                        [formField]="form.contact.name"
                      />
                      @if (showFieldError(form.contact.name())) {
                        <div class="invalid-feedback d-block">
                          {{ showFieldError(form.contact.name()) }}
                        </div>
                      }
                    </div>
                    <div class="col-12 col-sm-6">
                      <label for="contact-email" class="form-label">Email</label>
                      <input
                        id="contact-email"
                        class="form-control"
                        type="email"
                        placeholder="name@example.com"
                        [formField]="form.contact.email"
                      />
                      @if (showFieldError(form.contact.email())) {
                        <div class="invalid-feedback d-block">
                          {{ showFieldError(form.contact.email()) }}
                        </div>
                      }
                    </div>
                  </div>

                  <div class="row g-3 mt-0">
                    <div class="col-sm-7">
                      <label for="contact-phone" class="form-label">Phone</label>
                      <input
                        id="contact-phone"
                        class="form-control"
                        type="tel"
                        placeholder="+48 …"
                        [formField]="form.contact.phone"
                      />
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

                  <!-- demo: @if on a signal value — the workaround field only exists
                        in the DOM while the switch is on (conditional validation
                        is added in Task 08). -->
                  @if (form.resolution.workaroundAvailable().value()) {
                    <div class="mt-3">
                      <label for="resolution-workaround" class="form-label">Workaround</label>
                      <textarea
                        id="resolution-workaround"
                        class="form-control"
                        rows="3"
                        placeholder="How can customers work around this?"
                        [formField]="form.resolution.workaround"
                      ></textarea>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex align-items-center gap-3 mt-4">
            <button type="submit" class="btn btn-primary">
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

  // demo: form() — the nested FieldTree. `form` is the root field (callable);
  // `form()` is its FieldState, and nested fields are dotted through the tree:
  // `form.assignee.name` (field) / `form.assignee.name()` (FieldState). The
  // schema function (second argument) binds validators to nested paths —
  // basic `required` rules only; advanced validation arrives in Task 08.
  readonly form = form(this.model, (t) => {
    required(t.title, { message: 'A title is required.' });
    required(t.description, { message: 'A description is required.' });
    required(t.assignee.name, { message: 'An assignee is required.' });
    required(t.assignee.email, { message: 'An assignee email is required.' });
    required(t.contact.name, { message: 'A contact name is required.' });
    required(t.contact.email, { message: 'A contact email is required.' });
  });

  /**
   * demo: programmatic value update — writes the whole nested model through
   * the root field's writable `value` signal; every bound input follows.
   */
  prefill(): void {
    this.form().value.set(TEMPLATE_TICKET);
  }

  /**
   * Field-level error, shown only once the field is invalid AND touched, so
   * required errors never flash before the user has interacted with the form.
   */
  protected showFieldError(state: FieldState<string>): string | null {
    if (!state.invalid() || !state.touched()) {
      return null;
    }
    return state.errors().at(0)?.message ?? 'This field is required.';
  }

  /** Set to true the first time the user tries to submit; gates the alert. */
  private readonly submitAttempted = signal(false);

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
    return this.form()
      .errorSummary()
      .filter((error: ValidationError) => error.kind === 'required')
      .map((error: ValidationError) => error.message ?? 'This field is required.');
  });

  /**
   * Submission. The `<form [formRoot]>` already called `submit(form)` (the
   * action only runs while the form is valid; `onInvalid` runs otherwise),
   * so this handler just reacts to the two outcomes.
   */
  onSubmit(): void {
    if (this.form().invalid()) {
      // onInvalid: flag the attempt — the computed alert does the rest.
      this.submitAttempted.set(true);
      return;
    }

    // Valid: the ticket list stays in memory, so "creating" a ticket here
    // means adding it to the shared mock data (Tasks 01/05) and going there.
    const value = this.form().value();
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
