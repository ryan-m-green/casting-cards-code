import { Component, OnInit, signal, computed, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail, CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';

@Component({
  selector: 'app-player-sublocation-detail',
  standalone: true,
  imports: [CommonModule, TimeOfDayBarComponent],
  templateUrl: './player-sublocation-detail.component.html',
  styleUrl: './player-sublocation-detail.component.scss'
})
export class PlayerSublocationDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  campaignId         = signal('');
  sublocationInstanceId = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  detailExpanded     = signal(false);
  panelHeight        = signal('220px');
  castRatings        = signal<Map<string, number>>(new Map());

  portalColor = computed(() => this.campaign()?.spineColor ?? '#a8a070');

  sublocation = computed<CampaignSublocationInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(l => l.instanceId === this.sublocationInstanceId()) ?? null;
  });

  sublocationSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.sublocationInstanceId === this.sublocationInstanceId());
  });

  sublocationCasts = computed<CampaignCastInstance[]>(() => {
    const c   = this.campaign();
    const subLoc = this.sublocation();
    if (!c || !subLoc) return [];
    return c.casts.filter(cast => cast.sublocationInstanceId === subLoc.instanceId);
  });

  parentLocation = computed(() => {
    const c   = this.campaign();
    const subLoc = this.sublocation();
    if (!c || !subLoc) return null;
    return c.locations.find(ci => ci.instanceId === subLoc.locationInstanceId) ?? null;
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
          locationInstanceId: event.locationInstanceId,
          sublocationInstanceId: event.sublocationInstanceId,
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
            locations:     c.locations.filter((x: CampaignLocationInstance) => x.instanceId !== event.instanceId),
            sublocations: c.sublocations.filter((x: CampaignSublocationInstance) => x.instanceId !== event.instanceId),
            casts:      c.casts.filter((x: CampaignCastInstance) => x.instanceId !== event.instanceId),
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
    const locId = this.route.snapshot.paramMap.get('sublocationInstanceId')!;
    this.campaignId.set(id);
    this.sublocationInstanceId.set(locId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;

        const subLoc = c.sublocations.find(l => l.instanceId === locId);
        if (subLoc) {
          const castIds = c.casts
            .filter(ca => ca.sublocationInstanceId === subLoc.instanceId)
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
      'sublocations', this.sublocationInstanceId(),
      'cast', cast.instanceId
    ]);
  }

  goToLocation() {
    const locationId = this.sublocation()?.locationInstanceId;
    if (locationId) {
      this.transition.quickCover();
      this.router.navigate(['/player/campaign', this.campaignId(), 'locations', locationId]);
    }
  }

  goToMyCharacter() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'my-character']);
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
