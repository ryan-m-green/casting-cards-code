import { Component, OnInit, OnDestroy, signal, computed, inject, effect, HostBinding } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-campaign-cast-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campaign-cast-detail.component.html',
  styleUrl: './campaign-cast-detail.component.scss'
})
export class CampaignCastDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);
  private auth       = inject(AuthService);

  @HostBinding('class.portal-entry') portalEntry = false;

  campaignId         = signal('');
  locationInstanceId = signal('');
  castInstanceId     = signal('');
  campaign           = signal<CampaignDetail | null>(null);

  portalColor = computed(() => this.campaign()?.spineColor ?? '#c8b07a');

  cast = computed<CampaignCastInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.casts.find(ca => ca.instanceId === this.castInstanceId()) ?? null;
  });

  parentLocation = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.locations.find(l => l.instanceId === this.locationInstanceId()) ?? null;
  });

  parentCity = computed(() => {
    const c   = this.campaign();
    const loc = this.parentLocation();
    if (!c || !loc) return null;
    return c.cities.find(ci => ci.instanceId === loc.cityInstanceId) ?? null;
  });

  castSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.castInstanceId === this.castInstanceId());
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
    const id     = this.route.snapshot.paramMap.get('id')!;
    const locId  = this.route.snapshot.paramMap.get('locationInstanceId')!;
    const castId = this.route.snapshot.paramMap.get('castInstanceId')!;
    this.campaignId.set(id);
    this.locationInstanceId.set(locId);
    this.castInstanceId.set(castId);
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

  toggleCastVisibility() {
    const cast = this.cast();
    if (!cast) return;
    const next = !cast.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${this.castInstanceId()}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === this.castInstanceId() ? { ...ca, isVisibleToPlayers: next } : ca
        )
      } : c);
    });
  }

  toggleSecret(secret: CampaignSecret) {
    if (secret.isRevealed) {
      this.resealSecret(secret);
    } else {
      this.revealSecret(secret);
    }
  }

  private revealSecret(secret: CampaignSecret) {
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

  exitToLibrary() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/dm/campaigns'], { state: { noFlip: true } })
    );
  }

  goToCampaign() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  goToCity() {
    const city = this.parentCity();
    if (city) {
      this.router.navigate(['/campaign', this.campaignId(), 'cities', city.instanceId]);
    }
  }

  goBack() {
    this.router.navigate(['/campaign', this.campaignId(), 'locations', this.locationInstanceId()]);
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
