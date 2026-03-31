import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-player-campaign-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-campaign-detail.component.html',
  styleUrl: './player-campaign-detail.component.scss'
})
export class PlayerCampaignDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private hub        = inject(CampaignHubService);

  campaignId = signal('');
  campaign   = signal<CampaignDetail | null>(null);

  spineColor = () => this.campaign()?.spineColor ?? '#6e28d0';

  ngOnInit() {
    this.transition.hide();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;
      });
    this.hub.joinCampaign(id).catch(console.warn);
  }

  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(console.warn);
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

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
