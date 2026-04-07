import { Component, OnInit, signal, computed, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignCityInstance } from '../../../shared/models/city.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PlayerCityPoliticalNotesComponent } from '../player-city-political-notes/player-city-political-notes.component'; // updated

@Component({
  selector: 'app-player-city-detail',
  standalone: true,
  imports: [CommonModule, PlayerCityPoliticalNotesComponent],
  templateUrl: './player-city-detail.component.html',
  styleUrl: './player-city-detail.component.scss'
})
export class PlayerCityDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);

  @ViewChild('detailContent')   private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')       private expandBtnRef!: ElementRef<HTMLElement>;
  @ViewChild('politicalNotes')  private politicalNotesRef!: ElementRef<HTMLElement>;

  campaignId     = signal('');
  cityInstanceId = signal('');
  campaign       = signal<CampaignDetail | null>(null);
  detailExpanded = signal(false);
  panelHeight    = signal('220px');

  portalColor = computed(() => this.campaign()?.spineColor ?? '#9ab0b8');

  city = computed<CampaignCityInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.cities.find(ci => ci.instanceId === this.cityInstanceId()) ?? null;
  });

  citySecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.cityInstanceId === this.cityInstanceId());
  });

  cityLocations = computed<CampaignLocationInstance[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return (c.locations ?? []).filter(l => l.cityInstanceId === this.cityInstanceId());
  });

  cityCasts = computed(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.casts.filter(cast => cast.cityInstanceId === this.cityInstanceId());
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
    const id         = this.route.snapshot.paramMap.get('id')!;
    const cityInstId = this.route.snapshot.paramMap.get('cityInstanceId')!;
    this.campaignId.set(id);
    this.cityInstanceId.set(cityInstId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;
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

  goToLocation(loc: CampaignLocationInstance) {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'locations', loc.instanceId]);
  }

  goToCampaign() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }

  scrollToNotes() {
    const el = this.politicalNotesRef?.nativeElement;
    if (!el) return;
    const targetScroll = window.scrollY + el.getBoundingClientRect().top - 20;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
