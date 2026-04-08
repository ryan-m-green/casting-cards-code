import { Component, OnInit, OnDestroy, signal, inject, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Location, CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignDetail, CampaignInviteCode, CampaignPlayer } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { CastRelationshipsTabComponent } from '../cast-relationships-tab/cast-relationships-tab.component';
import { KeywordInputComponent } from '../../../shared/components/keyword-input/keyword-input.component';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';
import { TimeOfDayEditorComponent } from '../time-of-day-editor/time-of-day-editor.component';

interface LocationSecret {
  id?: string;
  content: string;
  editing: boolean;
}

interface LocationDraft {
  location: Location;
  instanceId?: string;
  condition: string;
  geography: string;
  climate:   string;
  religion:  string;
  vibe:      string;
  languages: string;
  secrets:   LocationSecret[];
  keywords:  string[];
}

@Component({
  selector: 'app-campaign-creator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CardFlipComponent, CastRelationshipsTabComponent, KeywordInputComponent, DmNavComponent, TimeOfDayEditorComponent],
  templateUrl: './campaign-creator.component.html',
  styleUrl: './campaign-creator.component.scss'
})
export class CampaignCreatorComponent implements OnInit, OnDestroy {
  private http   = inject(HttpClient);
  private route  = inject(ActivatedRoute);
  private el     = inject(ElementRef);
  router         = inject(Router);
  fb             = inject(FormBuilder);
  isEditMode     = signal(false);

  @ViewChild('mainCard')        mainCardRef!:       ElementRef<HTMLElement>;
  @ViewChild('mainCardWrapper') mainCardWrapperRef!: ElementRef<HTMLElement>;
  @ViewChild('selectedStack')   selectedStackRef!:  ElementRef<HTMLElement>;
  @ViewChild('deckStack')       deckStackRef!:      ElementRef<HTMLElement>;

  locations      = signal<Location[]>([]);
  selectedDrafts = signal<LocationDraft[]>([]);
  campaignId              = signal<string | null>(null);
  campaignCast            = signal<CampaignCastInstance[]>([]);
  campaignSublocations    = signal<CampaignSublocationInstance[]>([]);
  campaignSublocationCount = signal<Record<string, number>>({});
  deckIdx        = signal(0);
  expandedIdx    = signal(0);
  saving         = signal(false);
  isSwapping     = false;
  activeTab      = signal<'world-setup' | 'cast-relationships' | 'day-cycle' | 'players'>('world-setup');
  players        = signal<CampaignPlayer[]>([]);
  inviteCode     = signal<CampaignInviteCode | null>(null);
  codeLoading    = signal(false);
  removingPlayer = signal<string | null>(null);
  locationSearch = signal('');

  pendingRemoveIdx   = signal<number | null>(null);
  pendingCastCount   = signal(0);
  allDmKeywords      = signal<string[]>([]);

  private keywordSaveTimer?: ReturnType<typeof setTimeout>;

  // Local fields for location text inputs — never pushed to selectedDrafts() signal during typing
  liveLocationFields: Record<string, string> = {
    geography: '', climate: '', religion: '', vibe: '', languages: '',
  };

  readonly conditionOptions = ['Thriving', 'Stable', 'Declining', 'War-Torn', 'Rebuilding', 'Abandoned'];

  private readonly SEL_PEEK = 46;
  private readonly SEL_FULL = 220;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private formSaveTimer?: ReturnType<typeof setTimeout>;

  deckLocations = computed(() => {
    const selectedIds = new Set(this.selectedDrafts().map(d => d.location.id));
    return this.locations().filter(c => !selectedIds.has(c.id));
  });

  filteredDeckLocations = computed(() => {
    const term = this.locationSearch().trim().toLowerCase();
    const deck = this.deckLocations();
    if (!term) return deck;
    return deck.filter(c =>
      [c.name, c.classification, c.size, c.geography, c.climate, c.vibe, c.description, c.architecture, c.religion]
        .some(f => f?.toLowerCase().includes(term))
    );
  });

  currentCard = computed(() => {
    const deck = this.filteredDeckLocations();
    if (!deck.length) return null;
    return deck[this.deckIdx() % deck.length];
  });

  selTopsList = computed(() => {
    const n      = this.selectedDrafts().length;
    const expIdx = this.expandedIdx();
    return Array.from({ length: n }, (_, j) =>
      j * this.SEL_PEEK + (expIdx !== -1 && j > expIdx ? this.SEL_FULL - this.SEL_PEEK : 0)
    );
  });

  selContainerHeight = computed(() => {
    const tops = this.selTopsList();
    const n    = tops.length;
    if (!n) return 0;
    return tops[n - 1] + this.SEL_FULL;
  });

  expandedDraft = computed(() => this.selectedDrafts()[this.expandedIdx()] ?? null);

  expandedLocationSublocations = computed(() => {
    const draft = this.expandedDraft();
    if (!draft?.instanceId) return [];
    return this.campaignSublocations().filter(l => l.locationInstanceId === draft.instanceId);
  });

  castCountForSublocation(sublocationInstanceId: string): number {
    return this.campaignCast().filter(c => (c as any).sublocationInstanceId === sublocationInstanceId).length;
  }

  form = this.fb.group({
    name:        ['', Validators.required],
    fantasyType: ['High Fantasy'],
    description: [''],
    spineColor:  ['#ffffff'],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    this.http.get<{ keywords: string[] }>(`${environment.apiUrl}/api/users/keywords`)
      .subscribe(r => this.allDmKeywords.set(r.keywords));

    if (id) {
      forkJoin({
        locations: this.http.get<Location[]>(`${environment.apiUrl}/api/locations`),
        campaign: this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`),
      }).subscribe(({ locations, campaign }) => {
        this.locations.set(locations);
        this.loadExistingCampaign(campaign, locations);
      });
    } else {
      this.http.get<Location[]>(`${environment.apiUrl}/api/locations`).subscribe(l => this.locations.set(l));
    }

    this.form.valueChanges.subscribe(() => {
      if (!this.form.controls.name.valid) return;
      clearTimeout(this.formSaveTimer);
      this.formSaveTimer = setTimeout(() => {
        const cid = this.campaignId();
        if (cid) {
          this.http.patch(`${environment.apiUrl}/api/campaigns/${cid}`, this.form.value).subscribe();
        } else {
          this.http.post<{ id: string }>(`${environment.apiUrl}/api/campaigns`, { ...this.form.value, locationIds: [] })
            .subscribe({ next: campaign => this.campaignId.set(campaign.id) });
        }
      }, 800);
    });
  }

  ngOnDestroy() {
    clearTimeout(this.saveTimer);
    clearTimeout(this.formSaveTimer);
    clearTimeout(this.keywordSaveTimer);
  }

  setLocationSearch(term: string) {
    this.locationSearch.set(term);
    this.deckIdx.set(0);
  }

  swapLocationCard() {
    if (this.isSwapping) return;
    const deck = this.filteredDeckLocations();
    if (deck.length <= 1) return;
    this.isSwapping = true;
    const card = this.mainCardRef?.nativeElement;
    if (!card) { this.isSwapping = false; return; }

    card.style.transition = 'transform 0.27s cubic-bezier(0.4,0,1,1), opacity 0.22s ease-in';
    card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
    card.style.opacity    = '0';

    setTimeout(() => {
      this.deckIdx.update(i => (i + 1) % deck.length);
      card.style.transition = 'none';
      card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
      card.style.opacity    = '0';
      void card.offsetWidth;
      card.style.transition = 'transform 0.30s cubic-bezier(0,0,0.2,1), opacity 0.25s ease-out';
      card.style.transform  = 'translateX(0) scale(1) rotate(0deg)';
      card.style.opacity    = '1';
      setTimeout(() => { this.isSwapping = false; }, 300);
    }, 270);
  }

  addLocationToSelected() {
    if (this.isSwapping) return;
    if (!this.form.controls.name.valid) {
      this.form.controls.name.markAsTouched();
      return;
    }
    const location = this.currentCard();
    if (!location) return;
    this.isSwapping = true;
    const card = this.mainCardRef?.nativeElement;
    if (!card) { this.isSwapping = false; return; }

    const draft: LocationDraft = {
      location,
      condition: location.condition,
      geography: location.geography,
      climate:   location.climate,
      religion:  location.religion,
      vibe:      location.vibe,
      languages: location.languages,
      secrets:   [],
      keywords:  [],
    };

    const currentCount = this.selectedDrafts().length;
    this._ghostSlideAdd(card, currentCount, () => { this.isSwapping = false; });

    card.style.opacity    = '0';
    card.style.transition = 'none';

    this.selectedDrafts.update(sel => [...sel, draft]);
    this.expandedIdx.set(this.selectedDrafts().length - 1);
    this.syncLiveLocationFields();
    const newDeckLen = this.deckLocations().length;
    if (newDeckLen > 0) {
      this.deckIdx.update(i => i % newDeckLen);
      void card.offsetWidth;
      card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
      void card.offsetWidth;
      card.style.transition = 'transform 0.34s cubic-bezier(0,0,0.2,1), opacity 0.28s ease-out';
      card.style.transform  = 'translateX(0) scale(1) rotate(0deg)';
      card.style.opacity    = '1';
    }

    this._autoSaveLocation(draft);
  }

  removeLocationSelected(index: number) {
    const draft = this.selectedDrafts()[index];
    if (draft.instanceId) {
      const count = this.campaignSublocationCount()[draft.instanceId] ?? 0;
      if (count > 0) {
        this.pendingRemoveIdx.set(index);
        this.pendingCastCount.set(count);
        return;
      }
    }
    this._executeRemove(index);
  }

  confirmRemove() {
    const index = this.pendingRemoveIdx();
    this.pendingRemoveIdx.set(null);
    if (index !== null) this._executeRemove(index);
  }

  cancelRemove() {
    this.pendingRemoveIdx.set(null);
  }

  private _executeRemove(index: number) {
    const draft       = this.selectedDrafts()[index];
    const card        = this._getSelCardEl(index);
    const deckIsEmpty = this.deckLocations().length === 0;
    const target      = deckIsEmpty ? this.mainCardWrapperRef?.nativeElement
                                    : this.deckStackRef?.nativeElement;
    if (card) {
      this._ghostSlideRemove(card, target ?? null, () => this._doRemove(index, draft));
    } else {
      this._doRemove(index, draft);
    }
  }

  toggleExpanded(index: number) {
    this.expandedIdx.update(i => i === index ? -1 : index);
    this.syncLiveLocationFields();
  }

  updateDraftField(field: string, value: string) {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.location.id === draft.location.id ? { ...d, [field]: value } : d)
    );
    this._scheduleInstanceSave(draft.location.id);
  }

  onLocationTextInput(field: string, value: string) {
    this.liveLocationFields[field] = value;
    const draft = this.expandedDraft();
    if (draft) this._scheduleInstanceSave(draft.location.id);
  }

  private syncLiveLocationFields() {
    const draft = this.expandedDraft();
    this.liveLocationFields = {
      geography: draft?.geography ?? '',
      climate:   draft?.climate   ?? '',
      religion:  draft?.religion  ?? '',
      vibe:      draft?.vibe      ?? '',
      languages: draft?.languages ?? '',
    };
    setTimeout(() => {
      const host = this.el.nativeElement as HTMLElement;
      for (const field of Object.keys(this.liveLocationFields)) {
        const input = host.querySelector(`[data-location-field="${field}"]`) as HTMLInputElement | null;
        if (input) input.value = this.liveLocationFields[field];
      }
    }, 0);
  }

  addSecret() {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.location.id === draft.location.id
        ? { ...d, secrets: [...d.secrets, { content: '', editing: true }] }
        : d)
    );
  }

  updateSecretContent(secretIndex: number, value: string) {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.location.id === draft.location.id
        ? { ...d, secrets: d.secrets.map((s, i) => i === secretIndex ? { ...s, content: value } : s) }
        : d)
    );
  }

  confirmSecret(secretIndex: number) {
    const draft = this.expandedDraft();
    if (!draft) return;
    const secret = draft.secrets[secretIndex];
    if (!secret?.content.trim()) { this.cancelSecret(secretIndex); return; }
    if (secret.id) return;

    const cid = this.campaignId();
    if (!cid || !draft.instanceId) {
      this.selectedDrafts.update(sel =>
        sel.map(d => d.location.id === draft.location.id
          ? { ...d, secrets: d.secrets.map((s, i) => i === secretIndex ? { ...s, editing: false } : s) }
          : d)
      );
      return;
    }

    this.http.post<{ id: string }>(`${environment.apiUrl}/api/campaigns/${cid}/secrets`, {
      entityType: 'Location',
      instanceId: draft.instanceId,
      content:    secret.content,
    }).subscribe({ next: resp => {
      this.selectedDrafts.update(sel =>
        sel.map(d => d.location.id === draft.location.id
          ? { ...d, secrets: d.secrets.map((s, i) => i === secretIndex ? { ...s, id: resp.id, editing: false } : s) }
          : d)
      );
    }});
  }

  cancelSecret(secretIndex: number) {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.location.id === draft.location.id
        ? { ...d, secrets: d.secrets.filter((_, i) => i !== secretIndex) }
        : d)
    );
  }

  deleteSecret(secretIndex: number) {
    const draft  = this.expandedDraft();
    if (!draft) return;
    const secret = draft.secrets[secretIndex];
    const cid    = this.campaignId();
    if (cid && secret.id) {
      this.http.delete(`${environment.apiUrl}/api/campaigns/${cid}/secrets/${secret.id}`).subscribe();
    }
    this.selectedDrafts.update(sel =>
      sel.map(d => d.location.id === draft.location.id
        ? { ...d, secrets: d.secrets.filter((_, i) => i !== secretIndex) }
        : d)
    );
  }

  goToSublocations() {
    const cid              = this.campaignId();
    const locationInstanceId = this.expandedDraft()?.instanceId;
    if (cid && locationInstanceId) {
      this.router.navigate(['/dm/campaigns', cid, 'locations', locationInstanceId, 'sublocations']);
    }
  }

  generateInviteCode() {
    const cid = this.campaignId();
    if (!cid) return;
    this.codeLoading.set(true);
    this.http.post<CampaignInviteCode>(`${environment.apiUrl}/api/campaigns/${cid}/invite-code`, {})
      .subscribe({
        next: code => { this.inviteCode.set(code); this.codeLoading.set(false); },
        error: ()  => this.codeLoading.set(false),
      });
  }

  copyCode() {
    const code = this.inviteCode()?.code;
    if (code) navigator.clipboard.writeText(code);
  }

  timeRemaining(): string {
    const exp = this.inviteCode()?.expiresAt;
    if (!exp) return '';
    const ms   = new Date(exp).getTime() - Date.now();
    if (ms <= 0) return 'Expired';
    const h    = Math.floor(ms / 3_600_000);
    const m    = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
  }

  removePlayer(userId: string) {
    const cid = this.campaignId();
    if (!cid) return;
    this.removingPlayer.set(userId);
    this.http.delete(`${environment.apiUrl}/api/campaigns/${cid}/players/${userId}`)
      .subscribe({
        next: () => {
          this.players.update(ps => ps.filter(p => p.userId !== userId));
          this.removingPlayer.set(null);
        },
        error: () => this.removingPlayer.set(null),
      });
  }

  updateLocationKeywords(keywords: string[]) {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.location.id === draft.location.id ? { ...d, keywords } : d)
    );
    this.allDmKeywords.update(pool => {
      const merged = new Set([...pool, ...keywords]);
      return Array.from(merged);
    });
    this._scheduleLocationKeywordSave(draft.location.id);
  }

  private loadExistingCampaign(detail: CampaignDetail, locations: Location[]) {
    this.campaignId.set(detail.id);
    this.isEditMode.set(true);

    this.form.patchValue({
      name:        detail.name,
      fantasyType: detail.fantasyType,
      description: detail.description,
      spineColor:  detail.spineColor || '#ffffff',
    }, { emitEvent: false });

    const drafts: LocationDraft[] = detail.locations.map(ci => {
      const libraryLocation = locations.find(c => c.id === ci.sourceLocationId);
      const location: Location = {
        id:             ci.sourceLocationId,
        dmUserId:       '',
        name:           ci.name,
        classification: ci.classification,
        size:           ci.size,
        condition:      ci.condition,
        geography:      ci.geography,
        architecture:   ci.architecture,
        climate:        ci.climate,
        religion:       ci.religion,
        vibe:           ci.vibe,
        languages:      ci.languages,
        description:    ci.description,
        imageUrl:       libraryLocation?.imageUrl,
        createdAt:      '',
      };

      const locationSecrets: LocationSecret[] = detail.secrets
        .filter(s => s.locationInstanceId === ci.instanceId)
        .map(s => ({ id: s.id, content: s.content, editing: false }));
     
      return {
        location,
        instanceId: ci.instanceId,
        condition:  ci.condition,
        geography:  ci.geography,
        climate:    ci.climate,
        religion:   ci.religion,
        vibe:       ci.vibe,
        languages:  ci.languages,
        secrets:    locationSecrets,
        keywords:   (ci as any).keywords ?? [],
      };
    });

    this.campaignCast.set(detail.casts ?? []);
    this.campaignSublocations.set(detail.sublocations ?? []);
    this.players.set(detail.players ?? []);
    this.inviteCode.set(detail.inviteCode ?? null);

    const sublocationCountMap: Record<string, number> = {};
    for (const subLoc of (detail as any).sublocations ?? []) {
      if (subLoc.locationInstanceId) {
        sublocationCountMap[subLoc.locationInstanceId] = (sublocationCountMap[subLoc.locationInstanceId] ?? 0) + 1;
      }
    }
    this.campaignSublocationCount.set(sublocationCountMap);

    this.selectedDrafts.set(drafts);
    if (drafts.length > 0) this.expandedIdx.set(0);
    this.syncLiveLocationFields();
  }

  private _autoSaveLocation(draft: LocationDraft) {
    const cid = this.campaignId();
    if (!cid) {
      const body = { ...this.form.value, locationIds: [] };
      this.http.post<{ id: string }>(`${environment.apiUrl}/api/campaigns`, body).subscribe({
        next: campaign => {
          this.campaignId.set(campaign.id);
          this._addLocationToBackend(campaign.id, draft.location.id);
        }
      });
    } else {
      this._addLocationToBackend(cid, draft.location.id);
    }
  }

  private _addLocationToBackend(campaignId: string, locationId: string) {
    this.http.post<{ instanceId: string }>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/locations`,
      { locationId }
    ).subscribe({ next: resp => {
      this.selectedDrafts.update(sel =>
        sel.map(d => d.location.id === locationId ? { ...d, instanceId: resp.instanceId } : d)
      );
    }});
  }

  private _doRemove(index: number, draft: LocationDraft) {
    this.selectedDrafts.update(sel => sel.filter((_, i) => i !== index));
    const newLen = this.selectedDrafts().length;
    this.expandedIdx.update(i => Math.min(i, newLen - 1));
    this.syncLiveLocationFields();
    const idx = this.deckLocations().findIndex(c => c.id === draft.location.id);
    if (idx !== -1) this.deckIdx.set(idx);

    const cid = this.campaignId();
    if (cid && draft.instanceId) {
      this.http.delete(`${environment.apiUrl}/api/campaigns/${cid}/locations/${draft.instanceId}`).subscribe();
    }
  }

  private _scheduleLocationKeywordSave(locationId: string) {
    clearTimeout(this.keywordSaveTimer);
    this.keywordSaveTimer = setTimeout(() => {
      const current = this.selectedDrafts().find(d => d.location.id === locationId);
      const cid = this.campaignId();
      if (!current?.instanceId || !cid) return;
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${cid}/locations/${current.instanceId}/keywords`,
        { keywords: current.keywords }
      ).subscribe();
    }, 600);
  }

  private _scheduleInstanceSave(locationId: string) {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const current = this.selectedDrafts().find(d => d.location.id === locationId);
      const cid     = this.campaignId();
      if (!current?.instanceId || !cid) return;
      this.http.patch(`${environment.apiUrl}/api/campaigns/${cid}/locations/${current.instanceId}`, {
        condition: current.condition,
        geography: this.liveLocationFields['geography'],
        climate:   this.liveLocationFields['climate'],
        religion:  this.liveLocationFields['religion'],
        vibe:      this.liveLocationFields['vibe'],
        languages: this.liveLocationFields['languages'],
      }).subscribe();
    }, 800);
  }

  private _getSelCardEl(index: number): HTMLElement | null {
    const stack = this.selectedStackRef?.nativeElement;
    if (!stack) return null;
    return stack.querySelector(`[data-sel-idx="${index}"]`) as HTMLElement | null;
  }

  private _ghostSlideAdd(card: HTMLElement, currentCount: number, onDone: () => void) {
    const r     = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: 'fixed', top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '1000', pointerEvents: 'none', transition: 'none',
    });
    document.body.appendChild(ghost);

    const stackEl  = this.selectedStackRef?.nativeElement;
    const stackR   = stackEl?.getBoundingClientRect();
    const destTop  = stackR ? stackR.top  + currentCount * this.SEL_PEEK : r.top  + 400;
    const destLeft = stackR ? stackR.left : r.left;
    const dx = destLeft - r.left;
    const dy = destTop  - r.top;

    void ghost.offsetWidth;
    ghost.style.transition = 'transform 0.52s cubic-bezier(0.4,0,0.55,1), opacity 0.15s ease 0.4s';
    ghost.style.transform  = `translate(${dx}px,${dy}px)`;
    ghost.style.opacity    = '0';
    setTimeout(() => { ghost.remove(); onDone(); }, 580);
  }

  private _ghostSlideRemove(card: HTMLElement, targetEl: HTMLElement | null, onDone: () => void) {
    const r     = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: 'fixed', top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '1000', pointerEvents: 'none', transition: 'none',
    });
    document.body.appendChild(ghost);

    card.style.transition    = 'none';
    card.style.opacity       = '0';
    card.style.pointerEvents = 'none';

    const targetR  = targetEl?.getBoundingClientRect();
    const destTop  = targetR ? targetR.top  + targetR.height * 0.1 : r.top  - 300;
    const destLeft = targetR ? targetR.left + targetR.width  * 0.05 : r.left - 300;
    const dx = destLeft - r.left;
    const dy = destTop  - r.top;

    void ghost.offsetWidth;
    ghost.style.transition = 'transform 0.46s cubic-bezier(0.4,0,0.55,1), opacity 0.15s ease 0.33s';
    ghost.style.transform  = `translate(${dx}px,${dy}px) scale(0.76)`;
    ghost.style.opacity    = '0';
    setTimeout(() => { ghost.remove(); onDone(); }, 520);
  }
}
