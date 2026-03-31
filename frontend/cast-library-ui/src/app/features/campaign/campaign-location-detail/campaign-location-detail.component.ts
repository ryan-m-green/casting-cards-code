import { Component, OnInit, OnDestroy, signal, computed, inject, effect, HostBinding, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-campaign-location-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campaign-location-detail.component.html',
  styleUrl: './campaign-location-detail.component.scss'
})
export class CampaignLocationDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);
  private auth       = inject(AuthService);

  @HostBinding('class.portal-entry') portalEntry = false;
  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  campaignId         = signal('');
  locationInstanceId = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  detailExpanded     = signal(false);
  panelHeight        = signal('220px');

  isDm = computed(() => this.auth.isDm());

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
    const c = this.campaign();
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

  allCastsVisible = computed(() => {
    const casts = this.locationCasts();
    return casts.length > 0 && casts.every(c => c.isVisibleToPlayers);
  });

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
    const id    = this.route.snapshot.paramMap.get('id')!;
    const locId = this.route.snapshot.paramMap.get('locationInstanceId')!;
    this.campaignId.set(id);
    this.locationInstanceId.set(locId);
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

  private revealSecret(secret: CampaignSecret) {
    this.hub.revealSecret(this.campaignId(), secret.id).catch(console.warn);
  }

  private resealSecret(secret: CampaignSecret) {
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

  toggleLocationVisibility() {
    const loc = this.location();
    if (!loc) return;
    const next = !loc.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations/${this.locationInstanceId()}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        locations: c.locations.map(l =>
          l.instanceId === this.locationInstanceId() ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c);
    });
  }

  goToCast(cast: CampaignCastInstance) {
    this.router.navigate(
      ['/campaign', this.campaignId(), 'locations', this.locationInstanceId(), 'cast', cast.instanceId]
    );
  }

  toggleCastVisibility(cast: CampaignCastInstance) {
    const next = !cast.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${cast.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === cast.instanceId ? { ...ca, isVisibleToPlayers: next } : ca
        )
      } : c);
    });
  }

  toggleAllCastVisibility() {
    const loc  = this.location();
    const next = !this.allCastsVisible();
    if (!loc) return;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations/${loc.instanceId}/casts/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.locationInstanceId === loc.instanceId ? { ...ca, isVisibleToPlayers: next } : ca
        )
      } : c);
    });
  }

  exitToLibrary() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/dm/campaigns'], { state: { noFlip: true } })
    );
  }

  goToCampaign() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  goToCity() {
    const cityId = this.location()?.cityInstanceId;
    if (cityId) {
      this.router.navigate(['/campaign', this.campaignId(), 'cities', cityId]);
    }
  }

  goBack() {
    const cityInstanceId = this.location()?.cityInstanceId;
    if (cityInstanceId) {
      this.router.navigate(['/campaign', this.campaignId(), 'cities', cityInstanceId]);
    } else {
      this.router.navigate(['/campaign', this.campaignId()]);
    }
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
