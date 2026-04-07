import { Component, OnInit, OnDestroy, signal, computed, inject, effect, HostBinding, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignCityInstance } from '../../../shared/models/city.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';
@Component({
  selector: 'app-campaign-city-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeOfDayBarComponent],
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

  citySublocations = computed<CampaignSublocationInstance[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return (c.sublocations ?? []).filter((l: CampaignSublocationInstance) => l.cityInstanceId === this.cityInstanceId());
  });

  sealedCount   = computed(() => this.citySecrets().filter(s => !s.isRevealed).length);
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
    const token = this.auth.getToken();
    const connectAndJoin = token && !this.hub.isConnected()
      ? this.hub.connect(token).then(() => this.hub.joinCampaign(id))
      : this.hub.joinCampaign(id);
    connectAndJoin.catch(console.warn);
  }

  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(console.warn);
  }

  startEditing() {
    const c = this.city();
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
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/cities/${this.cityInstanceId()}`,
      body
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        cities: c.cities.map(ci =>
          ci.instanceId === this.cityInstanceId()
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
      { instanceId: this.cityInstanceId(), entityType: 'City', content }
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
    const subLocs = this.citySublocations();
    const allVisible = subLocs.every(l => l.isVisibleToPlayers);
    const next = !allVisible;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/cities/${this.cityInstanceId()}/sublocations/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map((l: CampaignSublocationInstance) =>
          l.cityInstanceId === this.cityInstanceId() ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c);
    });
  }

  allSublocationVisible = computed(() => {
    const subLocs = this.citySublocations();
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

  goToCampaign() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  goBack() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
