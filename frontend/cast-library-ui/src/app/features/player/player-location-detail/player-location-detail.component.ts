import { Component, OnInit, signal, computed, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail, CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';

@Component({
  selector: 'app-player-location-detail',
  standalone: true,
  imports: [CommonModule, TimeOfDayBarComponent],
  templateUrl: './player-location-detail.component.html',
  styleUrl: './player-location-detail.component.scss'
})
export class PlayerLocationDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  campaignId         = signal('');
  locationInstanceId = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  detailExpanded     = signal(false);
  panelHeight        = signal('220px');
  castRatings        = signal<Map<string, number>>(new Map());

  portalColor = computed(() => this.campaign()?.spineColor ?? '#a8a070');

  location = computed<CampaignLocationInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.locations.find(l => l.instanceId === this.locationInstanceId()) ?? null;
  });

  locationSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.locationInstanceId === this.locationInstanceId());
  });

  locationCasts = computed<CampaignCastInstance[]>(() => {
    const c   = this.campaign();
    const loc = this.location();
    if (!c || !loc) return [];
    return c.casts.filter(cast => cast.locationInstanceId === loc.instanceId);
  });

  parentCity = computed(() => {
    const c   = this.campaign();
    const loc = this.location();
    if (!c || !loc) return null;
    return c.cities.find(ci => ci.instanceId === loc.cityInstanceId) ?? null;
  });

  constructor() {
    effect(() => {
      const event = this.hub.secretRevealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        const exists = c.secrets.some(s => s.id === event.secretId);
        if (exists) {
          return { ...c, secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: true } : s) };
        }
        const newSecret: CampaignSecret = {
          id: event.secretId,
          campaignId: event.campaignId,
          castInstanceId: event.castInstanceId,
          cityInstanceId: event.cityInstanceId,
          locationInstanceId: event.locationInstanceId,
          content: event.secretContent,
          sortOrder: 0,
          isRevealed: true,
          revealedAt: new Date().toISOString(),
        };
        return { ...c, secrets: [...c.secrets, newSecret] };
      });
    });

    effect(() => {
      const event = this.hub.secretResealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        return { ...c, secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: false } : s) };
      });
    });

    effect(() => {
      const event = this.hub.cardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;
      if (event.isVisible) {
        this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => { this.campaign.set(c); this.transition.spineColor = c.spineColor; });
      } else {
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            cities:    c.cities.filter(x => x.instanceId !== event.instanceId),
            locations: c.locations.filter(x => x.instanceId !== event.instanceId),
            casts:     c.casts.filter(x => x.instanceId !== event.instanceId),
          };
        });
      }
    });

    effect(() => {
      const event = this.hub.bulkCardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
        .subscribe(c => { this.campaign.set(c); this.transition.spineColor = c.spineColor; });
    });
  }

  ngOnInit() {
    this.transition.hide();
    const id    = this.route.snapshot.paramMap.get('id')!;
    const locId = this.route.snapshot.paramMap.get('locationInstanceId')!;
    this.campaignId.set(id);
    this.locationInstanceId.set(locId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;

        const loc = c.locations.find(l => l.instanceId === locId);
        if (loc) {
          const castIds = c.casts
            .filter(ca => ca.locationInstanceId === loc.instanceId)
            .map(ca => ca.instanceId);
          if (castIds.length) {
            const params = castIds.map(cid => `castInstanceId=${cid}`).join('&');
            this.http.get<CampaignCastPlayerNotes[]>(
              `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/by-cast-instances?${params}`
            ).subscribe(notes => {
              const map = new Map<string, number>();
              notes.forEach(n => map.set(n.castInstanceId, n.rating));
              this.castRatings.set(map);
            });
          }
        }
      });
  }

  toggleDetail() {
    if (this.detailExpanded()) {
      this.panelHeight.set('220px');
      this.detailExpanded.set(false);
    } else {
      const contentH = this.detailContentRef.nativeElement.scrollHeight;
      const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
      this.panelHeight.set(`${contentH + btnH}px`);
      this.detailExpanded.set(true);
    }
  }

  goToCast(cast: CampaignCastInstance) {
    this.transition.quickCover();
    this.router.navigate([
      '/player/campaign', this.campaignId(),
      'locations', this.locationInstanceId(),
      'cast', cast.instanceId
    ]);
  }

  goToCity() {
    const cityId = this.location()?.cityInstanceId;
    if (cityId) {
      this.transition.quickCover();
      this.router.navigate(['/player/campaign', this.campaignId(), 'cities', cityId]);
    }
  }

  goToCampaign() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }

  castRating(instanceId: string): number {
    return this.castRatings().get(instanceId) ?? 0;
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
