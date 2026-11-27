import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  template: `
    <nav class="navbar navbar-expand border-bottom border-secondary-subtle" aria-label="Main">
      <div class="container-fluid px-4 d-flex align-items-center gap-4">
        <a class="navbar-brand d-flex align-items-center gap-2" [routerLink]="['/dashboard']">
          <i class="bi bi-activity accent"></i>
          <span class="fw-semibold">OpsBoard</span>
        </a>
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">
              <i class="bi bi-speedometer2 me-1"></i>Dashboard
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" routerLink="/tickets" routerLinkActive="active">
              <i class="bi bi-kanban me-1"></i>Tickets
            </a>
          </li>
        </ul>
        <span class="d-none d-sm-flex align-items-center gap-2 text-secondary small">
          <span class="status-dot"></span>all systems nominal
        </span>
      </div>
    </nav>

    <main class="container-fluid py-4">
      <router-outlet />
    </main>
  `,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
})
export class App {}
