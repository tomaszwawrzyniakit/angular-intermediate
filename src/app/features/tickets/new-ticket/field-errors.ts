import { Component, input } from '@angular/core';
import { FieldState } from '@angular/forms/signals';

/** Bootstrap feedback under a control: first error after the user touched it, or "checking…". */
@Component({
  selector: 'app-field-errors',
  template: `
    @let f = field();
    @if (f.pending()) {
      <div class="form-text"><span class="spinner-border spinner-border-sm"></span> Checking…</div>
    } @else if (f.touched() && f.errors().length) {
      <div class="invalid-feedback d-block">{{ f.errors()[0].message }}</div>
    }
  `,
})
export class FieldErrors {
  readonly field = input.required<FieldState<unknown>>();
}
