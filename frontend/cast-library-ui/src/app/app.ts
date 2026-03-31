import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PortalTransitionService } from './core/portal-transition.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="portal-transition-overlay" [class.active]="transition.active()" [class.instant]="transition.instant()"></div>
    <router-outlet />
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .portal-transition-overlay {
      position: fixed;
      inset: 0;
      background: #000;
      opacity: 0;
      pointer-events: none;
      z-index: 99999;
      transition: opacity 1600ms ease;

      &.active {
        opacity: 1;
        pointer-events: all;
      }

      &.instant {
        opacity: 1;
        pointer-events: all;
        transition: none;
      }
    }
  `]
})
export class App {
  transition = inject(PortalTransitionService);
}
