import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { Subscription } from 'rxjs';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { LockIconComponent } from '../../../shared/components/lock-icon/lock-icon.component';
import { DetailPanelActionsComponent } from '../../../shared/components/detail-panel-actions/detail-panel-actions.component';
import { TravelAnchorComponent } from '../../../shared/components/travel-anchor/travel-anchor.component';

@Component({
  selector: 'app-campaign-cast-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, CastCardComponent, LockIconComponent, DetailPanelActionsComponent, TravelAnchorComponent],
  templateUrl: './campaign-cast-detail.component.html',
  styleUrl: './campaign-cast-detail.component.scss'
})
export class CampaignCastDetailComponent implements OnInit, OnDestroy {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private http     = inject(HttpClient);
  private hub      = inject(CampaignHubService);
  private auth     = inject(AuthService);
  private shellSvc = inject(CampaignShellService);
  private transition = inject(PortalTransitionService);
  private hubSubscriptions: Subscription[] = [];
  private paramsSub?: Subscription;

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;

  detailExpanded = signal(false);

  campaignId         = signal('');
  sublocationInstanceId = signal('');
  castInstanceId     = signal('');
  campaign           = signal<CampaignDetail | null>(null);

  readonly voiceOptions = ['Chest', 'Throat', 'Mouth / Oral', 'Nasal', 'Head / Sinus'];
  readonly postureOptions = [
    'Upright', 'Puffed Chest', 'Slouched', 'Hunched', 'Relaxed',
    'Tense', 'Swaggering', 'Cowering', 'Guarded', 'Leaning',
  ];
  readonly speedOptions = [
    'Slow & Deliberate', 'Steady Drumbeat', 'Brisk', 'Quick & Hurried',
    'Nervous & Rushed', 'Measured', 'Lumbering', 'Graceful',
  ];
  readonly alignmentOptions = [
    'Lawful Good', 'Neutral Good', 'Chaotic Good',
    'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
    'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
  ];
  readonly pronounOptions = [
    'he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'it/its', 'any pronouns',
  ];

  // Edit mode
  editing              = signal(false);
  editName             = signal('');
  editPublicDescription = signal('');
  editDescription      = signal('');
  editPronouns         = signal('');
  editRace             = signal('');
  editRole             = signal('');
  editAge              = signal('');
  editAlignment        = signal('');
  editPosture          = signal('');
  editSpeed            = signal('');
  editVoicePlacement   = signal<string[]>([]);
  editVoiceNotes       = signal('');
  editDmNotes          = signal('');
  imageFile            = signal<File | null>(null);
  imagePreviewUrl      = signal<string | null>(null);

  // Add secret
  addingSecret     = signal(false);
  newSecretContent = signal('');

  // Travel drawer
  travelDrawerOpen   = signal(false);
  selectedLocationId = signal<string | null>(null);

  isDm = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);

  cast = computed<CampaignCastInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.casts.find(ca => ca.instanceId === this.castInstanceId()) ?? null;
  });

  parentSublocation = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find((l: CampaignSublocationInstance) => l.instanceId === this.sublocationInstanceId()) ?? null;
  });

  allCampaignCasts = computed<CampaignCastInstance[]>(() => {
    const c = this.campaign();
    return c?.casts ?? [];
  });

  parentLocation = computed(() => {
    const c   = this.campaign();
    const subLoc = this.parentSublocation();
    if (!c || !subLoc) return null;
    return c.locations.find(ci => ci.instanceId === subLoc.locationInstanceId) ?? null;
  });

  castSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.castInstanceId === this.castInstanceId());
  });

  partyAnchor = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(s => s.isPartyAnchor) ?? null;
  });

  travelLocations = computed(() => {
    const c = this.campaign();
    if (!c) return [];
    const partyLocationId = this.partyAnchor()?.locationInstanceId;
    return c.locations.filter(loc => loc.instanceId !== partyLocationId);
  });

  sublocationsByLocation = computed<Record<string, CampaignSublocationInstance[]>>(() => {
    const c = this.campaign();
    if (!c) return {};
    return c.sublocations
      .filter(s => !s.isPartyAnchor)
      .reduce((acc, s) => {
        const key = s.locationInstanceId;
        acc[key] = acc[key] ? [...acc[key], s] : [s];
        return acc;
      }, {} as Record<string, CampaignSublocationInstance[]>);
  });

  currentSublocationId = computed(() => {
    const ca = this.cast();
    return ca?.sublocationInstanceId ?? null;
  });

  currentLocationId = computed(() => {
    const ca = this.cast();
    return ca?.locationInstanceId ?? null;
  });

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
  }

  ngOnInit() {
    this.paramsSub = this.route.paramMap.subscribe(params => {
      const id       = params.get('id')!;
      const subLocId = params.get('sublocationInstanceId')!;
      const castId   = params.get('castInstanceId')!;
      this.campaignId.set(id);
      this.sublocationInstanceId.set(subLocId);
      this.castInstanceId.set(castId);
      this.campaign.set(null);
      this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
        .subscribe(c => {
          this.campaign.set(c);
          const cast   = c.casts.find(ca => ca.instanceId === castId);
          const subLoc = c.sublocations.find((l: CampaignSublocationInstance) => l.instanceId === subLocId);
          const loc    = subLoc ? c.locations.find(l => l.instanceId === subLoc.locationInstanceId) : null;
          if (cast) {
            if (subLoc?.isPartyAnchor) {
              this.shellSvc.setTitleContext({
                pageType:   'cast-party',
                campaignId: id,
                baseRoute:  '/campaign',
                location:   null,
                partyRoute: ['/campaign', id, 'the-party'],
              }, '56px');
            } else {
              this.shellSvc.setTitleContext({
                pageType: 'cast',
                campaignId: id,
                campaignName: c.name,
                baseRoute: '/campaign',
                location: loc ?? null,
                sublocation: subLoc ?? null,
              }, '56px');
            }
          }
        });
    });
  }

  ngOnDestroy() {
    this.paramsSub?.unsubscribe();
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
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

  // ── Edit details ─────────────────────────────────────────────────────────

  startEditing() {
    const ca = this.cast();
    if (!ca) return;
    this.editName.set(ca.name ?? '');
    this.editPublicDescription.set(ca.publicDescription ?? '');
    this.editDescription.set(ca.description ?? '');
    this.editPronouns.set(ca.pronouns ?? '');
    this.editRace.set(ca.race ?? '');
    this.editRole.set(ca.role ?? '');
    this.editAge.set(ca.age ?? '');
    this.editAlignment.set(ca.alignment ?? '');
    this.editPosture.set(ca.posture ?? '');
    this.editSpeed.set(ca.speed ?? '');
    this.editVoicePlacement.set([...(ca.voicePlacement ?? [])]);
    this.editVoiceNotes.set(ca.voiceNotes ?? '');
    this.editDmNotes.set(ca.dmNotes ?? '');
    const wasExpanded = this.detailExpanded();
    this.editing.set(true);
    requestAnimationFrame(() => this.expandPanel(!wasExpanded));
  }

  cancelEditing() {
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.editing.set(false);
  }

  toggleVoicePlacement(option: string) {
    const current = this.editVoicePlacement();
    if (current.includes(option)) {
      this.editVoicePlacement.set(current.filter(v => v !== option));
    } else {
      this.editVoicePlacement.set([...current, option]);
    }
  }

  saveDetails(syncLibrary = false) {
    const castId = this.cast()?.sourceCastId;
    const body = {
      name:              this.editName(),
      publicDescription: this.editPublicDescription(),
      description:       this.editDescription(),
      pronouns:          this.editPronouns(),
      race:              this.editRace(),
      role:              this.editRole(),
      age:               this.editAge(),
      alignment:         this.editAlignment(),
      posture:           this.editPosture(),
      speed:             this.editSpeed(),
      voicePlacement:    this.editVoicePlacement(),
      voiceNotes:        this.editVoiceNotes(),
      dmNotes:           this.editDmNotes(),
      syncLibrary,
    };
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${this.castInstanceId()}`,
      body
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === this.castInstanceId() ? { ...ca, ...body } : ca
        )
      } : c);
      const subLocAfterSave = this.parentSublocation();
      if (subLocAfterSave?.isPartyAnchor) {
        this.shellSvc.setTitleContext({
          pageType:   'cast-party',
          campaignId: this.campaignId(),
          baseRoute:  '/campaign',
          location:   null,
          partyRoute: ['/campaign', this.campaignId(), 'the-party'],
        }, '56px');
      } else {
        this.shellSvc.setTitleContext({
          pageType: 'cast',
          campaignId: this.campaignId(),
          campaignName: this.campaign()?.name,
          baseRoute: '/campaign',
          location: this.parentLocation(),
          sublocation: subLocAfterSave,
        }, '56px');
      }
      this.editing.set(false);
      const file = this.imageFile();
      if (file && castId) {
        const formData = new FormData();
        formData.append('file', file);
        const prev = this.imagePreviewUrl();
        if (prev) URL.revokeObjectURL(prev);
        this.imageFile.set(null);
        this.imagePreviewUrl.set(null);
        this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/api/cast/${castId}/image`, formData)
          .subscribe(res => {
            const cacheBustedUrl = res.imageUrl.includes('?') ? `${res.imageUrl}&t=${Date.now()}` : `${res.imageUrl}?t=${Date.now()}`;
            const updater = (c: CampaignDetail | null) => c ? {
              ...c,
              casts: c.casts.map(ca =>
                ca.instanceId === this.castInstanceId() ? { ...ca, imageUrl: cacheBustedUrl } : ca
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

  // ── Secrets

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
      { instanceId: this.castInstanceId(), entityType: 'Cast', content }
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

  // ── Travel ───────────────────────────────────────────────────────────────

  toggleTravelDrawer() {
    this.travelDrawerOpen.update(o => !o);
    this.selectedLocationId.set(null);
  }

  selectLocation(locationId: string | null) {
    this.selectedLocationId.set(locationId);
  }

  travelCast(locationInstanceId: string, sublocationInstanceId: string) {
    const castInstanceId = this.castInstanceId();
    const fromSublocationInstanceId = this.sublocationInstanceId();
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${castInstanceId}/travel`,
      { locationInstanceId, sublocationInstanceId, fromSublocationInstanceId }
    ).subscribe(() => {
      const party = this.partyAnchor();
      const isParty = party?.instanceId === sublocationInstanceId;
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === castInstanceId
            ? { ...ca, locationInstanceId, sublocationInstanceId }
            : ca
        )
      } : c);
      this.sublocationInstanceId.set(sublocationInstanceId);
      this.router.navigate(
        ['/campaign', this.campaignId(), 'sublocations', sublocationInstanceId, 'cast', castInstanceId],
        { replaceUrl: true }
      );
      if (isParty) {
        this.shellSvc.setTitleContext({
          pageType:   'cast-party',
          campaignId: this.campaignId(),
          baseRoute:  '/campaign',
          location:   null,
          partyRoute: ['/campaign', this.campaignId(), 'the-party'],
        }, '56px');
      } else {
        const c = this.campaign();
        const newSubLoc = c?.sublocations.find(s => s.instanceId === sublocationInstanceId) ?? null;
        const newLoc    = c?.locations.find(l => l.instanceId === locationInstanceId) ?? null;
        this.shellSvc.setTitleContext({
          pageType:    'cast',
          campaignId:  this.campaignId(),
          campaignName: this.campaign()?.name,
          baseRoute:   '/campaign',
          location:    newLoc,
          sublocation: newSubLoc,
        }, '56px');
      }
    });
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

  goToLocation() {
    const location = this.parentLocation();
    if (location) {
      this.router.navigate(['/campaign', this.campaignId(), 'locations', location.instanceId]);
    }
  }

  goBack() {
    this.router.navigate(['/campaign', this.campaignId(), 'sublocations', this.sublocationInstanceId()]);
  }

  toggleDetail() {
    const panel = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    if (this.detailExpanded()) {
      panel.style.marginLeft = '';
      panel.style.width = '';
      this.detailExpanded.set(false);
      this.editing.set(false);
    } else {
      this.expandPanel(true);
    }
  }

  private expandPanel(applyMobileWidth = false) {
    const panel = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    if (applyMobileWidth && window.innerWidth < 768) {
      const left = panel.getBoundingClientRect().left;
      panel.style.marginLeft = `${-(left - 20)}px`;
      panel.style.width      = `${window.innerWidth - 40}px`;
    }
    this.detailExpanded.set(true);
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }

}
