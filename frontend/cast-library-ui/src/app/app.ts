import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
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
export class App implements OnInit, OnDestroy {
  transition = inject(PortalTransitionService);
  private router = inject(Router);
  private _navSub: Subscription | null = null;

  ngOnInit() {
    this._navSub = this.router.events.pipe(
      filter(e => e instanceof NavigationCancel || e instanceof NavigationError)
    ).subscribe(() => {
      if (this.transition.active()) this.transition.hide();
    });
  }

  ngOnDestroy() {
    this._navSub?.unsubscribe();
  }
}
