import { Listbox as AriaListbox, Option as AriaOption } from '@angular/aria/listbox';
import { Component, computed, linkedSignal } from '@angular/core';

/**
 * Task 09 — Angular Aria: a headless, accessible assignee picker (listbox).
 *
 * Material vs. Aria contrast: `@angular/material` would give a pre-styled,
 * opinionated widget (mat-select: its own markup, styles and behavior bundled
 * into one drop-in component). `@angular/aria` instead gives headless
 * accessibility behavior on OUR markup: the `ngListbox`/`ngOption` directives
 * add only the ARIA attributes (role="listbox"/"option", aria-selected,
 * aria-activedescendant, aria-orientation), the roving tabindex and the
 * keyboard handling (ArrowUp/ArrowDown, Home/End, Enter and Space, typeahead).
 * We keep plain `<ul>`/`<li>` markup and restyle it with Bootstrap, so the
 * behaviour is fully accessible while the look stays ours.
 *
 * Keyboard-only flow (selectionMode="explicit" keeps focus separate from
 * selection, the canonical ARIA listbox pattern): Tab focuses the active
 * option (roving tabindex), ArrowUp/ArrowDown move the active option,
 * Home/End jump to first/last, Enter or Space selects the active option, and
 * typing a letter jumps to a matching name (typeahead).
 */
@Component({
  selector: 'app-assignee-picker',
  imports: [AriaListbox, AriaOption],
  template: `
    <div id="assignee-picker-label" class="form-label small mb-0">
      Assign this ticket to
    </div>
    <!--
      Single-select listbox: two-way value binding syncs the chosen name both
      ways; selectionMode="explicit" keeps focus and selection independent, so
      the user can arrow around first and press Enter/Space when ready.
    -->
    <ul
      ngListbox
      class="list-group assignee-listbox"
      aria-labelledby="assignee-picker-label"
      selectionMode="explicit"
      [(value)]="pickerValue"
    >
      @for (name of names; track name) {
        <li
          ngOption
          class="list-group-item d-flex align-items-center gap-2"
          [value]="name"
          [label]="name"
        >
          <span class="avatar avatar-sm" aria-hidden="true">{{ initials(name) }}</span>
          <span class="small text-truncate">{{ name }}</span>
          @if (selected() === name) {
            <i class="bi bi-check2-fill ms-auto" aria-hidden="true"></i>
          }
        </li>
      }
    </ul>
    <p class="text-secondary small mb-0 mt-2">
      <i class="bi bi-keyboard me-1" aria-hidden="true"></i>
      Arrows or Home/End to move, Enter or Space to select.
    </p>
  `,
})
export class AssigneePicker {
  /** The on-call team — the picker's options (all names are unique strings). */
  protected readonly names = [
    'Marta Kowalska',
    'Tomasz Nowak',
    'Anna Wiśniewska',
    'Piotr Zieliński',
  ];

  /**
   * demo: linkedSignal() — the picker's value is linked to the team roster
   * (the source). If the roster changed, the chosen name would be kept while
   * it is still available and otherwise reset to the first option — so the
   * value can never point at a person that no longer exists. The user can
   * still set it freely from the UI (`[(value)]` on ngListbox).
   */
  protected readonly pickerValue = linkedSignal<string[], string[]>({
    source: () => this.names,
    computation: (team, previous) => {
      const chosen = previous?.value?.[0];
      return [chosen !== undefined && team.includes(chosen) ? chosen : team[0]];
    },
  });

  /** demo: computed() — the selected name (single-select, so the first entry). */
  protected readonly selected = computed(() => this.pickerValue()[0] ?? '');

  /** Initials for the small avatar, e.g. "Marta Kowalska" -> "MK". */
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
