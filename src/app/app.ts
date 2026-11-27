import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Top-level navigation item shown in the left sidebar. */
interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-root',
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark border-bottom border-secondary-subtle" aria-label="Main">
      <div class="container-fluid px-4 d-flex align-items-center gap-4">
        <a class="navbar-brand d-flex align-items-center gap-2" [routerLink]="['/dashboard']">
          <i class="bi bi-activity accent"></i>
          <span class="fw-semibold">OpsBoard</span>
        </a>
        <button
          class="navbar-toggler d-md-none"
          type="button"
          (click)="sidebarOpen.update((open) => !open)"
          [attr.aria-expanded]="sidebarOpen()"
          aria-controls="ops-sidebar"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <span class="d-none d-lg-flex align-items-center gap-2 text-secondary small ms-auto">
          <span class="status-dot"></span>all systems nominal
        </span>
      </div>
    </nav>

    <div class="container-fluid py-4">
      <div class="row g-4">
        <nav class="col-12 col-md-3 col-lg-2" aria-label="Sections">
          <ul
            id="ops-sidebar"
            class="list-group list-group-flush nav-links collapse d-md-block"
            [class.show]="sidebarOpen()"
          >
            @for (item of navItems; track item.route) {
              <li class="list-group-item">
                <a
                  class="list-group-item-action nav-link d-flex align-items-center gap-2"
                  [routerLink]="item.route"
                  routerLinkActive="is-active"
                  [routerLinkActiveOptions]="{ exact: true }"
                  ariaCurrentWhenActive="page"
                >
                  <i class="bi {{ item.icon }} me-1"></i>
                  {{ item.label }}
                </a>
              </li>
            }
          </ul>
        </nav>

        <main class="col-12 col-md-9 col-lg-10">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
})
export class App {
  /** Sidebar visibility below the `md` breakpoint (Bootstrap `collapse` + `show`). */
  readonly sidebarOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/dashboard' },
    { label: 'Tickets', icon: 'bi-kanban', route: '/tickets' },
    { label: 'New Ticket', icon: 'bi-plus-circle', route: '/tickets/new' },
  ];
}
