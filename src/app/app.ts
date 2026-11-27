import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <main class="container py-4">
      <h1 class="h3">OpsBoard</h1>
      <router-outlet />
    </main>
  `,
})
export class App {}
