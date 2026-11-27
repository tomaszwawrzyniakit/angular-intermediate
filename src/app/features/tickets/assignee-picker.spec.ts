import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssigneePicker } from './assignee-picker';

/**
 * Task 09 — exercises the Angular Aria listbox headless behavior: the
 * ARIA roles/attributes, the roving tabindex, and the keyboard interactions
 * (ArrowDown moves the active option, Enter selects it, typeahead jumps).
 */
describe('AssigneePicker (Angular Aria listbox)', () => {
  let fixture: ComponentFixture<AssigneePicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssigneePicker],
    }).compileComponents();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  function listbox(): HTMLElement {
    return fixture.nativeElement.querySelector('[ngListbox]') as HTMLElement;
  }

  function options(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[ngOption]')) as HTMLElement[];
  }

  /** Dispatch a keydown on the listbox host (where ngListbox listens). */
  function key(k: string): void {
    listbox().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('renders an accessible listbox with labelled options and a roving tabindex', () => {
    fixture = TestBed.createComponent(AssigneePicker);
    fixture.detectChanges();

    const box = listbox();
    expect(box.getAttribute('role')).toBe('listbox');
    expect(box.getAttribute('aria-labelledby')).toBe('assignee-picker-label');
    expect(box.getAttribute('aria-orientation')).toBe('vertical');

    const opts = options();
    expect(opts.length).toBe(4);
    for (const opt of opts) {
      expect(opt.getAttribute('role')).toBe('option');
    }
    // The linkedSignal seeds the first team member as the initial selection.
    expect(opts.map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
    // Roving tabindex: only the active option (also the first one, since the
    // active item follows the selection on init) is reachable by Tab. In the
    // default roving focus mode the active item is exposed via tabindex/data-active,
    // not aria-activedescendant (that is only used by "activedescendant" focusMode).
    expect(box.getAttribute('aria-activedescendant')).toBeNull();
    expect(opts.map((o) => o.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    expect(opts[0].getAttribute('data-active')).toBe('true');
  });

  it('moves the active option with ArrowDown and selects it with Enter', () => {
    fixture = TestBed.createComponent(AssigneePicker);
    fixture.detectChanges();
    const opts = options();

    // ArrowDown: the active (roving tabindex) item moves to the second option.
    key('ArrowDown');
    expect(opts.map((o) => o.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);
    expect(opts[1].getAttribute('data-active')).toBe('true');
    expect(opts[0].getAttribute('data-active')).toBe('false');

    // With selectionMode="explicit", moving focus does NOT select yet.
    for (const o of opts.slice(1)) {
      expect(o.getAttribute('aria-selected')).toBe('false');
    }

    // Enter selects the active option: aria-selected moves and the selection
    // checkmark renders next to the chosen name.
    key('Enter');
    expect(opts[1].getAttribute('aria-selected')).toBe('true');
    expect(opts[0].getAttribute('aria-selected')).toBe('false');
    expect(opts[1].querySelector('.bi-check2-fill')).toBeTruthy();
  });

  it('jumps to a matching name with typeahead (typing "a")', () => {
    fixture = TestBed.createComponent(AssigneePicker);
    fixture.detectChanges();
    const opts = options();

    key('a'); // typeahead from the first option finds "Anna Wiśniewska"
    expect(opts.map((o) => o.getAttribute('tabindex'))).toEqual(['-1', '-1', '0', '-1']);
  });
});
