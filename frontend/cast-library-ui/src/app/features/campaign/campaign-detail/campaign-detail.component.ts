import { Component, OnInit, OnDestroy, signal, computed, inject, effect, HostBinding } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail, CampaignNote } from '../../../shared/models/campaign.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { SecretModalComponent } from '../../../shared/components/secret-modal/secret-modal.component';
import { LockPillComponent } from '../../../shared/components/lock-pill/lock-pill.component';
import { CampaignNotesComponent } from '../../../shared/components/campaign-notes/campaign-notes.component';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';
@Component({
  selector: 'app-campaign-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, SecretModalComponent, LockPillComponent, CampaignNotesComponent, TimeOfDayBarComponent],
  templateUrl: './campaign-detail.component.html',
  styleUrl: './campaign-detail.component.scss'
})
export class CampaignDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  auth               = inject(AuthService);
  hub                = inject(CampaignHubService);

  @HostBinding('class.portal-entry') portalEntry = false;

  campaign         = signal<CampaignDetail | null>(null);
  campaignId       = signal('');
  selectedSecretId = signal<string | null>(null);
  secretModalContent = signal('');
  showSecretModal  = signal(false);
  activeCastId     = signal<string | null>(null);

  isDm = computed(() => this.auth.isDm());

  constructor() {
    // React to real-time secret reveals
    effect(() => {
      const event = this.hub.secretRevealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: true } : s)
        };
      });
    });
  }

  ngOnInit() {
    if (history.state?.portalEntry) {
      this.portalEntry = true;
      setTimeout(() => this.transition.hide(), 300);
    }
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    this.loadCampaign(id);
    const token = this.auth.getToken();
    const connectAndJoin = token && !this.hub.isConnected()
      ? this.hub.connect(token).then(() => this.hub.joinCampaign(id))
      : this.hub.joinCampaign(id);
    connectAndJoin.catch(console.warn);
  }

  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(console.warn);
  }

  loadCampaign(id: string) {
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(c => this.campaign.set(c));
  }

  secretsFor(instanceId: string) {
    return this.campaign()?.secrets.filter(s => s.castInstanceId === instanceId || s.cityInstanceId === instanceId || s.locationInstanceId === instanceId) ?? [];
  }

  castForCity(cityInstanceId: string) {
    return this.campaign()?.casts.filter(n => n.cityInstanceId === cityInstanceId) ?? [];
  }

  revealSecret(secret: CampaignSecret) {
    if (!this.isDm()) return;
    this.hub.revealSecret(this.campaignId(), secret.id).catch(console.warn);
  }

  openSecretModal(secret: CampaignSecret) {
    if (!this.isDm()) return;
    this.selectedSecretId.set(secret.id);
    this.secretModalContent.set(secret.content);
    this.showSecretModal.set(true);
  }

  saveSecret(content: string) {
    const id = this.selectedSecretId();
    if (!id) return;
    this.http.put(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${id}`, { content })
      .subscribe(() => {
        this.campaign.update(c => c ? {
          ...c,
          secrets: c.secrets.map(s => s.id === id ? { ...s, content } : s)
        } : c);
      });
    this.showSecretModal.set(false);
  }

  addSecret(instanceId: string, entityType: string) {
    this.http.post<CampaignSecret>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets`, {
      instanceId, entityType, content: 'New secret…'
    }).subscribe(s => {
      this.campaign.update(c => c ? { ...c, secrets: [...c.secrets, s] } : c);
    });
  }

  safeColor(color: string): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  toggleCityVisibility(city: { instanceId: string; isVisibleToPlayers: boolean }) {
    const next = !city.isVisibleToPlayers;
    this.http.patch(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/cities/${city.instanceId}/visibility`,
      { isVisibleToPlayers: next })
      .subscribe(() => {
        this.campaign.update(c => c ? {
          ...c,
          cities: c.cities.map(ci => ci.instanceId === city.instanceId
            ? { ...ci, isVisibleToPlayers: next }
            : ci)
        } : c);
      });
  }

  goToCityDetail(instanceId: string) {
    this.router.navigate(['/campaign', this.campaignId(), 'cities', instanceId]);
  }

  exitPortal() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/dm/campaigns'], { state: { noFlip: true } })
    );
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
