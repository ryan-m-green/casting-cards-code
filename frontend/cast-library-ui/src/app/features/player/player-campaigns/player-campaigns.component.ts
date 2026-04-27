import { Component, OnInit, OnDestroy, signal, inject, ElementRef, HostListener, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Campaign } from '../../../shared/models/campaign.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-player-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './player-campaigns.component.html',
  styleUrl: './player-campaigns.component.scss'
})
export class PlayerCampaignsComponent implements OnInit, OnDestroy {
  private http       = inject(HttpClient);
  private router     = inject(Router);
  private transition = inject(PortalTransitionService);
  private el         = inject(ElementRef);
  private hub        = inject(CampaignHubService);
  auth               = inject(AuthService);

  campaigns       = signal<Campaign[]>([]);
  materializingId = signal<string | null>(null);
  joinCode        = signal('');
  joinLoading     = signal(false);
  joinError       = signal('');
  menuOpen        = signal(false);
  private isEntering = false;

  constructor() {
    // Listen for PlayerRemoved event from SignalR
    effect(() => {
      const event = this.hub.playerRemoved();
      if (!event) return;

      // Remove the campaign from the list
      this.campaigns.update(list => list.filter(c => c.id !== event.campaignId));
    });
  }

  toggleMenu() { this.menuOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.menuOpen.set(false);
    }
  }

  cardStyle(campaign: Campaign): string {
    return `--portal-color:${this.safeColor(campaign.spineColor)}`;
  }

  safeColor(color: string): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  ngOnInit() {
    // Connect to SignalR hub to receive real-time events
    const token = this.auth.getToken();
    if (token && !this.hub.isConnected()) {
      this.hub.connect(token).catch(console.warn);
    }

    this.http.get<Campaign[]>(`${environment.apiUrl}/api/campaigns`).subscribe(c => this.campaigns.set(c));
  }

  ngOnDestroy() {
    // Disconnect from SignalR hub when leaving the page
    this.hub.disconnect().catch(console.warn);
  }

  redeemCode() {
    const code = this.joinCode().trim();
    if (!code) return;
    this.joinLoading.set(true);
    this.joinError.set('');

    this.http.post<Campaign>(`${environment.apiUrl}/api/campaigns/redeem`, { code }).subscribe({
      next: campaign => {
        this.joinCode.set('');
        this.joinLoading.set(false);
        const alreadyPresent = this.campaigns().some(c => c.id === campaign.id);
        if (!alreadyPresent) {
          // Snapshot existing card positions before the grid reflows
          const existingCards = Array.from(
            this.el.nativeElement.querySelectorAll('[data-campaign-id]')
          ) as HTMLElement[];
          const oldRects = existingCards.map(el => el.getBoundingClientRect());

          // Mark as materializing to prevent visibility before we're ready
          this.materializingId.set(campaign.id);
          this.campaigns.update(list => [campaign, ...list]);

          // Use requestAnimationFrame to ensure DOM is updated before we manipulate styles
          requestAnimationFrame(() => {
            // FLIP: slide existing cards from their old positions into their new ones
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

            // Get the new card element
            const cardEl = this.el.nativeElement.querySelector(
              `[data-campaign-id="${campaign.id}"]`
            ) as HTMLElement | null;
            if (!cardEl) return;

            // Remove materializing class so we can control the card with inline styles
            this.materializingId.set(null);

            // Force a layout to ensure class removal is applied
            void cardEl.offsetWidth;

            // Set invisible starting state for animation
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

    // Card fades in after sparks have had a moment — starts at t=600ms while sparks still mid-burst
    setTimeout(() => {
      cardEl.style.transition = 'opacity 1400ms ease-out, transform 1600ms cubic-bezier(0.34,1.3,0.64,1)';
      cardEl.style.opacity    = '1';
      cardEl.style.transform  = 'scale(1.08)';
    }, 600);

    // Sparks converge back + card settles
    setTimeout(() => {
      sparks.forEach(sp => {
        sp.style.transition = 'transform 1000ms cubic-bezier(0.4,0,0.6,1), opacity 1000ms ease-in';
        sp.style.transform  = 'translate(0,0)';
        sp.style.opacity    = '0';
      });
      cardEl.style.transition = 'transform 600ms ease-out';
      cardEl.style.transform  = 'scale(1.0)';
    }, 2200);

    // Cleanup
    setTimeout(() => {
      sparks.forEach(s => s.remove());
      cardEl.style.transition = '';
      cardEl.style.transform  = '';
      cardEl.style.opacity    = '';
    }, 4000);
  }

  enter(event: MouseEvent, id: string, spineColor: string = '#6e28d0') {
    if (this.isEntering) return;
    this.isEntering = true;

    const card   = event.currentTarget as HTMLElement;
    const ghostW = card.offsetWidth  || 170;
    const ghostH = card.offsetHeight || 240;
    const cx     = window.innerWidth  / 2;
    const cy     = window.innerHeight / 2;
    const color  = this.safeColor(spineColor);

    const ghost = card.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position:      'fixed',
      top:           '-9999px',
      left:          '-9999px',
      width:         ghostW + 'px',
      margin:        '0',
      overflow:      'visible',
      zIndex:        '9000',
      pointerEvents: 'none',
      opacity:       '0',
      transition:    'none',
      willChange:    'transform, opacity',
      visibility:    'hidden',
    });
    document.body.appendChild(ghost);
    void ghost.offsetWidth;

    const actualW = ghost.offsetWidth  || ghostW;
    const actualH = ghost.offsetHeight || ghostH;

    ghost.style.top        = (cy - actualH / 2) + 'px';
    ghost.style.left       = (cx - actualW / 2) + 'px';
    ghost.style.transform  = 'scale(0.4)';
    ghost.style.visibility = '';

    this.transition.ghostTemplate = ghost.cloneNode(true) as HTMLElement;
    this.transition.originRect    = null;
    this.transition.spineColor    = color;

    const sparks: HTMLElement[] = [];
    for (let i = 0; i < 30; i++) {
      const angle  = (i / 30) * 2 * Math.PI + Math.random() * 0.5;
      const dist   = 80 + Math.random() * 80;
      const size   = 5 + Math.random() * 6;
      const startX = cx + Math.cos(angle) * dist;
      const startY = cy + Math.sin(angle) * dist;
      const sp     = document.createElement('div');
      Object.assign(sp.style, {
        position:      'fixed',
        width:         size + 'px',
        height:        size + 'px',
        borderRadius:  '50%',
        background:    color,
        boxShadow:     `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}, 0 0 ${size * 12}px ${color}`,
        left:          (startX - size / 2) + 'px',
        top:           (startY - size / 2) + 'px',
        zIndex:        '9001',
        pointerEvents: 'none',
        opacity:       '1',
        transition:    'transform 600ms cubic-bezier(0.4,0,0.6,1), opacity 600ms ease-in',
      });
      document.body.appendChild(sp);
      sparks.push(sp);
      void sp.offsetWidth;
      sp.style.transform = `translate(${cx - startX}px, ${cy - startY}px)`;
      sp.style.opacity   = '0';
    }

    void ghost.offsetWidth;

    ghost.style.transition = 'opacity 550ms ease-out, transform 600ms cubic-bezier(0.34,1.2,0.64,1)';
    ghost.style.opacity    = '1';
    ghost.style.transform  = 'scale(1.04)';

    setTimeout(() => {
      ghost.style.transition = 'transform 150ms ease-out';
      ghost.style.transform  = 'scale(1.0)';

      setTimeout(() => {
        ghost.style.transition = 'transform 0.26s ease-in-out';
        ghost.style.transform  = 'scale(1.06)';

        setTimeout(() => {
          ghost.style.transition = 'transform 1.5s cubic-bezier(0.4,0,0.8,1)';
          ghost.style.transform  = 'scale(30)';

          this.transition.show();

          setTimeout(() => {
            ghost.remove();
            sparks.forEach(s => s.remove());
            this.isEntering = false;
            this.router.navigate(['/player/campaign', id], { state: { noFlip: true, portalEntry: true } });
          }, 2000);
        }, 260);
      }, 150);
    }, 600);
  }
}
