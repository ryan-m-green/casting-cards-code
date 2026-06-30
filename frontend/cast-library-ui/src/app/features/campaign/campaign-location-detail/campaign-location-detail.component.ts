import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { VoidTitleContext } from '../../../shared/components/void-title-segments/void-title-segments.component';

const ALL_LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
  'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal',
  'Primordial', 'Aquan', 'Auran', 'Ignan', 'Terran',
  'Sylvan', 'Undercommon', 'Druidic', "Thieves' Cant",
  'Aarakocra', 'Gith', 'Modron', 'Slaad', 'Sphinx',
  'Bullywug', 'Hook Horror', 'Sahuagin', 'Troglodyte',
  'Drow Sign Language', 'Ixitxachitl',
];
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { LocationCardComponent } from '../../../shared/components/location-card/location-card.component';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { PortalImportCardComponent } from '../../../shared/components/portal-import-card/portal-import-card.component';
import { LockIconComponent } from '../../../shared/components/lock-icon/lock-icon.component';
import { DetailPanelActionsComponent } from '../../../shared/components/detail-panel-actions/detail-panel-actions.component';

@Component({
  selector: 'app-campaign-location-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationCardComponent, SublocationCardComponent, PortalImportCardComponent, LockIconComponent, DetailPanelActionsComponent],
  templateUrl: './campaign-location-detail.component.html',
  styleUrl: './campaign-location-detail.component.scss'
})
export class CampaignLocationDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private auth       = inject(AuthService);
  private shellSvc   = inject(CampaignShellService);
  private transition = inject(PortalTransitionService);
  private hubSubscriptions: Subscription[] = [];

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

  private paramsSub?: Subscription;
  campaignId         = signal('');
  locationInstanceId = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  detailExpanded     = signal(false);
  panelHeight        = signal('220px');

  // Edit mode
  editing          = signal(false);
  editName           = signal('');
  editDescription    = signal('');
  editClassification = signal('');
  editSize           = signal('');
  editCondition      = signal('');
  editGeography      = signal('');
  editArchitecture   = signal('');
  editClimate        = signal('');
  editReligion       = signal('');
  editVibe           = signal('');
  editSelectedLanguages = signal<string[]>([]);
  editAvailableLanguages = computed(() =>
    ALL_LANGUAGES.filter(l => !this.editSelectedLanguages().includes(l))
  );
  editDmNotes        = signal('');
  imageFile          = signal<File | null>(null);
  imagePreviewUrl    = signal<string | null>(null);

  // Add secret
  addingSecret     = signal(false);
  newSecretContent = signal('');

  isDm = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);

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
    return (c.sublocations ?? []).filter((l: CampaignSublocationInstance) =>
      l.locationInstanceId === this.locationInstanceId() && !l.isPartyAnchor
    );
  });

  sealedCount   = computed(() => this.locationSecrets().filter(s => !s.isRevealed).length);
  revealedCount = computed(() => this.locationSecrets().filter(s => s.isRevealed).length);

  constructor() {
    this.hubSubscriptions.push(
      this.hub.secretRevealed$.subscribe(event => {
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
      })
    );

    this.hubSubscriptions.push(
      this.hub.factionLocked$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            sublocations: (c.sublocations ?? []).map(l =>
              l.factionInstanceId === event.factionInstanceId
                ? { ...l, factionInstanceId: undefined, symbolPath: undefined }
                : l
            ),
            casts: (c.casts ?? []).map(ca => ({
              ...ca,
              factionSymbols: (ca.factionSymbols ?? []).filter(fs => fs.factionInstanceId !== event.factionInstanceId),
            })),
          };
        });
      })
    );

    this.hubSubscriptions.push(
      this.hub.bulkCardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        if (event.cardType !== 'sublocation') return;
        if (event.parentInstanceId !== this.locationInstanceId()) return;
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            sublocations: (c.sublocations ?? []).map(l =>
              l.locationInstanceId === event.parentInstanceId
                ? { ...l, isVisibleToPlayers: event.isVisible }
                : l
            ),
          };
        });
      })
    );
  }

  ngOnInit() {
    this.paramsSub = this.route.paramMap.subscribe(params => {
      const id             = params.get('id')!;
      const locationInstId = params.get('locationInstanceId')!;
      this.campaignId.set(id);
      this.locationInstanceId.set(locationInstId);
      this.campaign.set(null);
      this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
        .subscribe(c => {
          this.campaign.set(c);
          this.shellSvc.setCampaign(c);
          const loc = c.locations.find(l => l.instanceId === locationInstId);
          this.shellSvc.setTitleContext({
            pageType: 'location',
            campaignId: id,
            campaignName: c.name,
            baseRoute: '/campaign',
            location: loc ?? null,
          }, '56px');
        });
    });
  }

  ngOnDestroy() {
    this.paramsSub?.unsubscribe();
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  startEditing() {
    const c = this.location();
    if (!c) return;
    this.editName.set(c.name ?? '');
    this.editDescription.set(c.description ?? '');
    this.editClassification.set(c.classification ?? '');
    this.editSize.set(c.size ?? '');
    this.editCondition.set(c.condition ?? '');
    this.editGeography.set(c.geography ?? '');
    this.editArchitecture.set(c.architecture ?? '');
    this.editClimate.set(c.climate ?? '');
    this.editReligion.set(c.religion ?? '');
    this.editVibe.set(c.vibe ?? '');
    this.editSelectedLanguages.set(
      (c.languages ?? '').split(',').map(l => l.trim()).filter(Boolean)
    );
    this.editDmNotes.set(c.dmNotes ?? '');
    const wasExpanded = this.detailExpanded();
    this.editing.set(true);
    // Expand after browser layout is complete so scrollHeight includes min-heights and padding
    requestAnimationFrame(() => this.expandPanel(!wasExpanded));
  }

  private expandPanel(applyMobileWidth = false) {
    const panel    = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    const contentH = this.detailContentRef.nativeElement.scrollHeight;
    const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
    this.panelHeight.set(`${contentH + btnH}px`);
    if (applyMobileWidth && window.innerWidth < 768) {
      const left = panel.getBoundingClientRect().left;
      panel.style.marginLeft = `${-(left - 20)}px`;
      panel.style.width      = `${window.innerWidth - 40}px`;
    }
    this.detailExpanded.set(true);
  }

  addEditLanguage(lang: string) {
    this.editSelectedLanguages.update(list => [...list, lang]);
  }

  removeEditLanguage(lang: string) {
    this.editSelectedLanguages.update(list => list.filter(l => l !== lang));
  }

  cancelEditing() {
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.editing.set(false);
  }

  saveDetails(syncLibrary = false) {
    const locationLibId = this.location()?.sourceLocationId;
    const body = {
      name:           this.editName(),
      description:    this.editDescription(),
      classification: this.editClassification(),
      size:           this.editSize(),
      condition:      this.editCondition(),
      geography:      this.editGeography(),
      architecture:   this.editArchitecture(),
      climate:        this.editClimate(),
      religion:       this.editReligion(),
      vibe:           this.editVibe(),
      languages:      this.editSelectedLanguages().join(', '),
      dmNotes:        this.editDmNotes(),
      syncLibrary,
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
      this.shellSvc.setTitleContext({
        pageType: 'location',
        campaignName: this.campaign()?.name,
        campaignId: this.campaignId(),
        baseRoute: '/campaign',
        location: this.location() ? { ...this.location()!, name: body.name } : null,
      }, '56px');
      this.editing.set(false);
      const file = this.imageFile();
      if (file && locationLibId) {
        const formData = new FormData();
        formData.append('file', file);
        const prev = this.imagePreviewUrl();
        if (prev) URL.revokeObjectURL(prev);
        this.imageFile.set(null);
        this.imagePreviewUrl.set(null);
        this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/api/locations/${locationLibId}/image`, formData)
          .subscribe(res => {
            const cacheBustedUrl = res.imageUrl.includes('?') ? `${res.imageUrl}&t=${Date.now()}` : `${res.imageUrl}?t=${Date.now()}`;
            const updater = (c: CampaignDetail | null) => c ? {
              ...c,
              locations: c.locations.map(l =>
                l.instanceId === this.locationInstanceId() ? { ...l, imageUrl: cacheBustedUrl } : l
              )
            } : c;
            this.campaign.update(updater);
            this.shellSvc.updateCampaign(updater);
          });
      }
    });
  }

  onPortraitFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  saveToLibrary() {
    this.saveDetails(true);
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

  deleteSecret(secret: CampaignSecret) {
    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}`
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        secrets: c.secrets.filter(s => s.id !== secret.id)
      } : c);
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
      this.editing.set(false);
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
      const updater = (c: CampaignDetail | null) => c ? {
        ...c,
        locations: c.locations.map(ci =>
          ci.instanceId === this.locationInstanceId() ? { ...ci, isVisibleToPlayers: next } : ci
        )
      } : c;
      this.campaign.update(updater);
      this.shellSvc.updateCampaign(updater);
    });
  }

  toggleSublocationVisibility(subLoc: CampaignSublocationInstance) {
    const next = !subLoc.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${subLoc.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      const updater = (c: CampaignDetail | null) => c ? {
        ...c,
        sublocations: c.sublocations.map((l: CampaignSublocationInstance) =>
          l.instanceId === subLoc.instanceId ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c;
      this.campaign.update(updater);
      this.shellSvc.updateCampaign(updater);
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
      const updater = (c: CampaignDetail | null) => c ? {
        ...c,
        sublocations: c.sublocations.map((l: CampaignSublocationInstance) =>
          l.locationInstanceId === this.locationInstanceId() ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c;
      this.campaign.update(updater);
      this.shellSvc.updateCampaign(updater);
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
    const updater = (c: CampaignDetail | null) => {
      if (!c) return c;
      const sublocations = c.sublocations ?? [];
      const existingIdx = sublocations.findIndex(l => l.instanceId === instance.instanceId);
      if (existingIdx !== -1) {
        const updated = [...sublocations];
        updated[existingIdx] = instance;
        return { ...c, sublocations: updated };
      }
      const tmpIdx = sublocations.findIndex(
        l => l.instanceId.startsWith('tmp-') && l.sourceSublocationId === instance.sourceSublocationId
      );
      if (tmpIdx !== -1) {
        const updated = [...sublocations];
        updated[tmpIdx] = instance;
        return { ...c, sublocations: updated };
      }
      return { ...c, sublocations: [...sublocations, instance] };
    };
    this.campaign.update(updater);
    this.shellSvc.updateCampaign(updater);
  }

  onSublocationRemoved(instanceId: string) {
    const updater = (c: CampaignDetail | null) => c ? { ...c, sublocations: (c.sublocations ?? []).filter(l => l.instanceId !== instanceId) } : c;
    this.campaign.update(updater);
    this.shellSvc.updateCampaign(updater);
  }
}
