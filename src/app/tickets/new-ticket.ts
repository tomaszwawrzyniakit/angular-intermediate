import { Component } from '@angular/core';
import { MatCard, MatCardContent, MatCardTitle } from '@angular/material/card';

@Component({
  selector: 'app-new-ticket',
  imports: [MatCard, MatCardTitle, MatCardContent],
  template: `
    <h1>New Ticket</h1>
    <mat-card>
      <mat-card-title>Ticket form</mat-card-title>
      <mat-card-content>
        <p>The Signal Forms based ticket creation form arrives in a later task.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    :host {
      display: block;
      padding: 24px;
    }
  `,
})
export class NewTicket {}
