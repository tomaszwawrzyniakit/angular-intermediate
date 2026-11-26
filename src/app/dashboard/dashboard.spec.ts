import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';

function kpiValue(host: HTMLElement, label: string): string {
  const cards = Array.from(host.querySelectorAll('.kpi'));
  const card = cards.find((el) => el.textContent?.includes(label));
  return card?.querySelector('.kpi-value')?.textContent?.trim() ?? '';
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard> | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    fixture = undefined;
  });

  it('should render a KPI card with a computed() number per metric', () => {
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // 7 of 10 mock tickets are not "done"; 4 are high priority; 3 are done;
    // 3 have no assignee.
    expect(kpiValue(host, 'Open')).toBe('7');
    expect(kpiValue(host, 'High priority')).toBe('4');
    expect(kpiValue(host, 'Done')).toBe('3');
    expect(kpiValue(host, 'Unassigned')).toBe('3');
  });

  it('should list the five most recent tickets', () => {
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelectorAll('.recent-item').length).toBe(5);
    // Newest first: ticket 10 is the most recent title.
    expect(host.querySelector('.recent-item')?.textContent).toContain(
      'Rate limiter misconfigured for the internal tools API',
    );
  });

  it('should show the placeholder until the @defer chunk resolves', async () => {
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    // Before the idle trigger + the lazy component have resolved, the
    // skeleton placeholder is visible and the chart is not.
    expect(host.querySelector('.skeleton')).not.toBeNull();
    expect(host.querySelector('app-activity-chart')).toBeNull();

    // requestIdleCallback is unavailable in jsdom, so Angular falls back to a
    // setTimeout: the deferred block (and its lazy component) resolves soon.
    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();
    expect(host.querySelector('app-activity-chart')).not.toBeNull();
    expect(host.querySelector('.skeleton')).toBeNull();
  });

  it('should render an accessible bar chart for every status', async () => {
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 50));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const svg = host.querySelector('app-activity-chart svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toContain('3 new');
    expect(svg?.getAttribute('aria-label')).toContain('4 in progress');
    expect(svg?.getAttribute('aria-label')).toContain('3 done');
  });
});
