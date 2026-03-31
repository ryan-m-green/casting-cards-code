import { Component, OnInit, OnDestroy, signal, computed, inject, effect, HostBinding, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignCityInstance } from '../../../shared/models/city.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
@Component({
  selector: 'app-campaign-city-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campaign-city-detail.component.html',
  styleUrl: './campaign-city-detail.component.scss'
})
export class CampaignCityDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);
  private auth       = inject(AuthService);

  @HostBinding('class.portal-entry') portalEntry = false;
  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  campaignId     = signal('');
  cityInstanceId = signal('');
  campaign       = signal<CampaignDetail | null>(null);
  detailExpanded = signal(false);
  panelHeight    = signal('220px');

  isDm = computed(() => this.auth.isDm());

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

  sealedCount = computed(() => this.citySecrets().filter(s => !s.isRevealed).length);
  revealedCount = computed(() => this.citySecrets().filter(s => s.isRevealed).length);

  constructor() {
    effect(() => {
      const event = this.hub.secretRevealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s =>
            s.id === event.secretId ? { ...s, isRevealed: true } : s
          )
        };
      });
    });
  }

  ngOnInit() {
    if (history.state?.portalEntry) {
      this.portalEntry = true;
      setTimeout(() => this.transition.hide(), 300);
    }
    const id         = this.route.snapshot.paramMap.get('id')!;
    const cityInstId = this.route.snapshot.paramMap.get('cityInstanceId')!;
    this.campaignId.set(id);
    this.cityInstanceId.set(cityInstId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;
      });
    this.hub.joinCampaign(id).catch(console.warn);
  }

  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(console.warn);
  }

  revealSecret(secret: CampaignSecret) {
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}/reveal`,
      {}
    ).subscribe(() => {
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s =>
            s.id === secret.id ? { ...s, isRevealed: true } : s
          )
        };
      });
    });
  }

  resealSecret(secret: CampaignSecret) {
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}/reseal`,
      {}
    ).subscribe(() => {
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s =>
            s.id === secret.id ? { ...s, isRevealed: false } : s
          )
        };
      });
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

  toggleSecret(secret: CampaignSecret) {
    if (secret.isRevealed) {
      this.resealSecret(secret);
    } else {
      this.revealSecret(secret);
    }
  }

  toggleCityVisibility() {
    const city = this.city();
    if (!city) return;
    const next = !city.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/cities/${this.cityInstanceId()}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        cities: c.cities.map(ci =>
          ci.instanceId === this.cityInstanceId() ? { ...ci, isVisibleToPlayers: next } : ci
        )
      } : c);
    });
  }

  toggleLocationVisibility(loc: CampaignLocationInstance) {
    const next = !loc.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations/${loc.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        locations: c.locations.map(l =>
          l.instanceId === loc.instanceId ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c);
    });
  }

  toggleAllLocationsVisibility() {
    const locs = this.cityLocations();
    const allVisible = locs.every(l => l.isVisibleToPlayers);
    const next = !allVisible;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/cities/${this.cityInstanceId()}/locations/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        locations: c.locations.map(l =>
          l.cityInstanceId === this.cityInstanceId() ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c);
    });
  }

  allLocationsVisible = computed(() => {
    const locs = this.cityLocations();
    return locs.length > 0 && locs.every(l => l.isVisibleToPlayers);
  });

  goToLocation(loc: CampaignLocationInstance) {
    this.router.navigate(['/campaign', this.campaignId(), 'locations', loc.instanceId]);
  }

  exitToLibrary() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/dm/campaigns'], { state: { noFlip: true } })
    );
  }

  goToCampaign() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  goBack() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
