import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { LocationCardComponent } from '../../../shared/components/location-card/location-card.component';
import { PortalImportCardComponent } from '../../../shared/components/portal-import-card/portal-import-card.component';



@Component({
  selector: 'app-campaign-detail',
  standalone: true,
  imports: [CommonModule, LocationCardComponent, PortalImportCardComponent],
  templateUrl: './campaign-detail.component.html',
  styleUrl: './campaign-detail.component.scss'
})
export class CampaignDetailComponent implements OnInit, OnDestroy {
  private _locationsGridEl = signal<HTMLElement | null>(null);
  @ViewChild('locationsGrid') set locationsGridRef(ref: ElementRef<HTMLElement> | undefined) {
    this._locationsGridEl.set(ref?.nativeElement ?? null);
  }
  get locationsGridEl(): HTMLElement | null { return this._locationsGridEl(); }

  private _importCard = signal<PortalImportCardComponent | null>(null);
  @ViewChild('importCard') set importCardSetter(ref: PortalImportCardComponent | undefined) {
    this._importCard.set(ref ?? null);
  }
  get importCardRef(): PortalImportCardComponent | null { return this._importCard(); }

  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private http           = inject(HttpClient);
  private transition     = inject(PortalTransitionService);
  private hub            = inject(CampaignHubService);
  private shellSvc       = inject(CampaignShellService);
  subscription           = inject(SubscriptionService);
  private hubSubscriptions: Subscription[] = [];
  auth               = inject(AuthService);

  campaign           = signal<CampaignDetail | null>(null);
  campaignId         = signal('');
  selectedSecretId   = signal<string | null>(null);
  secretModalContent = signal('');
  showSecretModal    = signal(false);
  activeCastId       = signal<string | null>(null);


  private locationTilts = new Map<string, number>();

  locationTilt(instanceId: string): number {
    if (!this.locationTilts.has(instanceId)) {
      const magnitude = 2;
      this.locationTilts.set(instanceId, Math.random() < 0.5 ? -magnitude : magnitude);
    }
    return this.locationTilts.get(instanceId)!;
  }

  isDm = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);

  constructor() {
    this.hubSubscriptions.push(
      this.hub.secretRevealed$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: true } : s)
          };
        });
      })
    );

    this.hubSubscriptions.push(
      this.hub.factionLocked$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            sublocations: c.sublocations.map(l =>
              l.factionInstanceId === event.factionInstanceId
                ? { ...l, factionInstanceId: undefined, symbolPath: undefined }
                : l
            ),
            casts: c.casts.map(ca => ({
              ...ca,
              factionSymbols: (ca.factionSymbols ?? []).filter(fs => fs.factionInstanceId !== event.factionInstanceId),
            })),
          };
        });
      })
    );
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.loadCampaign(id);
  }

  loadCampaign(id: string) {
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(campaign => {
        this.campaign.set(campaign);
        this.shellSvc.setCampaign(campaign);
        this.shellSvc.setTitle(campaign.name, '56px');
      });
  }

  secretsFor(instanceId: string) {
    return this.campaign()?.secrets.filter(s =>
      s.castInstanceId === instanceId ||
      s.locationInstanceId === instanceId ||
      s.sublocationInstanceId === instanceId
    ) ?? [];
  }

  castForLocation(locationInstanceId: string) {
    return this.campaign()?.casts.filter(n => n.locationInstanceId === locationInstanceId) ?? [];
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
      instanceId, entityType, content: 'New secret...'
    }).subscribe(s => {
      this.campaign.update(c => c ? { ...c, secrets: [...c.secrets, s] } : c);
    });
  }

  safeColor(color: string): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  toggleLocationVisibility(location: { instanceId: string; isVisibleToPlayers: boolean }) {
    const next = !location.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations/${location.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      const updater = (c: CampaignDetail | null) => c ? {
        ...c,
        locations: c.locations.map(ci => ci.instanceId === location.instanceId
          ? { ...ci, isVisibleToPlayers: next }
          : ci)
      } : c;
      this.campaign.update(updater);
      this.shellSvc.updateCampaign(updater);
    });
  }

  goToLocationDetail(instanceId: string) {
    this.router.navigate(['locations', instanceId], { relativeTo: this.route });
  }


  exitPortal() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/dm/campaigns'], { state: { noFlip: true } })
    );
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }

  // ── Import card handlers ─────────────────────────────────────────────────

  onLocationAdded(instance: CampaignLocationInstance) {
    const updater = (c: CampaignDetail | null) => {
      if (!c) return c;
      const existingIdx = c.locations.findIndex(l => l.instanceId === instance.instanceId);
      if (existingIdx !== -1) {
        const updated = [...c.locations];
        updated[existingIdx] = instance;
        return { ...c, locations: updated };
      }
      const tmpIdx = c.locations.findIndex(
        l => l.instanceId.startsWith('tmp-') && l.sourceLocationId === instance.sourceLocationId
      );
      if (tmpIdx !== -1) {
        const updated = [...c.locations];
        updated[tmpIdx] = instance;
        return { ...c, locations: updated };
      }
      return { ...c, locations: [...c.locations, instance] };
    };
    this.campaign.update(updater);
    this.shellSvc.updateCampaign(updater);
  }

  onLocationRemoved(instanceId: string) {
    const updater = (c: CampaignDetail | null) => c ? { ...c, locations: c.locations.filter(l => l.instanceId !== instanceId) } : c;
    this.campaign.update(updater);
    this.shellSvc.updateCampaign(updater);
  }
}
