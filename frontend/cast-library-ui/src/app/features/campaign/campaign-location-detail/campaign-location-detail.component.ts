import { Component, OnInit, signal, computed, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { LocationCardComponent } from '../../../shared/components/location-card/location-card.component';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { PortalImportCardComponent } from '../../../shared/components/portal-import-card/portal-import-card.component';
import { LockIconComponent } from '../../../shared/components/lock-icon/lock-icon.component';

@Component({
  selector: 'app-campaign-location-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationCardComponent, SublocationCardComponent, PortalImportCardComponent, LockIconComponent],
  templateUrl: './campaign-location-detail.component.html',
  styleUrl: './campaign-location-detail.component.scss'
})
export class CampaignLocationDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private auth       = inject(AuthService);
  private shellSvc   = inject(CampaignShellService);
  private transition = inject(PortalTransitionService);

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  private _sublocationImportCard = signal<PortalImportCardComponent | null>(null);
  @ViewChild('sublocationImportCard') set sublocationImportCardSetter(ref: PortalImportCardComponent | undefined) {
    this._sublocationImportCard.set(ref ?? null);
  }
  get sublocationImportCardRef(): PortalImportCardComponent | null {
    return this._sublocationImportCard();
  }

  sublocationDrawerOpen = signal(false);

  private _sublocationsGridEl = signal<HTMLElement | null>(null);
  @ViewChild('sublocationsGrid') set sublocationsGridRef(ref: ElementRef<HTMLElement> | undefined) {
    this._sublocationsGridEl.set(ref?.nativeElement ?? null);
  }
  get sublocationsGridEl(): HTMLElement | null { return this._sublocationsGridEl(); }

  campaignId         = signal('');
  locationInstanceId = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  detailExpanded     = signal(false);
  panelHeight        = signal('220px');

  // Edit mode
  editing          = signal(false);
  editDescription    = signal('');
  editClassification = signal('');
  editSize           = signal('');
  editCondition      = signal('');
  editGeography      = signal('');
  editArchitecture   = signal('');
  editClimate        = signal('');
  editReligion       = signal('');
  editVibe           = signal('');
  editLanguages      = signal('');
  editDmNotes        = signal('');

  // Add secret
  addingSecret     = signal(false);
  newSecretContent = signal('');

  isDm = computed(() => this.auth.isDm());

  location = computed<CampaignLocationInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.locations.find(ci => ci.instanceId === this.locationInstanceId()) ?? null;
  });

  locationSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.locationInstanceId === this.locationInstanceId());
  });

  locationSublocations = computed<CampaignSublocationInstance[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return (c.sublocations ?? []).filter((l: CampaignSublocationInstance) => l.locationInstanceId === this.locationInstanceId());
  });

  sealedCount   = computed(() => this.locationSecrets().filter(s => !s.isRevealed).length);
  revealedCount = computed(() => this.locationSecrets().filter(s => s.isRevealed).length);

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
    const id             = this.route.snapshot.paramMap.get('id')!;
    const locationInstId = this.route.snapshot.paramMap.get('locationInstanceId')!;
    this.campaignId.set(id);
    this.locationInstanceId.set(locationInstId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(c => {
        this.campaign.set(c);
        const loc = c.locations.find(l => l.instanceId === locationInstId);
        this.shellSvc.setTitle(loc?.name ?? '');
        this.shellSvc.setCrumbs([
          { label: '← Locations', action: () => this.goToCampaign() },
        ]);
      });
  }

  startEditing() {
    const c = this.location();
    if (!c) return;
    this.editDescription.set(c.description ?? '');
    this.editClassification.set(c.classification ?? '');
    this.editSize.set(c.size ?? '');
    this.editCondition.set(c.condition ?? '');
    this.editGeography.set(c.geography ?? '');
    this.editArchitecture.set(c.architecture ?? '');
    this.editClimate.set(c.climate ?? '');
    this.editReligion.set(c.religion ?? '');
    this.editVibe.set(c.vibe ?? '');
    this.editLanguages.set(c.languages ?? '');
    this.editDmNotes.set(c.dmNotes ?? '');
    this.editing.set(true);
    // Expand after browser layout is complete so scrollHeight includes min-heights and padding
    requestAnimationFrame(() => this.expandPanel());
  }

  private expandPanel() {
    const contentH = this.detailContentRef.nativeElement.scrollHeight;
    const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
    this.panelHeight.set(`${contentH + btnH}px`);
    this.detailExpanded.set(true);
  }

  cancelEditing() {
    this.editing.set(false);
  }

  saveDetails() {
    const body = {
      description:    this.editDescription(),
      classification: this.editClassification(),
      size:           this.editSize(),
      condition:      this.editCondition(),
      geography:      this.editGeography(),
      architecture:   this.editArchitecture(),
      climate:        this.editClimate(),
      religion:       this.editReligion(),
      vibe:           this.editVibe(),
      languages:      this.editLanguages(),
      dmNotes:        this.editDmNotes(),
    };
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations/${this.locationInstanceId()}`,
      body
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        locations: c.locations.map(ci =>
          ci.instanceId === this.locationInstanceId()
            ? { ...ci, ...body }
            : ci
        )
      } : c);
      this.editing.set(false);
    });
  }

  startAddingSecret() {
    this.newSecretContent.set('');
    this.addingSecret.set(true);
  }

  cancelAddingSecret() {
    this.addingSecret.set(false);
  }

  confirmAddSecret() {
    const content = this.newSecretContent().trim();
    if (!content) return;
    this.http.post<CampaignSecret>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets`,
      { instanceId: this.locationInstanceId(), entityType: 'Location', content }
    ).subscribe(s => {
      this.campaign.update(c => c ? { ...c, secrets: [...c.secrets, s] } : c);
      this.addingSecret.set(false);
    });
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
    const panel = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    if (this.detailExpanded()) {
      this.panelHeight.set('220px');
      panel.style.marginLeft = '';
      panel.style.width = '';
      this.detailExpanded.set(false);
    } else {
      const contentH = this.detailContentRef.nativeElement.scrollHeight;
      const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
      this.panelHeight.set(`${contentH + btnH}px`);
      if (window.innerWidth < 768) {
        const left = panel.getBoundingClientRect().left;
        panel.style.marginLeft = `${-(left - 20)}px`;
        panel.style.width      = `${window.innerWidth - 40}px`;
      }
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

  toggleLocationVisibility() {
    const location = this.location();
    if (!location) return;
    const next = !location.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations/${this.locationInstanceId()}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        locations: c.locations.map(ci =>
          ci.instanceId === this.locationInstanceId() ? { ...ci, isVisibleToPlayers: next } : ci
        )
      } : c);
    });
  }

  toggleSublocationVisibility(subLoc: CampaignSublocationInstance) {
    const next = !subLoc.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${subLoc.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map((l: CampaignSublocationInstance) =>
          l.instanceId === subLoc.instanceId ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c);
    });
  }

  toggleAllSublocationVisibility() {
    const subLocs = this.locationSublocations();
    const allVisible = subLocs.every(l => l.isVisibleToPlayers);
    const next = !allVisible;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations/${this.locationInstanceId()}/sublocations/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map((l: CampaignSublocationInstance) =>
          l.locationInstanceId === this.locationInstanceId() ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c);
    });
  }

  private sublocationTilts = new Map<string, number>();

  sublocationTilt(instanceId: string): number {
    if (!this.sublocationTilts.has(instanceId)) {
      this.sublocationTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.sublocationTilts.get(instanceId)!;
  }

  allSublocationVisible = computed(() => {
    const subLocs = this.locationSublocations();
    return subLocs.length > 0 && subLocs.every(l => l.isVisibleToPlayers);
  });

  goToSublocation(subLoc: CampaignSublocationInstance) {
    this.router.navigate(['/campaign', this.campaignId(), 'sublocations', subLoc.instanceId]);
  }

  exitToLibrary() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/dm/campaigns'], { state: { noFlip: true } })
    );
  }

  goToTheParty() {
    this.router.navigate(['/campaign', this.campaignId(), 'the-party']);
  }

  goToCampaign() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  goBack() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }

  // ── Import card handlers ────────────────────────────────────────────

  onSublocationAdded(instance: CampaignSublocationInstance) {
    this.campaign.update(c => {
  
      if (!c) return c;

      const sublocations = c.sublocations ?? [];
      if (sublocations.some(l => l.instanceId === instance.instanceId)) return c;

      const tmpIdx = sublocations.findIndex(
        l => l.instanceId.startsWith('tmp-') && l.sourceSublocationId === instance.sourceSublocationId
      );
      if (tmpIdx !== -1) {
        const updated = [...sublocations];
        updated[tmpIdx] = instance;
        return { ...c, sublocations: updated };
      }
      return { ...c, sublocations: [...sublocations, instance] };
    });
  }

  onSublocationRemoved(instanceId: string) {
    this.campaign.update(c => c ? { ...c, sublocations: (c.sublocations ?? []).filter(l => l.instanceId !== instanceId) } : c);
  }
}
