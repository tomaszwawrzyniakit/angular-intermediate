import { Component, computed, input } from '@angular/core';
import { Ticket } from '../ticket';
import { TicketStatusValue } from '../ticket-status/ticket-status';

// One bar per status. The order, labels and colors are the single source of
// truth for the chart, so the template stays a dumb rendering loop.
const STATUS_ORDER: readonly TicketStatusValue[] = ['new', 'progress', 'done'];
const STATUS_LABEL: Record<TicketStatusValue, string> = {
  new: 'New',
  progress: 'In progress',
  done: 'Done',
};
// Material system colors: blue for new work, purple for in flight, neutral
// gray for finished work.
const STATUS_COLOR: Record<TicketStatusValue, string> = {
  new: 'var(--mat-sys-primary)',
  progress: 'var(--mat-sys-tertiary)',
  done: 'var(--mat-sys-secondary)',
};

/**
 * A deliberately tiny, hand-rolled SVG bar chart (no chart library):
 * one horizontal bar per ticket status, scaled to the busiest status.
 *
 * This component is only referenced inside the dashboard's `@defer` block,
 * so Angular puts it in its own lazy chunk that is fetched after the page
 * has gone idle — visible as a separate request in DevTools → Network.
 */
@Component({
  selector: 'app-activity-chart',
  template: `
    <svg viewBox="0 0 360 160" role="img" [attr.aria-label]="summary()">
      @for (bar of bars(); track bar.status; let i = $index) {
        @let y = 12 + i * 56;
        <text class="label" x="0" [attr.y]="y + 17">{{ bar.label }}</text>
        <rect class="track" x="100" [attr.y]="y" width="200" height="24" rx="12" />
        <rect
          class="bar"
          [attr.fill]="bar.color"
          x="100"
          [attr.y]="y"
          [attr.width]="bar.width"
          height="24"
          rx="12"
        />
        <text class="value" [attr.x]="112 + bar.width" [attr.y]="y + 17">{{ bar.value }}</text>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
    }

    .label {
      font-size: 13px;
      fill: var(--mat-sys-on-surface-variant);
    }

    .value {
      font-size: 13px;
      font-weight: 600;
      fill: var(--mat-sys-on-surface);
    }

    .track {
      fill: var(--mat-sys-surface-container-highest);
    }

    /* Grow the bars in from the left once the lazy chunk has rendered. */
    .bar {
      transform-box: fill-box;
      transform-origin: left center;
      animation: bar-grow 700ms cubic-bezier(0.2, 0, 0, 1) both;
    }

    @keyframes bar-grow {
      from {
        transform: scaleX(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
      }
    }
  `,
})
export class ActivityChart {
  readonly tickets = input.required<Ticket[]>();

  // computed(): one bar descriptor per status — its label, value, color and
  // width (0–200px, scaled so the busiest status fills its track).
  protected readonly bars = computed(() => {
    const counts: Record<TicketStatusValue, number> = { new: 0, progress: 0, done: 0 };
    for (const ticket of this.tickets()) counts[ticket.status]++;
    const max = Math.max(counts.new, counts.progress, counts.done, 1);
    return STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABEL[status],
      value: counts[status],
      color: STATUS_COLOR[status],
      width: Math.round((counts[status] / max) * 200),
    }));
  });

  // A text summary of the same data for screen readers.
  protected readonly summary = computed(() => {
    const parts = this.bars().map((bar) => `${bar.value} ${bar.label.toLowerCase()}`);
    return `Bar chart of tickets by status: ${parts.join(', ')}.`;
  });
}
