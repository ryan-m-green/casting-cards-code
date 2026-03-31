import { Component, OnInit, OnDestroy, signal, inject, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { City } from '../../../shared/models/city.model';
import { CampaignDetail, CampaignInviteCode, CampaignPlayer } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { CastRelationshipsTabComponent } from '../cast-relationships-tab/cast-relationships-tab.component';
import { KeywordInputComponent } from '../../../shared/components/keyword-input/keyword-input.component';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

interface CitySecret {
  id?: string;
  content: string;
  editing: boolean;
}

interface CityDraft {
  city: City;
  instanceId?: string;
  condition: string;
  geography: string;
  climate:   string;
  religion:  string;
  vibe:      string;
  languages: string;
  secrets:   CitySecret[];
  keywords:  string[];
}

@Component({
  selector: 'app-campaign-creator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CardFlipComponent, CastRelationshipsTabComponent, KeywordInputComponent, DmNavComponent],
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

  cities         = signal<City[]>([]);
  selectedDrafts = signal<CityDraft[]>([]);
  campaignId              = signal<string | null>(null);
  campaignCast            = signal<CampaignCastInstance[]>([]);
  campaignLocations       = signal<CampaignLocationInstance[]>([]);
  campaignLocationCount   = signal<Record<string, number>>({});
  deckIdx        = signal(0);
  expandedIdx    = signal(0);
  saving         = signal(false);
  isSwapping     = false;
  activeTab      = signal<'world-setup' | 'cast-relationships' | 'players'>('world-setup');
  players        = signal<CampaignPlayer[]>([]);
  inviteCode     = signal<CampaignInviteCode | null>(null);
  codeLoading    = signal(false);
  removingPlayer = signal<string | null>(null);
  citySearch     = signal('');

  pendingRemoveIdx   = signal<number | null>(null);
  pendingCastCount   = signal(0);
  allDmKeywords      = signal<string[]>([]);

  private keywordSaveTimer?: ReturnType<typeof setTimeout>;

  // Local fields for city text inputs — never pushed to selectedDrafts() signal during typing
  liveCityFields: Record<string, string> = {
    geography: '', climate: '', religion: '', vibe: '', languages: '',
  };

  readonly conditionOptions = ['Thriving', 'Stable', 'Declining', 'War-Torn', 'Rebuilding', 'Abandoned'];

  private readonly SEL_PEEK = 46;
  private readonly SEL_FULL = 220;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private formSaveTimer?: ReturnType<typeof setTimeout>;

  deckCities = computed(() => {
    const selectedIds = new Set(this.selectedDrafts().map(d => d.city.id));
    return this.cities().filter(c => !selectedIds.has(c.id));
  });

  filteredDeckCities = computed(() => {
    const term = this.citySearch().trim().toLowerCase();
    const deck = this.deckCities();
    if (!term) return deck;
    return deck.filter(c =>
      [c.name, c.classification, c.size, c.geography, c.climate, c.vibe, c.description, c.architecture, c.religion]
        .some(f => f?.toLowerCase().includes(term))
    );
  });

  currentCard = computed(() => {
    const deck = this.filteredDeckCities();
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

  expandedCityLocations = computed(() => {
    const draft = this.expandedDraft();
    if (!draft?.instanceId) return [];
    return this.campaignLocations().filter(l => l.cityInstanceId === draft.instanceId);
  });

  castCountForLocation(locationInstanceId: string): number {
    return this.campaignCast().filter(c => (c as any).locationInstanceId === locationInstanceId).length;
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
        cities:   this.http.get<City[]>(`${environment.apiUrl}/api/cities`),
        campaign: this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`),
      }).subscribe(({ cities, campaign }) => {
        this.cities.set(cities);
        this.loadExistingCampaign(campaign, cities);
      });
    } else {
      this.http.get<City[]>(`${environment.apiUrl}/api/cities`).subscribe(c => this.cities.set(c));
    }

    this.form.valueChanges.subscribe(() => {
      if (!this.campaignId()) return;
      clearTimeout(this.formSaveTimer);
      this.formSaveTimer = setTimeout(() => {
        const cid = this.campaignId();
        if (cid) this.http.patch(`${environment.apiUrl}/api/campaigns/${cid}`, this.form.value).subscribe();
      }, 800);
    });
  }

  ngOnDestroy() {
    clearTimeout(this.saveTimer);
    clearTimeout(this.formSaveTimer);
    clearTimeout(this.keywordSaveTimer);
  }

  setCitySearch(term: string) {
    this.citySearch.set(term);
    this.deckIdx.set(0);
  }

  swapCityCard() {
    if (this.isSwapping) return;
    const deck = this.filteredDeckCities();
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

  addCityToSelected() {
    if (this.isSwapping) return;
    if (!this.form.controls.name.valid) {
      this.form.controls.name.markAsTouched();
      return;
    }
    const city = this.currentCard();
    if (!city) return;
    this.isSwapping = true;
    const card = this.mainCardRef?.nativeElement;
    if (!card) { this.isSwapping = false; return; }

    const draft: CityDraft = {
      city,
      condition: city.condition,
      geography: city.geography,
      climate:   city.climate,
      religion:  city.religion,
      vibe:      city.vibe,
      languages: city.languages,
      secrets:   [],
      keywords:  [],
    };

    const currentCount = this.selectedDrafts().length;
    this._ghostSlideAdd(card, currentCount, () => { this.isSwapping = false; });

    card.style.opacity    = '0';
    card.style.transition = 'none';

    this.selectedDrafts.update(sel => [...sel, draft]);
    this.expandedIdx.set(this.selectedDrafts().length - 1);
    this.syncLiveCityFields();
    const newDeckLen = this.deckCities().length;
    if (newDeckLen > 0) {
      this.deckIdx.update(i => i % newDeckLen);
      void card.offsetWidth;
      card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
      void card.offsetWidth;
      card.style.transition = 'transform 0.34s cubic-bezier(0,0,0.2,1), opacity 0.28s ease-out';
      card.style.transform  = 'translateX(0) scale(1) rotate(0deg)';
      card.style.opacity    = '1';
    }

    this._autoSaveCity(draft);
  }

  removeCitySelected(index: number) {
    const draft = this.selectedDrafts()[index];
    if (draft.instanceId) {
      const count = this.campaignLocationCount()[draft.instanceId] ?? 0;
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
    const deckIsEmpty = this.deckCities().length === 0;
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
    this.syncLiveCityFields();
  }

  updateDraftField(field: string, value: string) {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.city.id === draft.city.id ? { ...d, [field]: value } : d)
    );
    this._scheduleInstanceSave(draft.city.id);
  }

  onCityTextInput(field: string, value: string) {
    this.liveCityFields[field] = value;
    const draft = this.expandedDraft();
    if (draft) this._scheduleInstanceSave(draft.city.id);
  }

  private syncLiveCityFields() {
    const draft = this.expandedDraft();
    this.liveCityFields = {
      geography: draft?.geography ?? '',
      climate:   draft?.climate   ?? '',
      religion:  draft?.religion  ?? '',
      vibe:      draft?.vibe      ?? '',
      languages: draft?.languages ?? '',
    };
    setTimeout(() => {
      const host = this.el.nativeElement as HTMLElement;
      for (const field of Object.keys(this.liveCityFields)) {
        const input = host.querySelector(`[data-city-field="${field}"]`) as HTMLInputElement | null;
        if (input) input.value = this.liveCityFields[field];
      }
    }, 0);
  }

  addSecret() {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.city.id === draft.city.id
        ? { ...d, secrets: [...d.secrets, { content: '', editing: true }] }
        : d)
    );
  }

  updateSecretContent(secretIndex: number, value: string) {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.city.id === draft.city.id
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
        sel.map(d => d.city.id === draft.city.id
          ? { ...d, secrets: d.secrets.map((s, i) => i === secretIndex ? { ...s, editing: false } : s) }
          : d)
      );
      return;
    }

    this.http.post<{ id: string }>(`${environment.apiUrl}/api/campaigns/${cid}/secrets`, {
      entityType: 'City',
      instanceId: draft.instanceId,
      content:    secret.content,
    }).subscribe({ next: resp => {
      this.selectedDrafts.update(sel =>
        sel.map(d => d.city.id === draft.city.id
          ? { ...d, secrets: d.secrets.map((s, i) => i === secretIndex ? { ...s, id: resp.id, editing: false } : s) }
          : d)
      );
    }});
  }

  cancelSecret(secretIndex: number) {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.city.id === draft.city.id
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
      sel.map(d => d.city.id === draft.city.id
        ? { ...d, secrets: d.secrets.filter((_, i) => i !== secretIndex) }
        : d)
    );
  }

  goToLocations() {
    const cid            = this.campaignId();
    const cityInstanceId = this.expandedDraft()?.instanceId;
    if (cid && cityInstanceId) {
      this.router.navigate(['/dm/campaigns', cid, 'cities', cityInstanceId, 'locations']);
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

  updateCityKeywords(keywords: string[]) {
    const draft = this.expandedDraft();
    if (!draft) return;
    this.selectedDrafts.update(sel =>
      sel.map(d => d.city.id === draft.city.id ? { ...d, keywords } : d)
    );
    this.allDmKeywords.update(pool => {
      const merged = new Set([...pool, ...keywords]);
      return Array.from(merged);
    });
    this._scheduleCityKeywordSave(draft.city.id);
  }

  private loadExistingCampaign(detail: CampaignDetail, cities: City[]) {
    this.campaignId.set(detail.id);
    this.isEditMode.set(true);

    this.form.patchValue({
      name:        detail.name,
      fantasyType: detail.fantasyType,
      description: detail.description,
      spineColor:  detail.spineColor || '#ffffff',
    }, { emitEvent: false });

    const drafts: CityDraft[] = detail.cities.map(ci => {
      const libraryCity = cities.find(c => c.id === ci.sourceCityId);
      const city: City = {
        id:             ci.sourceCityId,
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
        imageUrl:       libraryCity?.imageUrl,
        createdAt:      '',
      };

      const citySecrets: CitySecret[] = detail.secrets
        .filter(s => s.cityInstanceId === ci.instanceId)
        .map(s => ({ id: s.id, content: s.content, editing: false }));
     
      return {
        city,
        instanceId: ci.instanceId,
        condition:  ci.condition,
        geography:  ci.geography,
        climate:    ci.climate,
        religion:   ci.religion,
        vibe:       ci.vibe,
        languages:  ci.languages,
        secrets:    citySecrets,
        keywords:   (ci as any).keywords ?? [],
      };
    });

    this.campaignCast.set(detail.casts ?? []);
    this.campaignLocations.set(detail.locations ?? []);
    this.players.set(detail.players ?? []);
    this.inviteCode.set(detail.inviteCode ?? null);

    const locationCountMap: Record<string, number> = {};
    for (const loc of (detail as any).locations ?? []) {
      if (loc.cityInstanceId) {
        locationCountMap[loc.cityInstanceId] = (locationCountMap[loc.cityInstanceId] ?? 0) + 1;
      }
    }
    this.campaignLocationCount.set(locationCountMap);

    this.selectedDrafts.set(drafts);
    if (drafts.length > 0) this.expandedIdx.set(0);
    this.syncLiveCityFields();
  }

  private _autoSaveCity(draft: CityDraft) {
    const cid = this.campaignId();
    if (!cid) {
      const body = { ...this.form.value, cityIds: [] };
      this.http.post<{ id: string }>(`${environment.apiUrl}/api/campaigns`, body).subscribe({
        next: campaign => {
          this.campaignId.set(campaign.id);
          this._addCityToBackend(campaign.id, draft.city.id);
        }
      });
    } else {
      this._addCityToBackend(cid, draft.city.id);
    }
  }

  private _addCityToBackend(campaignId: string, cityId: string) {
    this.http.post<{ instanceId: string }>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/cities`,
      { cityId }
    ).subscribe({ next: resp => {
      this.selectedDrafts.update(sel =>
        sel.map(d => d.city.id === cityId ? { ...d, instanceId: resp.instanceId } : d)
      );
    }});
  }

  private _doRemove(index: number, draft: CityDraft) {
    this.selectedDrafts.update(sel => sel.filter((_, i) => i !== index));
    const newLen = this.selectedDrafts().length;
    this.expandedIdx.update(i => Math.min(i, newLen - 1));
    this.syncLiveCityFields();
    const idx = this.deckCities().findIndex(c => c.id === draft.city.id);
    if (idx !== -1) this.deckIdx.set(idx);

    const cid = this.campaignId();
    if (cid && draft.instanceId) {
      this.http.delete(`${environment.apiUrl}/api/campaigns/${cid}/cities/${draft.instanceId}`).subscribe();
    }
  }

  private _scheduleCityKeywordSave(cityId: string) {
    clearTimeout(this.keywordSaveTimer);
    this.keywordSaveTimer = setTimeout(() => {
      const current = this.selectedDrafts().find(d => d.city.id === cityId);
      const cid = this.campaignId();
      if (!current?.instanceId || !cid) return;
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${cid}/cities/${current.instanceId}/keywords`,
        { keywords: current.keywords }
      ).subscribe();
    }, 600);
  }

  private _scheduleInstanceSave(cityId: string) {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const current = this.selectedDrafts().find(d => d.city.id === cityId);
      const cid     = this.campaignId();
      if (!current?.instanceId || !cid) return;
      this.http.patch(`${environment.apiUrl}/api/campaigns/${cid}/cities/${current.instanceId}`, {
        condition: current.condition,
        geography: this.liveCityFields['geography'],
        climate:   this.liveCityFields['climate'],
        religion:  this.liveCityFields['religion'],
        vibe:      this.liveCityFields['vibe'],
        languages: this.liveCityFields['languages'],
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
