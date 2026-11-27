import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { QuickSearch } from './features/tickets/quick-search';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, QuickSearch],
  template: `
    <nav class="navbar navbar-expand bg-body-tertiary border-bottom" aria-label="Main">
      <div class="container">
        <a class="navbar-brand" routerLink="/"><i class="bi bi-activity text-info"></i> OpsBoard</a>
        <ul class="navbar-nav">
          @for (link of links; track link.path) {
            <li class="nav-item">
              <a
                class="nav-link"
                [routerLink]="link.path"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
                ariaCurrentWhenActive="page"
              >
                <i class="bi {{ link.icon }}"></i> {{ link.label }}
              </a>
            </li>
          }
        </ul>
        <app-quick-search class="ms-auto" />
      </div>
    </nav>

    <main class="container py-4">
      <router-outlet />
    </main>
  `,
})
export class App {
  protected readonly links = [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: '/tickets', label: 'Tickets', icon: 'bi-list-task' },
    { path: '/tickets/new', label: 'New ticket', icon: 'bi-plus-circle' },
  ];
}
