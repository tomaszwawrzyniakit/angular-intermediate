import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  FieldState,
  email,
  form,
  FormField,
  FormRoot,
  min,
  required,
} from '@angular/forms/signals';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
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

/**
 * The `/tickets/new` page: a nested Signal Form (Angular 22).
 *
 * Signal Forms teaching points demonstrated here:
 *
 *  - `signal()`            → the data model; the single source of truth
 *  - `form()`              → builds a `FieldTree` over that signal (no copy!)
 *  - `[formField]`         → binds a leaf field to a Material control
 *  - nested field access   → `form.contact.email`, `form.incident.startedAt`, …
 *  - programmatic updates  → "Pre-fill from template" sets (nested) field values
 *                            from code; the Material UI follows automatically
 *  - submission            → `formRoot` + `submission.action`: it runs only when
 *                            the form is valid, `onInvalid` otherwise
 *
 * A `Field` is a function that returns the `FieldState` for one leaf:
 * `title()` → the state, `title().value` → the (writable) value signal, and
 * `title().invalid()` / `.touched()` / `.errors()` the validation state. The
 * template binds the field itself (`[formField]="title"`) and reads its state
 * (`title().invalid()`).
 *
 * The form is grouped into four Material cards: Ticket, Contact, Incident and
 * Resolution. Only the "basic" required rules are wired up here; the advanced
 * validation set arrives in Task 08.
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
      Fill in the incident details. Fields marked <strong>*</strong> are required.
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
              @if (title().invalid() && title().touched()) {
                <mat-error>{{ firstError(title()) }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Description</mat-label>
              <textarea matInput rows="3" [formField]="description"></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <mat-select [formField]="priority">
                <mat-option value="low">Low</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="high">High</mat-option>
              </mat-select>
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
                @if (assigneeEmail().invalid() && assigneeEmail().touched()) {
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
              @if (contactEmail().invalid() && contactEmail().touched()) {
                <mat-error>{{ firstError(contactEmail()) }}</mat-error>
              }
            </mat-form-field>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput type="tel" [formField]="contactPhone" />
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

            @if (workaroundAvailable()) {
              <mat-form-field appearance="outline">
                <mat-label>Workaround</mat-label>
                <textarea matInput rows="3" [formField]="workaround"></textarea>
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

  // form(): builds the FieldTree over the model signal and applies the basic
  // validation rules. The `submission` block is what `formRoot` invokes on
  // submit: `action` runs only when the form is valid, `onInvalid` otherwise.
  readonly form = form(
    this.model,
    (m) => {
      required(m.title);
      required(m.assignee.email);
      email(m.assignee.email, { message: 'Enter a valid e-mail address.' });
      required(m.contact.email);
      email(m.contact.email, { message: 'Enter a valid e-mail address.' });
      min(m.incident.affectedUsers, 0);
    },
    {
      submission: {
        action: async () => {
          // The model signal is the source of truth, so read it directly.
          const v = this.model();
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

  protected firstError<T>(state: FieldState<T, string | number>): string {
    return state.errors()[0]?.message ?? 'This field is required.';
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
