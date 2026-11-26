import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MOCK_TICKETS } from '../ticket';
import { TicketStatus } from '../ticket-status/ticket-status';
import { ActivityChart } from './activity-chart';
import { RenderInfo } from './render-info';

/**
 * The ops overview — the hero demo screen.
 *
 * KPI cards are plain computed() values over the mock backlog. The activity
 * chart is the teaching point for DAY 4: it is wrapped in `@defer`, so its
 * code is compiled into a separate lazy chunk that Angular fetches only
 * after the page has gone idle (`on idle(500)`). Open DevTools → Network
 * and reload: the chart's chunk arrives as its own request, well after the
 * first paint.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
    MatCardHeader,
    MatCardContent,
    MatButton,
    MatIcon,
    MatSlideToggle,
    RouterLink,
    TicketStatus,
    ActivityChart,
    RenderInfo,
  ],
  template: `
    <div class="header">
      <h1>Dashboard</h1>
      <p class="subtitle">Live overview of the ops backlog</p>
      <div class="header-foot">
        <!--
          Task 11 teaching example (SSR + hydration). The component next to
          this switch renders a new-Date value. With the switch ON it uses the
          ANTI-PATTERN variant: a fresh new Date() is read at render time on
          every platform, so under SSR the page paints the server's timestamp
          and then it SHIFTS to the browser's right after hydration (Angular 22
          reconciles a value difference into a content shift; it becomes a
          thrown NG05xx DOM-mismatch error when the value drives un-reconcilable
          structure or external code edits the DOM). With the switch OFF the
          fixed version ships: a deterministic first pass plus the live time
          applied in afterNextRender, so hydration is clean. See render-info.ts.
        -->
        <mat-slide-toggle
          color="warn"
          [checked]="demoHydrationError()"
          (change)="demoHydrationError.set($event.checked)"
          aria-label="Demo hydration mismatch (toggle ON and hard-reload to watch the non-deterministic time value shift after hydration)"
          >Demo hydration mismatch</mat-slide-toggle
        >
        <app-render-info [broken]="demoHydrationError()" />
      </div>
    </div>

    <!-- KPI cards: big number + label + icon, all computed() from the data. -->
    <div class="kpis">
      <mat-card class="kpi kpi--open">
        <mat-icon aria-hidden="true">pending_actions</mat-icon>
        <p class="kpi-value">{{ openTickets().length }}</p>
        <p class="kpi-label">Open</p>
      </mat-card>
      <mat-card class="kpi kpi--high">
        <mat-icon aria-hidden="true">priority_high</mat-icon>
        <p class="kpi-value">{{ highPriority().length }}</p>
        <p class="kpi-label">High priority</p>
      </mat-card>
      <mat-card class="kpi kpi--done">
        <mat-icon aria-hidden="true">check_circle</mat-icon>
        <p class="kpi-value">{{ doneTickets().length }}</p>
        <p class="kpi-label">Done</p>
      </mat-card>
      <mat-card class="kpi kpi--unassigned">
        <mat-icon aria-hidden="true">person_outline</mat-icon>
        <p class="kpi-value">{{ unassigned().length }}</p>
        <p class="kpi-label">Unassigned</p>
      </mat-card>
    </div>

    <div class="panels">
      <mat-card class="panel">
        <mat-card-header>
          <mat-card-title>Activity by status</mat-card-title>
          <mat-card-subtitle>Hand-rolled SVG — loaded lazily with &#64;defer</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <!--
            DAY 4 — defer + incremental hydration (Task 11).
            The "on idle(500)" trigger drives the pure-client (CSR) path: the
            chart's lazy chunk is fetched after the page has gone idle.
            The "hydrate on idle(500)" trigger drives the SSR path: because a
            hydrate trigger is present, the server renders the chart's MAIN
            template (not the skeleton) into the HTML, and on the client that
            dehydrated block hydrates incrementally when the browser goes idle.
          -->
          @defer (on idle(500); hydrate on idle(500)) {
            <app-activity-chart [tickets]="tickets()" />
          } @placeholder {
            <!-- Shown until the idle trigger + the lazy chunk are both ready. -->
            <div class="skeleton" aria-hidden="true">
              <div class="skeleton-bar" style="width: 70%"></div>
              <div class="skeleton-bar" style="width: 92%"></div>
              <div class="skeleton-bar" style="width: 45%"></div>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="panel">
        <mat-card-header>
          <mat-card-title>Recent tickets</mat-card-title>
          <a mat-button color="primary" class="view-all" [routerLink]="['/tickets']">View all</a>
        </mat-card-header>
        <mat-card-content>
          <ul class="recent">
            @for (ticket of recentTickets(); track ticket.id) {
              @let assignee = ticket.assignee;
              <li class="recent-item">
                <a class="recent-link" [routerLink]="['/tickets', ticket.id]">
                  {{ ticket.title }}
                </a>
                <span class="recent-meta">
                  <app-ticket-status [status]="ticket.status" />
                  @if (assignee) {
                    <span class="assignee-name">{{ assignee }}</span>
                  } @else {
                    <span class="assignee-name unassigned">Unassigned</span>
                  }
                </span>
              </li>
            }
          </ul>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }

    .header {
      margin-bottom: 24px;

      h1 {
        margin: 0;
      }

      .subtitle {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-large);
      }
    }

    .header-foot {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    /* KPI cards ---------------------------------------------------------- */
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .kpi {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .kpi-value {
      margin: 0;
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1.1;
    }

    .kpi-label {
      margin: 0;
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }

    .kpi--open mat-icon {
      color: var(--mat-sys-primary);
    }

    .kpi--high mat-icon {
      color: var(--mat-sys-error);
    }

    .kpi--done mat-icon {
      color: var(--mat-sys-secondary);
    }

    .kpi--unassigned mat-icon {
      color: var(--mat-sys-tertiary);
    }

    /* Panels ------------------------------------------------------------- */
    .panels {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 16px;
      margin-top: 16px;
    }

    @media (max-width: 900px) {
      .panels {
        grid-template-columns: 1fr;
      }
    }

    .view-all {
      margin-left: auto;
      align-self: center;
    }

    /* Skeleton placeholder for the deferred chart. */
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 10px 0;
    }

    .skeleton-bar {
      height: 24px;
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-highest);
      animation: skeleton-pulse 1.1s ease-in-out infinite alternate;
    }

    @keyframes skeleton-pulse {
      from {
        opacity: 0.5;
      }
      to {
        opacity: 1;
      }
    }

    /* Recent tickets ------------------------------------------------------ */
    .recent {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .recent-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 0;

      & + .recent-item {
        border-top: 1px solid var(--mat-sys-outline-variant);
      }
    }

    .recent-link {
      font: var(--mat-sys-title-small);
      text-decoration: none;
      color: var(--mat-sys-on-surface);

      &:hover {
        text-decoration: underline;
      }

      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: 2px;
        border-radius: 4px;
      }
    }

    .recent-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .assignee-name {
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class Dashboard {
  protected readonly tickets = signal(MOCK_TICKETS);

  // Task 11: drives the hydration teaching example (see render-info.ts).
  // OFF = the fixed, clean-hydration build that ships. ON = the anti-pattern
  // variant (fresh new Date() at render time) so the trainer can watch the
  // non-deterministic value shift right after hydration under SSR.
  protected readonly demoHydrationError = signal(false);

  // computed(): every KPI is derived state — nothing is stored, so the
  // numbers can never drift out of sync with the backlog.
  protected readonly openTickets = computed(() =>
    this.tickets().filter((t) => t.status !== 'done'),
  );
  protected readonly highPriority = computed(() =>
    this.tickets().filter((t) => t.priority === 'high'),
  );
  protected readonly doneTickets = computed(() =>
    this.tickets().filter((t) => t.status === 'done'),
  );
  protected readonly unassigned = computed(() => this.tickets().filter((t) => !t.assignee));

  // The five most recent backlog items (highest id first).
  protected readonly recentTickets = computed(() =>
    [...this.tickets()].sort((a, b) => b.id - a.id).slice(0, 5),
  );
}
