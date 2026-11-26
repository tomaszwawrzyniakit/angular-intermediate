import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbar, MatIcon],
  template: `
    <mat-toolbar color="primary">
      <span class="brand">
        <mat-icon>monitor_heart</mat-icon>
        OpsBoard
      </span>
      <span class="spacer"></span>
      <nav aria-label="Main navigation">
        <a [routerLink]="['/dashboard']" routerLinkActive="active" class="nav-link">
          Dashboard
        </a>
        <a [routerLink]="['/tickets']" routerLinkActive="active" class="nav-link">
          Tickets
        </a>
      </nav>
    </mat-toolbar>
    <router-outlet />
  `,
  styles: `
    :host {
      display: block;
      min-height: 100%;
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

    .nav-link {
      margin-left: 16px;
      color: inherit;
      text-decoration: none;
    }
  `,
})
export class App {}
