import { Component, OnInit, OnDestroy, signal, inject, ElementRef, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/journal-watermark/journal-watermark.component';
import { CampaignJoinInputComponent } from '../../../shared/components/campaign-join-input/campaign-join-input.component';
import { environment } from '../../../../environments/environment';
import { Campaign } from '../../../shared/models/campaign.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-campaign-library',
  standalone: true,
  imports: [CommonModule, RouterLink, JournalTitleComponent, JournalWatermarkComponent, CampaignJoinInputComponent],
  templateUrl: './campaign-library.component.html',
  styleUrl: './campaign-library.component.scss'
})
export class CampaignLibraryComponent implements OnInit, OnDestroy {
  private http       = inject(HttpClient);
  private router     = inject(Router);
  private transition = inject(PortalTransitionService);
  private el         = inject(ElementRef);
  private hub        = inject(CampaignHubService);
  private auth       = inject(AuthService);

  activeTab             = signal<'mine' | 'joined'>('mine');
  campaigns             = signal<Campaign[]>([]);
  joinedCampaigns       = signal<Campaign[]>([]);
  materializingJoinedId = signal<string | null>(null);
  confirmTarget         = signal<Campaign | null>(null);
  joinLoading           = signal(false);
  joinError             = signal('');
  private isEntering   = false;

  constructor() {
    effect(() => {
      const event = this.hub.playerRemoved();
      if (!event) return;
      this.joinedCampaigns.update(list => list.filter(c => c.id !== event.campaignId));
    });
  }

  cardStyle(campaign: Campaign): string {
    return `--portal-color:${this.safeColor(campaign.spineColor)}`;
  }

  private safeColor(color: string): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  ngOnInit() {
    const token = this.auth.getToken();
    if (token && !this.hub.isConnected()) {
      this.hub.connect(token).catch(console.warn);
    }
    this.http.get<Campaign[]>(`${environment.apiUrl}/api/campaigns`).subscribe(c => this.campaigns.set(c));
    this.loadJoinedCampaigns();
  }

  ngOnDestroy() {
    this.hub.disconnect().catch(console.warn);
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

    const card  = event.currentTarget as HTMLElement;
    const ghostW = card.offsetWidth  || 170;
    const ghostH = card.offsetHeight || 240;
    const cx     = window.innerWidth  / 2;
    const cy     = window.innerHeight / 2;
    const color  = this.safeColor(spineColor);

    // Clone card, measure off-screen, then center at small scale
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

    // Spawn converging sparks
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

    // Phase 0: spring zoom in with fade
    ghost.style.transition = 'opacity 550ms ease-out, transform 600ms cubic-bezier(0.34,1.2,0.64,1)';
    ghost.style.opacity    = '1';
    ghost.style.transform  = 'scale(1.04)';

    setTimeout(() => {
      // Settle
      ghost.style.transition = 'transform 150ms ease-out';
      ghost.style.transform  = 'scale(1.0)';

      setTimeout(() => {
        // Breathe pulse
        ghost.style.transition = 'transform 0.26s ease-in-out';
        ghost.style.transform  = 'scale(1.06)';

        setTimeout(() => {
          // Zoom into void
          ghost.style.transition = 'transform 1.5s cubic-bezier(0.4,0,0.8,1)';
          ghost.style.transform  = 'scale(30)';

          this.transition.show();

          setTimeout(() => {
            ghost.remove();
            sparks.forEach(s => s.remove());
            this.isEntering = false;
            this.router.navigate([routePrefix, id], { state: { noFlip: true, portalEntry: true } });
          }, 2000);
        }, 260);
      }, 150);
    }, 600);
  }

  edit(id: string) { this.router.navigate(['/dm/campaigns', id]); }

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
}
