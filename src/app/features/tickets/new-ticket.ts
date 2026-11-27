import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-new-ticket',
  template: `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-transparent">
        <h1 class="h5 mb-0 d-flex align-items-center gap-2">
          <i class="bi bi-plus-circle"></i>
          New ticket
        </h1>
      </div>
      <div class="card-body">
        <p class="text-secondary mb-3">
          The new-ticket form (Signal Forms) will be implemented in Task 07. This placeholder
          only proves that the <code>/tickets/new</code> route and the sidebar link work.
        </p>
        <a class="btn btn-primary btn-sm" [routerLink]="['/tickets']">
          <i class="bi bi-arrow-left me-2"></i>Back to tickets
        </a>
      </div>
    </div>
  `,
  imports: [RouterLink],
})
export class NewTicket {}
