import { Listbox, Option } from '@angular/aria/listbox';
import { Component, computed, model } from '@angular/core';

import { TEAM } from './ticket';

/**
 * Angular Aria = headless accessibility: the ngListbox/ngOption directives add roles,
 * aria-selected, roving focus and keyboard support (arrows, Home/End, typeahead, Enter/Space)
 * to OUR markup, styled with plain Bootstrap. Angular Material would bring its own look instead.
 */
@Component({
  selector: 'app-assignee-picker',
  imports: [Listbox, Option],
  template: `
    <ul
      ngListbox
      class="list-group"
      aria-label="Assignee"
      selectionMode="explicit"
      [value]="selection()"
      (valueChange)="assignee.set($event[0])"
    >
      @for (person of team; track person) {
        <li
          ngOption
          [value]="person"
          [label]="person"
          class="list-group-item list-group-item-action"
          [class.active]="person === assignee()"
        >
          {{ person }}
        </li>
      }
    </ul>
  `,
})
export class AssigneePicker {
  // model(): the parent binds [(assignee)] or listens to (assigneeChange).
  readonly assignee = model<string>();

  protected readonly team = TEAM;

  // The listbox works with an array (it supports multi-select); we have a single person.
  protected readonly selection = computed(() => {
    const person = this.assignee();
    return person ? [person] : [];
  });
}
