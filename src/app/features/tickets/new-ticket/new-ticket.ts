import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { TicketApi } from '../ticket-api';
import { TicketStore } from '../ticket-store';
import { FieldErrors } from './field-errors';
import { EMPTY_DRAFT, TicketDraft, ticketDraftSchema } from './ticket-form';

const STEPS = ['Problem', 'Reporter', 'Impact', 'Review'] as const;

@Component({
  selector: 'app-new-ticket',
  imports: [FormField, FormRoot, FieldErrors],
  template: `
    <h1 class="h3 mb-3">New ticket</h1>

    <!-- Step indicator: a ✓ when the step's sub-form is valid -->
    <ul class="nav nav-pills mb-4">
      @for (label of steps; track label; let i = $index) {
        <li class="nav-item">
          <button
            type="button"
            class="nav-link"
            [class.active]="step() === i"
            [disabled]="i > step()"
            (click)="step.set(i)"
          >
            {{ i + 1 }}. {{ label }}
            @if (i < step()) {
              <i class="bi bi-check2"></i>
            }
          </button>
        </li>
      }
    </ul>

    <!-- [formRoot] runs the "submission" options from form() on the native submit event -->
    <form [formRoot]="form" class="card">
      <div class="card-body">
        @switch (step()) {
          @case (0) {
            <!-- [formField] takes the FIELD (form.basics.title), the state is form.basics.title().
                 Do not mix it with [value]/(input)/ngModel on the same control. -->
            <div class="mb-3">
              <label class="form-label" for="title">Title</label>
              <input id="title" class="form-control" [formField]="form.basics.title" />
              <app-field-errors [field]="form.basics.title()" />
            </div>
            <div class="mb-3">
              <label class="form-label" for="description">Description</label>
              <textarea
                id="description"
                rows="4"
                class="form-control"
                [formField]="form.basics.description"
              ></textarea>
              <app-field-errors [field]="form.basics.description()" />
            </div>
            <label class="form-label" for="priority">Priority</label>
            <select id="priority" class="form-select w-auto" [formField]="form.basics.priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          }
          @case (1) {
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label" for="name">Name</label>
                <input id="name" class="form-control" [formField]="form.reporter.name" />
                <app-field-errors [field]="form.reporter.name()" />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="email">Email</label>
                <input
                  id="email"
                  type="email"
                  class="form-control"
                  [formField]="form.reporter.email"
                />
                <app-field-errors [field]="form.reporter.email()" />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="channel">Preferred contact</label>
                <select
                  id="channel"
                  class="form-select"
                  [formField]="form.reporter.preferredChannel"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  class="form-control"
                  [formField]="form.reporter.phone"
                />
                <app-field-errors [field]="form.reporter.phone()" />
              </div>
            </div>
          }
          @case (2) {
            <div class="form-check form-switch mb-3">
              <input
                id="down"
                type="checkbox"
                class="form-check-input"
                [formField]="form.impact.serviceDown"
              />
              <label class="form-check-label" for="down">Service is down</label>
            </div>
            <div class="mb-3">
              <label class="form-label" for="users">Affected users</label>
              <input
                id="users"
                type="number"
                class="form-control w-auto"
                [formField]="form.impact.affectedUsers"
              />
              <app-field-errors [field]="form.impact.affectedUsers()" />
            </div>

            <!-- Dynamic section: one input per array item -->
            <fieldset class="mb-3">
              <legend class="form-label fs-6">Affected services</legend>
              @for (service of form.impact.services; track $index; let i = $index) {
                <div class="input-group mb-2">
                  <input
                    class="form-control"
                    [attr.aria-label]="'Service ' + (i + 1)"
                    [formField]="service"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-danger"
                    aria-label="Remove service"
                    (click)="removeService(i)"
                  >
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
                <app-field-errors [field]="service()" />
              }
              <button type="button" class="btn btn-sm btn-outline-secondary" (click)="addService()">
                <i class="bi bi-plus"></i> Add service
              </button>
            </fieldset>

            <div class="form-check form-switch mb-2">
              <input
                id="wa"
                type="checkbox"
                class="form-check-input"
                [formField]="form.impact.workaroundAvailable"
              />
              <label class="form-check-label" for="wa">A workaround exists</label>
            </div>
            <!-- hidden() in the schema switches the rules off; @if removes the control -->
            @if (!form.impact.workaround().hidden()) {
              <textarea
                class="form-control"
                rows="2"
                aria-label="Workaround"
                [formField]="form.impact.workaround"
              ></textarea>
              <app-field-errors [field]="form.impact.workaround()" />
            }
          }
          @case (3) {
            @let d = form().value();
            <dl class="row mb-0">
              <dt class="col-sm-3">Title</dt>
              <dd class="col-sm-9">{{ d.basics.title }} ({{ d.basics.priority }})</dd>
              <dt class="col-sm-3">Reporter</dt>
              <dd class="col-sm-9">{{ d.reporter.name }} · {{ d.reporter.email }}</dd>
              <dt class="col-sm-3">Impact</dt>
              <dd class="col-sm-9">
                {{ d.impact.affectedUsers }} users · {{ d.impact.services.join(', ') }}
              </dd>
            </dl>
            @if (form.basics.title().errors().length) {
              <div class="alert alert-danger mt-3 mb-0" role="alert">
                {{ form.basics.title().errors()[0].message }}
                <button type="button" class="btn btn-link p-0 align-baseline" (click)="step.set(0)">
                  Fix it
                </button>
              </div>
            }
          }
        }
      </div>

      <div class="card-footer d-flex gap-2">
        @if (step() > 0) {
          <button type="button" class="btn btn-outline-secondary" (click)="step.set(step() - 1)">
            Back
          </button>
        }
        @if (step() < steps.length - 1) {
          <!-- pending = an async rule (duplicate title) is still running: valid() is false then -->
          <button
            type="button"
            class="btn btn-primary ms-auto"
            [disabled]="currentStep()().pending()"
            (click)="next()"
          >
            Next
          </button>
        } @else {
          <button type="submit" class="btn btn-success ms-auto" [disabled]="form().submitting()">
            @if (form().submitting()) {
              <span class="spinner-border spinner-border-sm"></span>
            }
            Create ticket
          </button>
        }
      </div>
    </form>
  `,
})
export default class NewTicket {
  private readonly api = inject(TicketApi);
  private readonly router = inject(Router);
  private readonly store = inject(TicketStore);

  protected readonly steps = STEPS;
  protected readonly step = signal(0);

  // The model is a plain signal: the form reads AND writes it. form() adds field state + rules.
  private readonly draft = signal<TicketDraft>(structuredClone(EMPTY_DRAFT));

  protected readonly form = form(this.draft, ticketDraftSchema, {
    submission: {
      // Runs only when the whole form is valid. Returned errors land on the fields (server validation).
      action: async (root) => {
        const { basics } = root().value();
        try {
          const ticket = await firstValueFrom(this.api.create(basics));
          this.store.added(ticket);
          this.saved.set(true); // let the canDeactivate guard pass
          await this.router.navigate(['/tickets', ticket.id]);
          return undefined;
        } catch (e) {
          if (e instanceof HttpErrorResponse && e.status === 422) {
            return {
              fieldTree: root.basics.title,
              kind: 'server',
              message: e.error.errors[0].message,
            };
          }
          throw e;
        }
      },
    },
  });

  private readonly saved = signal(false);

  /** Read by the canDeactivate guard in tickets.routes.ts. dirty() = the user changed something. */
  readonly hasUnsavedChanges = computed(() => this.form().dirty() && !this.saved());

  /** The sub-form (FieldTree) of the current step; the Review step has none. */
  protected readonly currentStep = computed(
    () => [this.form.basics, this.form.reporter, this.form.impact, this.form][this.step()],
  );

  /**
   * Multi-step: only move on when the current step's sub-form is valid.
   * (submit() also marks fields touched, but fields of steps that are not rendered would show
   * nothing – so every step is checked before the user can leave it.)
   */
  protected next(): void {
    const current = this.currentStep();
    current().markAsTouched(); // show all errors of this step
    if (current().valid()) {
      this.step.update((s) => s + 1);
    }
  }

  // Dynamic list = change the array in the model; the form follows.
  protected addService(): void {
    this.form.impact.services().value.update((list) => [...list, '']);
  }

  protected removeService(index: number): void {
    this.form.impact.services().value.update((list) => list.filter((_, i) => i !== index));
  }
}
