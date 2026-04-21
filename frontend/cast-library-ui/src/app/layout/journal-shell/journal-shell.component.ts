import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PortalTransitionService } from '../../core/portal-transition.service';

@Component({
  selector: 'app-journal-shell',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './journal-shell.component.html',
  styleUrl: './journal-shell.component.scss'
})
export class JournalShellComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  protected transition = inject(PortalTransitionService);

  readonly spineBands = [18, 30, 45, 60, 72];
  isCover = signal(false);

  @ViewChild('pageFlip') private pageFlipRef!: ElementRef<HTMLDivElement>;

  private sub?: Subscription;
  private resetTimer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.isCover.set(this.router.url === '/' || this.router.url === '');

    this.sub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const nav = this.router.getCurrentNavigation();
        if (!nav?.extras?.state?.['noFlip']) {
          this.triggerFlip();
        }
      }
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        this.isCover.set(url === '/' || url === '');
      }
    });
  }

  private triggerFlip() {
    const el = this.pageFlipRef?.nativeElement;
    if (!el) return;

    clearTimeout(this.resetTimer);

    // Snap to start (no transition), make visible
    el.style.transition = 'none';
    el.style.transform  = 'rotateY(0deg)';
    el.style.opacity    = '1';
    void el.offsetWidth; // force reflow

    // Animate full 180° — matches wireframe exactly
    el.style.transition = 'transform 720ms cubic-bezier(0.55,0.06,0.45,0.94)';
    el.style.transform  = 'rotateY(-180deg)';

    // After animation: snap back to hidden start position
    this.resetTimer = setTimeout(() => {
      el.style.transition = 'none';
      el.style.transform  = 'rotateY(0deg)';
      el.style.opacity    = '0';
    }, 740);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    clearTimeout(this.resetTimer);
  }
}
