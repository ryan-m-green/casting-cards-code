import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { CampaignFactionsComponent } from '../../campaign/campaign-factions/campaign-factions.component';
import { CampaignFactionInstance } from '../../../shared/models/faction.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastRelationship } from '../../../shared/models/campaign.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-player-campaign-insight',
  standalone: true,
  imports: [CommonModule, CampaignFactionsComponent],
  templateUrl: './player-campaign-insight.component.html',
  styleUrl: './player-campaign-insight.component.scss',
})
export class PlayerCampaignInsightComponent implements OnInit, OnDestroy {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private http         = inject(HttpClient);
  private transition   = inject(PortalTransitionService);
  private shellService = inject(PlayerCampaignShellService);
  private hub          = inject(CampaignHubService);

  campaignId   = signal('');
  factions     = signal<CampaignFactionInstance[]>([]);
  casts        = signal<CampaignCastInstance[]>([]);
  sublocations = signal<CampaignSublocationInstance[]>([]);
  relationships = signal<CampaignCastRelationship[]>([]);

  private hubSubscriptions: Subscription[] = [];

  constructor() {
    // Single cast lock / unlock
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        if (event.cardType === 'cast') {
          if (event.isVisible) {
            this.http.get<{ casts: CampaignCastInstance[] }>(
              `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`
            ).subscribe(detail => this.casts.set(detail.casts ?? []));
          } else {
            this.casts.update(list =>
              list.map(c => c.instanceId === event.instanceId ? { ...c, isVisibleToPlayers: false } : c)
            );
          }
        }

        if (event.cardType === 'faction') {
          if (event.isVisible) {
            this.http.get<CampaignFactionInstance[]>(
              `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/player`
            ).subscribe(f => this.factions.set(f));
          } else {
            this.factions.update(list =>
              list.map(f => f.factionInstanceId === event.instanceId ? { ...f, isVisibleToPlayers: false } : f)
            );
          }
        }
      })
    );

    // Bulk lock / unlock
    this.hubSubscriptions.push(
      this.hub.bulkCardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        this.http.get<{ casts: CampaignCastInstance[] }>(
          `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`
        ).subscribe(detail => this.casts.set(detail.casts ?? []));
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnInit() {
    this.transition.hide();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.shellService.setTitleContext({ pageType: 'player-factions', campaignId: id, campaignName: this.shellService.campaign()?.name, baseRoute: '/player/campaign', location: null });

    this.http.get<CampaignFactionInstance[]>(`${environment.apiUrl}/api/campaigns/${id}/factions/player`)
      .subscribe(f => this.factions.set(f));

    this.http.get<{ casts: CampaignCastInstance[]; sublocations: CampaignSublocationInstance[]; relationships: CampaignCastRelationship[] }>(
      `${environment.apiUrl}/api/campaigns/${id}/player`
    ).subscribe(detail => {
      this.casts.set(detail.casts ?? []);
      this.sublocations.set(detail.sublocations ?? []);
      this.relationships.set(detail.relationships ?? []);
    });
  }

  private goBack() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()])
      .then(() => this.transition.hide());
  }
}
