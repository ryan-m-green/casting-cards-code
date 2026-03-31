import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Campaign } from '../../../shared/models/campaign.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

@Component({
  selector: 'app-campaign-library',
  standalone: true,
  imports: [CommonModule, RouterLink, DmNavComponent],
  templateUrl: './campaign-library.component.html',
  styleUrl: './campaign-library.component.scss'
})
export class CampaignLibraryComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private transition = inject(PortalTransitionService);

  campaigns     = signal<Campaign[]>([]);
  confirmTarget = signal<Campaign | null>(null);
  private isEntering = false;

  cardStyle(campaign: Campaign): string {
    return `--portal-color:${this.safeColor(campaign.spineColor)}`;
  }

  private safeColor(color: string): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  ngOnInit() {
    this.http.get<Campaign[]>(`${environment.apiUrl}/api/campaigns`).subscribe(c => this.campaigns.set(c));
  }

  enter(event: MouseEvent, id: string, spineColor: string = '#6e28d0') {
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
            this.router.navigate(['/campaign', id], { state: { noFlip: true, portalEntry: true } });
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
