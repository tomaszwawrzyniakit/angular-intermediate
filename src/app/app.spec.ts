import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the OpsBoard toolbar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-toolbar')?.textContent).toContain('OpsBoard');
  });

  it('should render the sidenav navigation links', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const navList = compiled.querySelector('mat-nav-list');
    expect(navList).toBeTruthy();
    const links = Array.from(navList?.querySelectorAll('a') ?? []);
    const byHref = new Map(links.map((a) => [a.getAttribute('href'), a.textContent]));
    // The icon ligature may render as text in jsdom, so match on the label.
    expect(byHref.get('/dashboard')?.includes('Dashboard')).toBe(true);
    expect(byHref.get('/tickets')?.includes('Tickets')).toBe(true);
    expect(byHref.get('/tickets/new')?.includes('New Ticket')).toBe(true);
    expect(links.length).toBe(3);
  });

  it('should highlight the active navigation link', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    await router.navigate(['/tickets']);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const compiled = fixture.nativeElement as HTMLElement;
    const ticketsLink = Array.from(compiled.querySelectorAll('a[mat-list-item]')).find(
      (a) => a.getAttribute('href') === '/tickets',
    );
    expect(ticketsLink?.classList.contains('active')).toBe(true);
  });
});
