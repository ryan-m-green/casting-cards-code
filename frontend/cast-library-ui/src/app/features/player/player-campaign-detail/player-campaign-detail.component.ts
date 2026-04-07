import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';

@Component({
  selector: 'app-player-campaign-detail',
  standalone: true,
  imports: [CommonModule, TimeOfDayBarComponent],
  templateUrl: './player-campaign-detail.component.html',
  styleUrl: './player-campaign-detail.component.scss'
})
export class PlayerCampaignDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private hub        = inject(CampaignHubService);

  campaignId = signal('');
  campaign   = signal<CampaignDetail | null>(null);
  lockingIds = signal<Set<string>>(new Set());

  spineColor = () => this.campaign()?.spineColor ?? '#6e28d0';

  constructor() {
    // Remove locked card from view with fade-out, add unlocked card after shell re-fetch
    effect(() => {
      const event = this.hub.cardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;

      if (!event.isVisible) {
        this.lockingIds.update(s => new Set([...s, event.instanceId]));
        setTimeout(() => {
          this.campaign.update(c => {
            if (!c) return c;
            const locking = new Set([...this.lockingIds(), event.instanceId]);
            this.lockingIds.set(locking);
            return {
              ...c,
              cities:    c.cities.filter(x => x.instanceId !== event.instanceId),
              sublocations: c.sublocations.filter(x => x.instanceId !== event.instanceId),
              casts:     c.casts.filter(x => x.instanceId !== event.instanceId),
            };
          });
          this.lockingIds.update(s => { const n = new Set(s); n.delete(event.instanceId); return n; });
        }, 650);
      } else {
        // Shell handles overlay; re-fetch to get the newly visible card into local state
        this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => { this.campaign.set(c); this.transition.spineColor = c.spineColor; });
      }
    });

    // Mark resealed secrets as not revealed
    effect(() => {
      const event = this.hub.secretResealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        return { ...c, secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: false } : s) };
      });
    });

    // Bulk visibility: re-fetch campaign data
    effect(() => {
      const event = this.hub.bulkCardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
        .subscribe(c => { this.campaign.set(c); this.transition.spineColor = c.spineColor; });
    });
  }

  ngOnInit() {
    this.transition.hide();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;
      });
  }

  goToCityDetail(instanceId: string) {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'cities', instanceId]);
  }

  exitPortal() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/player/campaigns'], { state: { noFlip: true } })
    );
  }

  isLocking(instanceId: string): boolean {
    return this.lockingIds().has(instanceId);
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
