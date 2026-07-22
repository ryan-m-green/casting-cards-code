import { Component, OnInit, OnDestroy, signal, inject, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/journal-watermark/journal-watermark.component';
import { CampaignJoinInputComponent } from '../../../shared/components/campaign-join-input/campaign-join-input.component';
import { PortalCardComponent } from '../../../shared/components/portal-card/portal-card.component';
import { UpgradeBadgeComponent } from '../../../shared/components/upgrade-badge/upgrade-badge.component';
import { environment } from '../../../../environments/environment';
import { Campaign } from '../../../shared/models/campaign.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PortalAnimationService } from '../../../core/portal-animation.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { StripeService } from '../../../core/stripe.service';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';

@Component({
  selector: 'app-campaign-library',
  standalone: true,
  imports: [CommonModule, RouterLink, JournalTitleComponent, JournalWatermarkComponent, CampaignJoinInputComponent, PortalCardComponent, UpgradeBadgeComponent],
  templateUrl: './campaign-library.component.html',
  styleUrl: './campaign-library.component.scss'
})
export class CampaignLibraryComponent implements OnInit, OnDestroy {
  private http           = inject(HttpClient);
  private router         = inject(Router);
  private transition     = inject(PortalTransitionService);
  private el             = inject(ElementRef);
  private hub            = inject(CampaignHubService);
  private animationService = inject(PortalAnimationService);
  private hubSubscriptions: Subscription[] = [];
  private stripe         = inject(StripeService);
  auth = inject(AuthService);
  private drawerService  = inject(SubscriptionDrawerService);

  activeTab             = signal<'mine' | 'joined'>('mine');
  campaigns             = signal<Campaign[]>([]);
  joinedCampaigns       = signal<Campaign[]>([]);
  materializingJoinedId = signal<string | null>(null);
  confirmTarget         = signal<Campaign | null>(null);
  campaignLimitReached  = signal(false);
  joinLoading           = signal(false);
  joinError             = signal('');
  private isEntering   = false;

  constructor() {
    this.hubSubscriptions.push(
      this.hub.playerRemoved$.subscribe(event => {
        if (!event) return;
        this.joinedCampaigns.update(list => list.filter(c => c.id !== event.campaignId));
      })
    );
  }

  cardStyle(campaign: Campaign): string {
    return `--portal-color:${this.safeColor(campaign.spineColor)}`;
  }

  private safeColor(color: string): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  ngOnInit() {
    if (!this.hub.isConnected()) {
      this.hub.connect().catch(() => {});
    }
    this.loadEntityLimits();
    this.http.get<Campaign[]>(`${environment.apiUrl}/api/campaigns`).subscribe(c => this.campaigns.set(c));
    this.loadJoinedCampaigns();
  }

  ngOnDestroy() {
    this.hub.disconnect().catch(() => {});
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadEntityLimits() {
    this.stripe.getUserEntityLimits().subscribe({
      next: (limits) => {
        this.campaignLimitReached.set(limits.campaigns.limitReached);
      },
      error: () => {
        this.campaignLimitReached.set(false);
      }
    });
  }

  private loadJoinedCampaigns() {
    this.http.get<Campaign[]>(`${environment.apiUrl}/api/campaigns/joined`).subscribe(c => this.joinedCampaigns.set(c));
  }

  redeemCode(code: string) {
    if (!code) return;
    this.joinLoading.set(true);
    this.joinError.set('');

    this.http.post<Campaign>(`${environment.apiUrl}/api/campaigns/redeem`, { code }).subscribe({
      next: campaign => {
        this.joinLoading.set(false);
        const alreadyPresent = this.joinedCampaigns().some(c => c.id === campaign.id);
        if (!alreadyPresent) {
          const existingCards = Array.from(
            this.el.nativeElement.querySelectorAll('[data-joined-campaign-id]')
          ) as HTMLElement[];
          const oldRects = existingCards.map(el => el.getBoundingClientRect());

          this.materializingJoinedId.set(campaign.id);
          this.joinedCampaigns.update(list => [campaign, ...list]);

          requestAnimationFrame(() => {
            existingCards.forEach((el, i) => {
              const newRect = el.getBoundingClientRect();
              const dx = oldRects[i].left - newRect.left;
              const dy = oldRects[i].top  - newRect.top;
              if (dx === 0 && dy === 0) return;
              el.style.transition = 'none';
              el.style.transform  = `translate(${dx}px, ${dy}px)`;
              void el.offsetWidth;
              el.style.transition = 'transform 2000ms cubic-bezier(0.34,1.2,0.64,1)';
              el.style.transform  = '';
              el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
            });

            const cardEl = this.el.nativeElement.querySelector(
              `[data-joined-campaign-id="${campaign.id}"]`
            ) as HTMLElement | null;
            if (!cardEl) return;

            this.materializingJoinedId.set(null);
            void cardEl.offsetWidth;
            cardEl.style.opacity    = '0';
            cardEl.style.transform  = 'scale(0.3)';
            cardEl.style.transition = 'none';
            void cardEl.offsetWidth;
            this.animateMaterialize(cardEl, this.safeColor(campaign.spineColor));
          });
        }
      },
      error: err => {
        this.joinLoading.set(false);
        this.joinError.set(err.error?.message ?? 'Invalid or expired code.');
      }
    });
  }

  private animateMaterialize(cardEl: HTMLElement, color: string) {
    const rect = cardEl.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;

    const sparks: HTMLElement[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * 2 * Math.PI + Math.random() * 0.5;
      const dist  = 60 + Math.random() * 70;
      const size  = 4 + Math.random() * 6;
      const sp    = document.createElement('div');
      Object.assign(sp.style, {
        position:      'fixed',
        width:         size + 'px',
        height:        size + 'px',
        borderRadius:  '50%',
        background:    color,
        boxShadow:     `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}, 0 0 ${size * 12}px ${color}`,
        left:          (cx - size / 2) + 'px',
        top:           (cy - size / 2) + 'px',
        zIndex:        '9001',
        pointerEvents: 'none',
        opacity:       '1',
        transition:    'transform 1500ms cubic-bezier(0.2,0,0.4,1), opacity 1500ms ease-out',
        willChange:    'transform, opacity',
      });
      document.body.appendChild(sp);
      sparks.push(sp);
      void sp.offsetWidth;
      sp.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
    }

    setTimeout(() => {
      cardEl.style.transition = 'opacity 1400ms ease-out, transform 1600ms cubic-bezier(0.34,1.3,0.64,1)';
      cardEl.style.opacity    = '1';
      cardEl.style.transform  = 'scale(1.08)';
    }, 600);

    setTimeout(() => {
      sparks.forEach(sp => {
        sp.style.transition = 'transform 1000ms cubic-bezier(0.4,0,0.6,1), opacity 1000ms ease-in';
        sp.style.transform  = 'translate(0,0)';
        sp.style.opacity    = '0';
      });
      cardEl.style.transition = 'transform 600ms ease-out';
      cardEl.style.transform  = 'scale(1.0)';
    }, 2200);

    setTimeout(() => {
      sparks.forEach(s => s.remove());
      cardEl.style.transition = '';
      cardEl.style.transform  = '';
      cardEl.style.opacity    = '';
    }, 4000);
  }

  enter(event: MouseEvent, id: string, spineColor: string = '#6e28d0', routePrefix = '/campaign') {
    if (this.isEntering) return;
    this.isEntering = true;

    const card = event.currentTarget as HTMLElement;

    this.animationService.enter({
      card,
      id,
      spineColor,
      routePrefix,
      onNavigate: (routePrefix, id) => {
        this.router.navigate([routePrefix, id], { state: { noFlip: true, portalEntry: true } });
        this.isEntering = false;
      },
      enableNavigation: true // Set to true to enable navigation
    });
  }

  edit(event: Event, id: string) {
    event.stopPropagation();
    this.router.navigate(['/gm/campaigns', id]);
  }

  requestDelete(campaign: Campaign) { this.confirmTarget.set(campaign); }
  cancelDelete() { this.confirmTarget.set(null); }

  confirmDelete() {
    const c = this.confirmTarget();
    if (!c) return;
    this.http.delete(`${environment.apiUrl}/api/campaigns/${c.id}`).subscribe(() => {
      this.campaigns.update(list => list.filter(x => x.id !== c.id));
      this.confirmTarget.set(null);
    });
  }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
