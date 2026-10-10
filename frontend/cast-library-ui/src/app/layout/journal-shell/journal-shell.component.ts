import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationStart, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { JournalNavDrawerComponent } from '../../shared/components/Journal/journal-nav-drawer/journal-nav-drawer.component';
import { SubscriptionLockBannerComponent } from '../../shared/components/Journal/subscription-lock-banner/subscription-lock-banner.component';
import { AuthService } from '../../core/auth/auth.service';
import { FlipAnimationService } from '../../core/flip-animation.service';

@Component({
  selector: 'app-journal-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, JournalNavDrawerComponent, SubscriptionLockBannerComponent],
  templateUrl: './journal-shell.component.html',
  styleUrl: './journal-shell.component.scss'
})
export class JournalShellComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth   = inject(AuthService);
  private flipAnimationService = inject(FlipAnimationService);

  readonly spineBands = [18, 30, 45, 60, 72];
  isCover           = signal(false);
  showSpineLinks     = signal(false);
  showOpenMessage    = signal(false);
  openMessageFading  = signal(false);
  readonly isLoggedIn = this.auth.isLoggedIn;

  readonly crestStarLines = [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
    const rad   = angle * Math.PI / 180;
    const long  = i % 2 === 0 ? 36 : 28;
    const short = i % 2 === 0 ? 18 : 20;
    return {
      x1: 50 + Math.cos(rad) * short,
      y1: 50 + Math.sin(rad) * short,
      x2: 50 + Math.cos(rad) * long,
      y2: 50 + Math.sin(rad) * long,
      stroke:      i % 2 === 0 ? 'rgba(200,140,50,0.65)' : 'rgba(180,120,40,0.4)',
      strokeWidth: i % 2 === 0 ? '1.2' : '0.7',
    };
  });

  readonly crestTicks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const inner = 41;
    const outer = i % 6 === 0 ? 44 : 42.5;
    return {
      x1: 50 + Math.cos(angle) * inner,
      y1: 50 + Math.sin(angle) * inner,
      x2: 50 + Math.cos(angle) * outer,
      y2: 50 + Math.sin(angle) * outer,
    };
  });

  private computeShowSpineLinks(url: string): boolean {
    const isCover = url === '/' || url === '';
    const isInfoPage = url.startsWith('/about') || url.startsWith('/legal');
    return isCover || (isInfoPage && !this.auth.isLoggedIn());
  }

  @ViewChild('pageFlip') private pageFlipRef!: ElementRef<HTMLDivElement>;

  private sub?: Subscription;
  private closeCoverSub?: Subscription;
  private resetTimer?: ReturnType<typeof setTimeout>;
  private openMessageTimer?: ReturnType<typeof setTimeout>;
  private closingFlip = false;

  ngOnInit() {
    this.isCover.set(this.router.url === '/' || this.router.url === '');
    this.showSpineLinks.set(this.computeShowSpineLinks(this.router.url));

    this.closeCoverSub = this.auth.closeCoverRequest$.subscribe(() => this.triggerCloseCover());

    this.sub = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const nav = this.router.getCurrentNavigation();
        const state = nav?.extras?.state;
        if (!state?.['noFlip'] && !this.closingFlip) {
          this.triggerFlip(this.isCover());
        }
      }
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        if (!this.closingFlip) {
          this.isCover.set(url === '/' || url === '');
        }
        this.showSpineLinks.set(this.computeShowSpineLinks(url));
      }
    });
  }

  private triggerCloseCover() {
    const el = this.pageFlipRef?.nativeElement;
    if (!el) return;

    clearTimeout(this.resetTimer);
    clearTimeout(this.openMessageTimer);
    this.closingFlip = true;

    el.classList.add('close-flip');
    el.style.transition = 'none';
    el.style.transform  = 'rotateY(-90deg)';
    el.style.opacity    = '1';
    void el.offsetWidth;

    el.style.transition = 'transform 520ms cubic-bezier(0.55,0.06,0.45,0.94)';
    el.style.transform  = 'rotateY(0deg)';

    this.resetTimer = setTimeout(() => {
      this.auth.logout().then(() => {
        this.closingFlip = false;
        this.isCover.set(true);
        this.showSpineLinks.set(this.computeShowSpineLinks('/'));
        requestAnimationFrame(() => {
          el.style.transition = 'none';
          el.style.opacity    = '0';
          el.classList.remove('close-flip');
        });
      });
    }, 520);
  }

  private triggerFlip(fromCover = false) {
    const el = this.pageFlipRef?.nativeElement;
    if (!el) return;

    clearTimeout(this.resetTimer);
    clearTimeout(this.openMessageTimer);
    this.showOpenMessage.set(false);
    this.openMessageFading.set(false);

    this.flipAnimationService.startFlip();

    if (fromCover) {
      el.classList.add('cover-flip');
      this.showOpenMessage.set(true);
      this.openMessageFading.set(false);
    }

    el.style.transition = 'none';
    el.style.transform  = 'rotateY(0deg)';
    el.style.opacity    = '1';
    void el.offsetWidth;

    el.style.transition = 'transform 720ms cubic-bezier(0.55,0.06,0.45,0.94)';
    el.style.transform  = 'rotateY(-180deg)';

    this.resetTimer = setTimeout(() => {
      el.style.transition = 'none';
      el.style.transform  = 'rotateY(0deg)';
      el.style.opacity    = '0';
      el.classList.remove('cover-flip');
      this.flipAnimationService.endFlip();

      if (fromCover) {
        this.openMessageFading.set(true);
        this.openMessageTimer = setTimeout(() => {
          this.showOpenMessage.set(false);
          this.openMessageFading.set(false);
        }, 1550);
      }
    }, 740);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.closeCoverSub?.unsubscribe();
    clearTimeout(this.resetTimer);
    clearTimeout(this.openMessageTimer);
  }
}
