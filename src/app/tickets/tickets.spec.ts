import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Tickets } from './tickets';

describe('Tickets', () => {
  it('should render one card per ticket', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    const fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('mat-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain(
      'Production database connection pool exhausted',
    );
  });

  it('should show the empty state when there are no tickets', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    const fixture = TestBed.createComponent(Tickets);
    // The list is data-driven through a signal, so we can swap in an empty backlog.
    const tickets = (
      fixture.componentInstance as unknown as {
        tickets: ReturnType<typeof signal>;
      }
    ).tickets;
    tickets.set([]);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('mat-card');
    expect(cards.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No tickets found');
  });

  it('should mark unassigned tickets', async () => {
    await TestBed.configureTestingModule({ imports: [Tickets] }).compileComponents();
    const fixture = TestBed.createComponent(Tickets);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unassigned');
  });
});
