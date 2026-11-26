import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatListItem, MatListItemIcon, MatNavList } from '@angular/material/list';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { map } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbar,
    MatButton,
    MatIconButton,
    MatIcon,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    MatNavList,
    MatListItem,
    MatListItemIcon,
  ],
  template: `
    <mat-toolbar>
      @if (narrow()) {
        <button mat-icon-button aria-label="Open navigation menu" (click)="sidenav.open()">
          <mat-icon>menu</mat-icon>
        </button>
      }
      <span class="brand">
        <mat-icon>monitor_heart</mat-icon>
        OpsBoard
      </span>
      <span class="spacer"></span>
      <button mat-stroked-button color="primary" [routerLink]="['/tickets/new']">
        <mat-icon>add_ticket</mat-icon>
        New Ticket
      </button>
    </mat-toolbar>

    <div class="layout">
      <mat-sidenav-container>
        <mat-sidenav
          #sidenav
          [mode]="sidenavMode()"
          [opened]="!narrow()"
          aria-label="Main navigation"
        >
          <mat-nav-list>
            @for (item of navItems; track item.label) {
              <a mat-list-item [routerLink]="item.route" routerLinkActive="active">
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                <span>{{ item.label }}</span>
              </a>
            }
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="content">
          <router-outlet />
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .layout {
      position: relative;
      height: calc(100vh - 64px);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .spacer {
      flex: 1;
    }

    .content {
      min-height: 100%;
      overflow-y: auto;
    }

    /* Active nav state: reuses the Material active-indicator tokens. */
    mat-nav-list a.active {
      background-color: var(--mat-list-active-indicator-color, var(--mat-sys-secondary-container));
      color: var(--mat-sys-on-surface);
    }

    mat-nav-list a.active .mat-mdc-list-item-icon,
    mat-nav-list a.active span {
      color: var(--mat-sys-on-surface);
    }
  `,
})
export class App {
  private readonly breakpointObserver = inject(BreakpointObserver);

  // True below the ~600px breakpoint (CDK `Handset`). Bridges the
  // BreakpointObserver observable into a signal.
  protected readonly narrow = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  // Pinned ('side') on wide screens, overlay with backdrop ('over') when narrow.
  protected readonly sidenavMode = computed(() => (this.narrow() ? 'over' : 'side'));

  protected readonly navItems = [
    { route: '/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
    { route: '/tickets', label: 'Tickets', icon: 'ticket' },
    { route: '/tickets/new', label: 'New Ticket', icon: 'add_ticket' },
  ];
}
