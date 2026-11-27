import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Dashboard } from './dashboard';

/**
 * Task 10 — verifies the two teaching points of the dashboard:
 * 1. `computed()` KPI cards derive their values from the mock tickets.
 * 2. the `@defer (on idle)` chart: the skeleton `@placeholder` renders in the
 *    initial frame, and the deferred chart content loads once the idle trigger
 *    fires (fake timers drive the idle callback).
 */
describe('Dashboard (KPI + @defer chart)', () => {
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  function kpiValues(): string[] {
    const nodes = fixture.nativeElement.querySelectorAll('.kpi-value') as NodeListOf<HTMLElement>;
    return Array.from(nodes).map((el) => el.textContent?.trim());
  }

  it('computes the four KPI counts from the mock tickets', () => {
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    // open=7 (new+progress), high priority=3, done=3, unassigned=4 (ids 2, 3, 7, 9).
    expect(kpiValues()).toEqual(['7', '3', '3', '4']);
  });

  it('shows the skeleton placeholder before the deferred chart loads', () => {
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    // Placeholder (skeleton) is in the initial DOM; the lazy chart is not.
    expect(fixture.nativeElement.querySelector('.activity-skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.activity-bars')).toBeNull();
  });

  it('loads the deferred activity chart once the idle trigger fires', async () => {
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    // The idle trigger has a 1200 ms hard cap; fake timers pass it.
    await vi.advanceTimersByTimeAsync(2000);
    fixture.detectChanges();

    const bars = fixture.nativeElement.querySelector('.activity-bars');
    expect(bars).toBeTruthy();
    // new=3, progress=4, done=3 — the per-status counts rendered by the chart.
    const nodes = fixture.nativeElement.querySelectorAll(
      '[data-status-value]',
    ) as NodeListOf<HTMLElement>;
    const counts = Array.from(nodes).map((el) => el.textContent?.trim());
    expect(counts).toEqual(['3', '4', '3']);
    expect(bars.getAttribute('aria-label')).toContain('3 New, 4 In progress, 3 Done');
    // The skeleton placeholder is replaced by the chart.
    expect(fixture.nativeElement.querySelector('.activity-skeleton')).toBeNull();
  });
});
