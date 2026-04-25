import {
  Component, Input, Output, EventEmitter, OnInit, OnChanges,
  signal, computed, inject, ViewChild, ElementRef, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Location, CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { Cast, CampaignCastInstance } from '../../models/cast.model';
import { CampaignDetail } from '../../models/campaign.model';
import { LocationCardComponent } from '../location-card/location-card.component';
import { SublocationCardComponent } from '../sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../cast-card/cast-card.component';
import { Sublocation } from '../../models/sublocation.model';

export type ImportCardType = 'location' | 'sublocation' | 'cast';

const VOICE_OPTIONS        = ['Chest', 'Throat', 'Mouth / Oral', 'Nasal', 'Head / Sinus'];
const POSTURE_OPTIONS      = ['Upright','Puffed Chest','Slouched','Hunched','Relaxed','Tense','Swaggering','Cowering','Guarded','Leaning'];
const SPEED_OPTIONS        = ['Slow & Deliberate','Steady Drumbeat','Brisk','Quick & Hurried','Nervous & Rushed','Measured','Lumbering','Graceful'];
const ALIGNMENT_OPTIONS    = ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'];
const PRONOUN_OPTIONS      = ['he/him','she/her','they/them','he/they','she/they','it/its','any pronouns'];
const SIZE_OPTIONS         = ['Hamlet','Village','Town','Large Town','Location','Large Location','Metropolis'];
const CONDITION_OPTIONS    = ['Thriving','Stable','Declining','Struggling','Ruined','Rebuilding','War-Torn','Occupied','Abandoned'];
const GEOGRAPHY_OPTIONS    = ['Coastal — Ocean','Coastal — River Delta','Coastal — Cliffside','Riverbank','River Crossing / Ford','Island','Plains / Flatlands','Rolling Hills','Mountain Pass','High Mountain','Deep Forest','Forest Edge','Swamp / Marsh','Desert Oasis','Desert Expanse','Underground / Cavern','Floating / Aerial','Volcanic'];
const ARCHITECTURE_OPTIONS = ['Timber & Thatch — Rustic village construction','Stone & Mortar — Sturdy, common medieval','Grand Stone — Imposing public buildings','Carved Rock — Cut into cliffs or cavern walls','Elven Woodwork — Living trees, curved organic forms','Dwarven Stonecraft — Heavy, angular, rune-etched','Arcane Spires — Towers crackling with magical energy','Bone & Leather — Tribal, nomadic materials','Marble & Column — Classical imperial style','Mudbrick — Desert or arid construction','Iron & Steam — Industrial, forge-heavy','Ancient Ruins — Built atop or within crumbling structures','Mixed / Eclectic — Many cultures layered over time'];
const CLIMATE_OPTIONS      = ['Tropical — Hot, humid, heavy rain','Subtropical — Warm, seasonal rain','Temperate — Mild seasons, moderate rain','Mediterranean — Hot dry summers, mild wet winters','Continental — Cold winters, warm summers','Subarctic — Long brutal winters, brief summers','Arctic / Tundra — Frozen most of the year','Arid Desert — Scorching days, freezing nights','Semi-Arid — Dry, sparse vegetation','Highland — Cool, thin air, unpredictable storms','Magical — Unnaturally altered by arcane forces','Eternally Stormy — Perpetual storms or fog'];
const ALL_LANGUAGES        = ['Common','Dwarvish','Elvish','Giant','Gnomish','Goblin','Halfling','Orc','Abyssal','Celestial','Draconic','Deep Speech','Infernal','Primordial','Aquan','Auran','Ignan','Terran','Sylvan','Undercommon','Druidic',"Thieves' Cant",'Aarakocra','Gith','Modron','Slaad','Sphinx','Bullywug','Hook Horror','Sahuagin','Troglodyte','Drow Sign Language','Ixitxachitl'];

@Component({
  selector: 'app-portal-import-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationCardComponent, SublocationCardComponent, CastCardComponent],
  templateUrl: './portal-import-card.component.html',
  styleUrl: './portal-import-card.component.scss',
})
export class PortalImportCardComponent implements OnInit, OnChanges {

  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input({ required: true }) set campaign(val: CampaignDetail | null) { this._campaign.set(val); }
  private _campaign = signal<CampaignDetail | null>(null);
  @Input({ required: true }) cardType!: ImportCardType;
  /** Ref to the parent grid where selected cards land */
  @Input() targetGridEl: HTMLElement | null = null;
  /**
   * One-time seed of existing instances for this card type.
   * The component takes ownership from this point — mutations are tracked internally.
   */
  @Input() initialInstances: (CampaignLocationInstance | CampaignSublocationInstance | CampaignCastInstance)[] = [];
  /** Sublocation scoping — required when cardType="sublocation" */
  @Input() locationInstanceId: string | null = null;
  /** Cast scoping — required when cardType="cast" */
  @Input() sublocationInstanceId: string | null = null;

  // ── Outputs ───────────────────────────────────────────────────────────────
  @Output() locationAdded   = new EventEmitter<CampaignLocationInstance>();
  @Output() locationRemoved = new EventEmitter<string>();
  @Output() sublocationAdded   = new EventEmitter<CampaignSublocationInstance>();
  @Output() sublocationRemoved = new EventEmitter<string>();
  @Output() castAdded   = new EventEmitter<CampaignCastInstance>();
  @Output() castRemoved = new EventEmitter<string>();
  @Output() drawerOpenChange   = new EventEmitter<boolean>();

  // ── ViewChild ─────────────────────────────────────────────────────────────
  @ViewChild('drawerContainer') drawerContainerRef!: ElementRef<HTMLElement>;

  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  // ── Drawer state ──────────────────────────────────────────────────────────
  drawerOpen       = signal(false);
  drawerPulsing    = signal(false);
  drawerCollapsing = signal(false);
  activeTab        = signal<'select' | 'new'>('select');
  searchTerm       = signal('');

  // ── Library / pending / instances ──────────────────────────────────────────
  libraryLocations     = signal<Location[]>([]);
  librarySublocations  = signal<Sublocation[]>([]);
  libraryCasts         = signal<Cast[]>([]);
  pendingInstanceIds   = signal<Set<string>>(new Set());
  /** Internal live list for locations */
  instanceList             = signal<CampaignLocationInstance[]>([]);
  /** Internal live list for sublocations */
  sublocationInstanceList  = signal<CampaignSublocationInstance[]>([]);
  /** Internal live list for casts */
  castInstanceList         = signal<CampaignCastInstance[]>([]);

  // ── New-form state ────────────────────────────────────────────────────────
  saveStatus        = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  labelText         = signal<'Saved' | 'Saving...' | 'Error'>('Saved');
  labelVisible      = signal(true);
  selectedLanguages = signal<string[]>([]);

  sublocationSaveStatus   = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  sublocationLabelText    = signal<'Saved' | 'Saving...' | 'Error'>('Saved');
  sublocationLabelVisible = signal(true);

  castSaveStatus   = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  castLabelText    = signal<'Saved' | 'Saving...' | 'Error'>('Saved');
  castLabelVisible = signal(true);

  sizeOptions         = SIZE_OPTIONS;
  conditionOptions    = CONDITION_OPTIONS;
  geographyOptions    = GEOGRAPHY_OPTIONS;
  architectureOptions = ARCHITECTURE_OPTIONS;
  climateOptions      = CLIMATE_OPTIONS;
  voiceOptions     = VOICE_OPTIONS;
  postureOptions   = POSTURE_OPTIONS;
  speedOptions     = SPEED_OPTIONS;
  alignmentOptions = ALIGNMENT_OPTIONS;
  pronounOptions   = PRONOUN_OPTIONS;

  form = this.fb.group({
    name:           ['', Validators.required],
    classification: [''],
    size:           [''],
    condition:      [''],
    geography:      [''],
    architecture:   [''],
    climate:        [''],
    religion:       [''],
    vibe:           [''],
    languages:      [''],
    description:    [''],
  });

  sublocationForm = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
    shopItems:   this.fb.array([]),
  });

  get sublocationShopItems() { return this.sublocationForm.get('shopItems') as FormArray; }

  castForm = this.fb.group({
    name:              ['', Validators.required],
    role:              [''],
    race:              [''],
    age:               [''],
    alignment:         [''],
    pronouns:          [''],
    posture:           [''],
    speed:             [''],
    publicDescription: [''],
    description:       [''],
    voicePlacement:    this.fb.array(VOICE_OPTIONS.map(() => false)),
    voiceNotes:        [''],
  });

  get castVoicePlacementArray() { return this.castForm.get('voicePlacement') as FormArray; }

  readonly currencies = ['cp', 'sp', 'ep', 'gp', 'pp'];

  // ── Computed ──────────────────────────────────────────────────────────────

  availableLanguages = computed(() =>
    ALL_LANGUAGES.filter(l => !this.selectedLanguages().includes(l))
  );

  addedSourceIds = computed(() => {
    if (this.cardType === 'sublocation') {
      return new Set(this.sublocationInstanceList().map(l => l.sourceSublocationId).filter(Boolean));
    }
    return new Set(this.instanceList().map(l => l.sourceLocationId).filter(Boolean));
  });

  availableLocations = computed(() =>
    this.libraryLocations().filter(l => !this.addedSourceIds().has(l.id))
  );

  campaignWideAddedSublocationSourceIds = computed(() =>
    new Set((this._campaign()?.sublocations ?? []).map(l => l.sourceSublocationId).filter(Boolean))
  );

  availableSublocations = computed(() => {
    const campaignAdded = this.campaignWideAddedSublocationSourceIds();
    return this.librarySublocations().filter(l => !campaignAdded.has(l.id));
  });

  campaignWideAddedCastSourceIds = computed(() =>
    new Set((this._campaign()?.casts ?? []).map(c => c.sourceCastId).filter(Boolean))
  );

  availableCasts = computed(() => {
    const campaignAdded = this.campaignWideAddedCastSourceIds();
    return this.libraryCasts().filter(c => !campaignAdded.has(c.id));
  });

  filteredAvailableCasts = computed(() => {
    const term  = this.searchTerm().toLowerCase().trim();
    const avail = this.availableCasts();
    if (!term) return avail;
    return avail.filter(c => c.name.toLowerCase().includes(term));
  });

  filteredAvailable = computed(() => {
    const term  = this.searchTerm().toLowerCase().trim();
    const avail = this.availableLocations();
    if (!term) return avail;
    return avail.filter(l =>
      l.name.toLowerCase().includes(term) ||
      l.classification.toLowerCase().includes(term)
    );
  });

  filteredAvailableSublocations = computed(() => {
    const term  = this.searchTerm().toLowerCase().trim();
    const avail = this.availableSublocations();
    if (!term) return avail;
    return avail.filter(l => l.name.toLowerCase().includes(term));
  });

  /**
   * Derives which instances can be removed based on whether they have children.
   * Locations are removable only when they have no sublocation children.
   * Sublocations are removable only when they have no cast children.
   */
  removableInstanceIds = computed<Set<string>>(() => {
    if (this.cardType === 'location') {
      const occupiedLocationInstanceIds = new Set(
        (this._campaign()?.sublocations ?? []).map(s => s.locationInstanceId).filter(Boolean)
      );
      return new Set(
        this.instanceList()
          .filter(l => !occupiedLocationInstanceIds.has(l.instanceId))
          .map(l => l.instanceId)
      );
    }
    if (this.cardType === 'sublocation') {
      // A sublocation is removable only when it has no cast children
      const occupiedSublocationInstanceIds = new Set(
        (this._campaign()?.casts ?? [])
          .filter(c => c.sublocationInstanceId != null)
          .map(c => c.sublocationInstanceId as string)
      );
      const campaignSublocations = (this._campaign()?.sublocations ?? [])
        .filter(s => s.locationInstanceId === this.locationInstanceId);
      return new Set(
        campaignSublocations
          .filter(l => !occupiedSublocationInstanceIds.has(l.instanceId))
          .map(l => l.instanceId)
      );
    }
    if (this.cardType === 'cast') {
      return new Set(this.castInstanceList().map(c => c.instanceId));
    }
    return new Set<string>();
  });

  tabLabel = computed(() => {
    switch (this.cardType) {
      case 'sublocation': return { select: 'Select Sublocation', new: '+ New Sublocation' };
      case 'cast':        return { select: 'Select Cast',        new: '+ New Cast' };
      default:            return { select: 'Select Location',    new: '+ New Location' };
    }
  });

  safeColor(): string {
    const color = this._campaign()?.spineColor ?? '';
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit() {
    if (this.cardType === 'sublocation') {
      this.sublocationInstanceList.set(this.initialInstances as CampaignSublocationInstance[]);
      this._fetchLibrarySublocations();
    } else if (this.cardType === 'cast') {
      this.castInstanceList.set(this.initialInstances as CampaignCastInstance[]);
      this._fetchLibraryCasts();
    } else {
      this.instanceList.set(this.initialInstances as CampaignLocationInstance[]);
      if (this.cardType === 'location') this._fetchLibraryLocations();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cardType'] && !changes['cardType'].firstChange) {
      if (this.cardType === 'location')    this._fetchLibraryLocations();
      if (this.cardType === 'sublocation') this._fetchLibrarySublocations();
      if (this.cardType === 'cast')        this._fetchLibraryCasts();
    }
  }

  private _fetchLibraryLocations() {
    this.http.get<Location[]>(`${environment.apiUrl}/api/locations`)
      .subscribe(list => this.libraryLocations.set(list));
  }

  private _fetchLibrarySublocations() {
    this.http.get<Sublocation[]>(`${environment.apiUrl}/api/sublocations`)
      .subscribe(list => this.librarySublocations.set(list));
  }

  private _fetchLibraryCasts() {
    this.http.get<Cast[]>(`${environment.apiUrl}/api/cast`)
      .subscribe(list => this.libraryCasts.set(list));
  }

  // ── Drawer / FAB ──────────────────────────────────────────────────────────

  toggleDrawer() {
    const opening = !this.drawerOpen();
    if (opening) {
      this.drawerPulsing.set(true);
      setTimeout(() => {
        this.drawerOpen.set(true);
        this.drawerOpenChange.emit(true);
        // Scroll so the top of the drawer lands at 75% of the viewport height.
        setTimeout(() => {
          const scrollEl = document.querySelector('.void-canvas') as HTMLElement | null;
          const drawerEl = this.drawerContainerRef?.nativeElement;
          if (scrollEl && drawerEl) {
            const drawerTop = drawerEl.getBoundingClientRect().top;
            const targetTop = window.innerHeight * 0.25;
            scrollEl.scrollBy({ top: drawerTop - targetTop, behavior: 'smooth' });
          }
        }, 400);
      }, 1200);
    } else {
      this.drawerCollapsing.set(true);
      this.drawerOpen.set(false);
      this.drawerOpenChange.emit(false);
      setTimeout(() => {
        this.drawerPulsing.set(false);
        this.drawerCollapsing.set(false);
      }, 1200);
    }
  }

  setTab(tab: 'select' | 'new') { this.activeTab.set(tab); }

  // ── Select ────────────────────────────────────────────────────────────────

  // Tracks source IDs currently mid-explode to prevent double-clicks
  private _inFlightSourceIds = new Set<string>();

  selectLocation(location: Location, cardEl: HTMLElement) {
    if (this._inFlightSourceIds.has(location.id)) return;
    this._inFlightSourceIds.add(location.id);

    const tempId = 'tmp-' + crypto.randomUUID();

    // Closure state: coordinate animation finish with HTTP result
    let apiResult: CampaignLocationInstance | null = null;
    let apiError  = false;
    let animDone  = false;

    // Apply the final API result once BOTH the explode animation has finished
    // AND the HTTP response has arrived (whichever comes second triggers this).
    const applyResult = () => {
      if (!animDone) return;
      if (apiError) {
        this.instanceList.update(list => list.filter(l => l.instanceId !== tempId));
        this.locationRemoved.emit(tempId);
      } else if (apiResult) {
        this.instanceList.update(list => list.map(l => l.instanceId === tempId ? apiResult! : l));
        this.locationAdded.emit(apiResult!);
      }
      // If neither yet: HTTP is still in-flight; subscribe handlers will call applyResult again.
    };

    // Start HTTP immediately — don't wait for animation
    this.http.post<CampaignLocationInstance>(
      `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/locations`,
      { locationId: location.id }
    ).subscribe({
      next:  instance => { apiResult = instance; applyResult(); },
      error: ()       => { apiError  = true;     applyResult(); },
    });

    // Explode plays for 600ms. Only AFTER it finishes do we update instanceList,
    // which removes the card from filteredAvailable and causes the grid reflow.
    this._explodeCard(cardEl, () => {
      this._inFlightSourceIds.delete(location.id);

      const optimistic: CampaignLocationInstance = {
        instanceId:         tempId,
        sourceLocationId:   location.id,
        name:               location.name,
        classification:     location.classification,
        isVisibleToPlayers: false,
      } as CampaignLocationInstance;

      this.pendingInstanceIds.update(s => new Set(s).add(tempId));
      this.instanceList.update(list => [...list, optimistic]);
      this.locationAdded.emit(optimistic);
      this._assembleCard(tempId, 'app-location-card');

      animDone = true;
      applyResult();
    });
  }

  selectSublocation(sublocation: Sublocation, cardEl: HTMLElement) {
    if (this._inFlightSourceIds.has(sublocation.id)) return;
    this._inFlightSourceIds.add(sublocation.id);

    const tempId = 'tmp-' + crypto.randomUUID();

    let apiResult: CampaignSublocationInstance | null = null;
    let apiError  = false;
    let animDone  = false;

    const applyResult = () => {
      if (!animDone) return;
      if (apiError) {
        this.sublocationInstanceList.update(list => list.filter(l => l.instanceId !== tempId));
        this.sublocationRemoved.emit(tempId);
      } else if (apiResult) {
        this.sublocationInstanceList.update(list => list.map(l => l.instanceId === tempId ? apiResult! : l));
        this.sublocationAdded.emit(apiResult!);
      }
    };

    this.http.post<CampaignSublocationInstance>(
      `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/sublocations`,
      { sublocationId: sublocation.id, locationInstanceId: this.locationInstanceId }
    ).subscribe({
      next:  instance => { apiResult = instance; applyResult(); },
      error: ()       => { apiError  = true;     applyResult(); },
    });

    this._explodeCard(cardEl, () => {
      this._inFlightSourceIds.delete(sublocation.id);

      const optimistic: CampaignSublocationInstance = {
        instanceId:          tempId,
        sourceSublocationId: sublocation.id,
        locationInstanceId:  this.locationInstanceId!,
        campaignId:          this._campaign()?.id ?? '',
        name:                sublocation.name,
        description:         sublocation.description,
        shopItems:           sublocation.shopItems ?? [],
        isVisibleToPlayers:  false,
        dmNotes:             '',
        keywords:            [],
        customItems:         [],
      };

      this.pendingInstanceIds.update(s => new Set(s).add(tempId));
      this.sublocationInstanceList.update(list => [...list, optimistic]);
      this.sublocationAdded.emit(optimistic);
      this._assembleCard(tempId, 'app-sublocation-card');

      animDone = true;
      applyResult();
    });
  }

  // ── New location form ─────────────────────────────────────────────────

  onSaveNewLocation() {
    if (this.form.invalid || this.saveStatus() === 'saving') return;
    this.saveStatus.set('saving');
    this._fadeLabelTo('Saving...');

    this.http.post<Location>(`${environment.apiUrl}/api/locations`, this.form.value)
      .pipe(catchError(() => {
        this.saveStatus.set('error');
        this._fadeLabelTo('Error');
        setTimeout(() => this.saveStatus.set('idle'), 2000);
        return EMPTY;
      }))
      .subscribe(location => {
        this.http.post<CampaignLocationInstance>(
          `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/locations`,
          { locationId: location.id }
        ).pipe(catchError(() => {
          this.saveStatus.set('error');
          this._fadeLabelTo('Error');
          setTimeout(() => this.saveStatus.set('idle'), 2000);
          return EMPTY;
        }))
        .subscribe(instance => {
          this.saveStatus.set('saved');
          this._fadeLabelTo('Saved');
          setTimeout(() => this.saveStatus.set('idle'), 2000);
          this.libraryLocations.update(list => [...list, location as unknown as Location]);
          const tempId = 'tmp-' + crypto.randomUUID();
          const optimistic: CampaignLocationInstance = {
            instanceId:         tempId,
            sourceLocationId:   instance.sourceLocationId,
            name:               instance.name,
            classification:     instance.classification,
            isVisibleToPlayers: false,
          } as CampaignLocationInstance;
          this.pendingInstanceIds.update(s => new Set(s).add(tempId));
          this.instanceList.update(list => [...list, optimistic]);
          this.locationAdded.emit(optimistic);
          this._assembleCard(tempId, 'app-location-card', () => {
            this.pendingInstanceIds.update(s => { const n = new Set(s); n.delete(tempId); return n; });
            this.instanceList.update(list => list.map(l => l.instanceId === tempId ? instance : l));
            this.locationAdded.emit(instance);
          });
          this.form.reset();
          this.selectedLanguages.set([]);
        });
      });
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  // Tracks instance IDs currently mid-remove animation to prevent double-clicks
  private _inFlightRemoveIds = new Set<string>();

  removeCard(instanceId: string, event: Event) {
    event.stopPropagation();
    if (this._inFlightRemoveIds.has(instanceId)) return;
    this._inFlightRemoveIds.add(instanceId);

    // Capture the source library ID before removal so we can find the card in the selector grid
    let sourceId: string | null = null;
    if (this.cardType === 'location') {
      sourceId = this.instanceList().find(l => l.instanceId === instanceId)?.sourceLocationId ?? null;
    } else if (this.cardType === 'sublocation') {
      sourceId = this.sublocationInstanceList().find(l => l.instanceId === instanceId)?.sourceSublocationId ?? null;
    } else if (this.cardType === 'cast') {
      sourceId = this.castInstanceList().find(c => c.instanceId === instanceId)?.sourceCastId ?? null;
    }

    // Find the grid card wrapper element via data-instance-id attribute
    const gridEl   = this.targetGridEl;
    const wrapEl   = gridEl?.querySelector<HTMLElement>(`[data-instance-id="${instanceId}"]`) ?? null;
    const cardEl   = wrapEl?.querySelector<HTMLElement>(this._cardSelector()) ?? null;

    const proceed = () => {
      this._inFlightRemoveIds.delete(instanceId);
      this._commitRemove(instanceId);
    };

    if (!cardEl) {
      proceed();
      return;
    }

    // Phase 1: disassemble the card out of the grid
    this._disassembleCard(cardEl, () => {
      // Commit state removal — this adds item back to filteredAvailable
      this._commitRemove(instanceId);
      this._inFlightRemoveIds.delete(instanceId);

      // Phase 2: reassemble the card back into the selector grid
      if (sourceId) this._reassembleCardInSelector(sourceId);
    });
  }

  private _cardSelector(): string {
    if (this.cardType === 'sublocation') return 'app-sublocation-card';
    if (this.cardType === 'cast')        return 'app-cast-card';
    return 'app-location-card';
  }

  private _commitRemove(instanceId: string) {
    if (this.cardType === 'location') {
      this.instanceList.update(list => list.filter(l => l.instanceId !== instanceId));
      this.locationRemoved.emit(instanceId);
      this.http.delete(
        `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/locations/${instanceId}`
      ).subscribe({
        error: () => {
          this.http.get<CampaignLocationInstance[]>(
            `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/locations`
          ).subscribe(list => this.instanceList.set(list));
        }
      });
    } else if (this.cardType === 'sublocation') {
      this.sublocationInstanceList.update(list => list.filter(l => l.instanceId !== instanceId));
      this.sublocationRemoved.emit(instanceId);
      this.http.delete(
        `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/sublocations/${instanceId}`
      ).subscribe({
        error: () => {
          this.http.get<CampaignSublocationInstance[]>(
            `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/sublocations`
          ).subscribe(list => this.sublocationInstanceList.set(list));
        }
      });
    } else if (this.cardType === 'cast') {
      this.castInstanceList.update(list => list.filter(c => c.instanceId !== instanceId));
      this.castRemoved.emit(instanceId);
      this.http.delete(
        `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/casts/${instanceId}`
      ).subscribe();
    }
  }

  // ── Sublocation shop item helpers ─────────────────────────────────────

  private newSublocationItem() {
    return this.fb.group({
      name:          [''],
      priceAmount:   [null as number | null],
      priceCurrency: ['gp'],
      description:   [''],
    });
  }

  addSublocationItem()             { this.sublocationShopItems.push(this.newSublocationItem()); }
  removeSublocationItem(i: number) { this.sublocationShopItems.removeAt(i); }

  // ── New sublocation form ────────────────────────────────────────────

  onSaveNewSublocation() {
    if (this.sublocationForm.invalid || this.sublocationSaveStatus() === 'saving') return;
    this.sublocationSaveStatus.set('saving');
    this._fadeSublocationLabelTo('Saving...');

    const formVal = this.sublocationForm.value;
    const payload = {
      name:        formVal.name,
      description: formVal.description,
      shopItems:   (formVal.shopItems ?? []).map((item: any) => ({
        name:        item.name,
        price:       item.priceAmount != null ? `${item.priceAmount} ${item.priceCurrency}` : '',
        description: item.description,
      })),
    };

    this.http.post<Sublocation>(`${environment.apiUrl}/api/sublocations`, payload)
      .pipe(catchError(() => {
        this.sublocationSaveStatus.set('error');
        this._fadeSublocationLabelTo('Error');
        setTimeout(() => this.sublocationSaveStatus.set('idle'), 2000);
        return EMPTY;
      }))
      .subscribe(sublocation => {
        this.http.post<CampaignSublocationInstance>(
          `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/sublocations`,
          { sublocationId: sublocation.id, locationInstanceId: this.locationInstanceId }
        ).pipe(catchError(() => {
          this.sublocationSaveStatus.set('error');
          this._fadeSublocationLabelTo('Error');
          setTimeout(() => this.sublocationSaveStatus.set('idle'), 2000);
          return EMPTY;
        }))
        .subscribe(instance => {
          this.sublocationSaveStatus.set('saved');
          this._fadeSublocationLabelTo('Saved');
          setTimeout(() => this.sublocationSaveStatus.set('idle'), 2000);
          this.librarySublocations.update(list => [...list, sublocation]);
          const tempId = 'tmp-' + crypto.randomUUID();
          const optimistic: CampaignSublocationInstance = {
            instanceId:          tempId,
            sourceSublocationId: instance.sourceSublocationId,
            locationInstanceId:  this.locationInstanceId!,
            campaignId:          this._campaign()?.id ?? '',
            name:                instance.name,
            description:         instance.description,
            shopItems:           instance.shopItems ?? [],
            isVisibleToPlayers:  false,
            dmNotes:             '',
            keywords:            [],
            customItems:         [],
          };
          this.pendingInstanceIds.update(s => new Set(s).add(tempId));
          this.sublocationInstanceList.update(list => [...list, optimistic]);
          this.sublocationAdded.emit(optimistic);
          this._assembleCard(tempId, 'app-sublocation-card', () => {
            this.pendingInstanceIds.update(s => { const n = new Set(s); n.delete(tempId); return n; });
            this.sublocationInstanceList.update(list => list.map(l => l.instanceId === tempId ? instance : l));
            this.sublocationAdded.emit(instance);
          });
          this.sublocationForm.reset();
          while (this.sublocationShopItems.length) { this.sublocationShopItems.removeAt(0); }
        });
      });
  }

  // ── Language picker ───────────────────────────────────────────────────────

  addLanguage(lang: string) {
    this.selectedLanguages.update(l => [...l, lang]);
    this.form.get('languages')!.setValue(this.selectedLanguages().join(', '));
  }

  removeLanguage(lang: string) {
    this.selectedLanguages.update(l => l.filter(x => x !== lang));
    this.form.get('languages')!.setValue(this.selectedLanguages().join(', '));
  }

  selectCast(cast: Cast, cardEl: HTMLElement) {
    if (this._inFlightSourceIds.has(cast.id)) return;
    this._inFlightSourceIds.add(cast.id);

    const tempId = 'tmp-' + crypto.randomUUID();

    let apiResult: CampaignCastInstance | null = null;
    let apiError  = false;
    let animDone  = false;

    const applyResult = () => {
      if (!animDone) return;
      if (apiError) {
        this.castInstanceList.update(list => list.filter(c => c.instanceId !== tempId));
        this.castRemoved.emit(tempId);
      } else if (apiResult) {
        this.castInstanceList.update(list => list.map(c => c.instanceId === tempId ? apiResult! : c));
        this.castAdded.emit(apiResult!);
      }
    };

    this.http.post<CampaignCastInstance>(
      `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/casts`,
      { castId: cast.id, sublocationInstanceId: this.sublocationInstanceId, locationInstanceId: this.locationInstanceId }
    ).subscribe({
      next:  instance => { apiResult = instance; applyResult(); },
      error: ()       => { apiError  = true;     applyResult(); },
    });

    this._explodeCard(cardEl, () => {
      this._inFlightSourceIds.delete(cast.id);

      const optimistic: CampaignCastInstance = {
        id:                    cast.id,
        instanceId:            tempId,
        sourceCastId:          cast.id,
        sublocationInstanceId: this.sublocationInstanceId,
        locationInstanceId:    this.locationInstanceId,
        campaignId:           this._campaign()?.id ?? '',
        name:                 cast.name,
        pronouns:             cast.pronouns,
        race:                 cast.race,
        role:                 cast.role,
        age:                  cast.age,
        alignment:            cast.alignment,
        posture:              cast.posture,
        speed:                cast.speed,
        voicePlacement:       cast.voicePlacement,
        voiceNotes:           cast.voiceNotes,
        description:          cast.description,
        publicDescription:    cast.publicDescription,
        imageUrl:             cast.imageUrl,
        createdAt:            cast.createdAt,
        dmUserId:             cast.dmUserId,
        isVisibleToPlayers:   false,
        keywords:             [],
        dmNotes:              '',
      } as CampaignCastInstance;

      this.pendingInstanceIds.update(s => new Set(s).add(tempId));
      this.castInstanceList.update(list => [...list, optimistic]);
      this.castAdded.emit(optimistic);
      this._assembleCard(tempId, 'app-cast-card');

      animDone = true;
      applyResult();
    });
  }

  // ── Animation: explode out ────────────────────────────────────────────────

  private _explodeCard(cardEl: HTMLElement, onComplete: () => void) {
    const r     = cardEl.getBoundingClientRect();
    const cx    = r.left + r.width  / 2;
    const cy    = r.top  + r.height / 2;
    const color = this.safeColor();

    cardEl.style.transition = 'opacity 250ms ease-out, transform 250ms ease-out';
    cardEl.style.opacity    = '0';
    cardEl.style.transform  = 'scale(0.85)';

    const sparks: HTMLElement[] = [];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * 2 * Math.PI + Math.random() * 0.3;
      const dist  = 60 + Math.random() * 80;
      const size  = 4  + Math.random() * 5;
      const sp    = document.createElement('div');
      Object.assign(sp.style, {
        position:      'fixed',
        width:          size + 'px',
        height:         size + 'px',
        borderRadius:  '50%',
        background:     color,
        boxShadow:     `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}`,
        left:          (cx - size / 2) + 'px',
        top:           (cy - size / 2) + 'px',
        zIndex:        '9001',
        pointerEvents: 'none',
        opacity:        '1',
        transition:    'transform 500ms cubic-bezier(0.2,0,0.8,1), opacity 400ms ease-out 120ms',
      });
      document.body.appendChild(sp);
      sparks.push(sp);
      void sp.offsetWidth;
      sp.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
      sp.style.opacity   = '0';
    }

    setTimeout(() => {
      sparks.forEach(s => s.remove());
      cardEl.style.transition = '';
      cardEl.style.opacity    = '';
      cardEl.style.transform  = '';
      onComplete();
    }, 600);
  }

  // ── Animation: assemble in ────────────────────────────────────────────────

  private _assembleCard(tempId: string, cardSelector: string, onComplete?: () => void) {
    const grid = this.targetGridEl;
    if (!grid) {
      this.pendingInstanceIds.update(s => { const n = new Set(s); n.delete(tempId); return n; });
      onComplete?.();
      return;
    }

    const scrollContainer = document.querySelector('.void-canvas') as HTMLElement | null;

    // Double rAF: first frame lets Angular commit the pending card to the DOM,
    // second frame ensures layout has been calculated so getBoundingClientRect is valid.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const cards  = grid.querySelectorAll(cardSelector);
      const destEl = cards.length ? (cards[cards.length - 1] as HTMLElement) : null;

      if (!destEl) {
        this.pendingInstanceIds.update(s => { const n = new Set(s); n.delete(tempId); return n; });
        onComplete?.();
        return;
      }

      // Scroll the destination card into view before snapshotting its position
      if (scrollContainer) {
        const dR  = destEl.getBoundingClientRect();
        const cR  = scrollContainer.getBoundingClientRect();
        const off = dR.top    - cR.top;
        const bot = dR.bottom - cR.bottom;
        if (off < 0)      scrollContainer.scrollBy({ top: off - 16, behavior: 'instant' });
        else if (bot > 0) scrollContainer.scrollBy({ top: bot + 16, behavior: 'instant' });
      }

      // Brief settle after any scroll, then snapshot position and fire sparks
      setTimeout(() => {
        const r     = destEl.getBoundingClientRect();
        const cx    = r.left + r.width  / 2;
        const cy    = r.top  + r.height / 2;
        const color = this.safeColor();

        const sparks: HTMLElement[] = [];
        for (let i = 0; i < 28; i++) {
          const angle  = (i / 28) * 2 * Math.PI + Math.random() * 0.3;
          const dist   = 60 + Math.random() * 80;
          const size   = 4  + Math.random() * 5;
          const startX = cx + Math.cos(angle) * dist;
          const startY = cy + Math.sin(angle) * dist;
          const sp     = document.createElement('div');
          Object.assign(sp.style, {
            position:      'fixed',
            width:          size + 'px',
            height:         size + 'px',
            borderRadius:  '50%',
            background:     color,
            boxShadow:     `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}`,
            left:          (startX - size / 2) + 'px',
            top:           (startY - size / 2) + 'px',
            zIndex:        '9001',
            pointerEvents: 'none',
            opacity:       '1',
              transition:    'transform 550ms cubic-bezier(0.4,0,0.6,1), opacity 300ms ease-in 280ms',
              });
              document.body.appendChild(sp);
              sparks.push(sp);
              void sp.offsetWidth;
              sp.style.transform = `translate(${cx - startX}px, ${cy - startY}px)`;
              sp.style.opacity   = '0';
            }

            // Sparks travel for 550ms and fade from 280ms–580ms.
            // Card reveals after sparks have fully converged AND faded (600ms),
            // then spark elements are removed once the card fade-in is done.
            setTimeout(() => {
              // The Angular [style.opacity] binding lives on the wrapper element,
              // so we apply the fade-in transition there before clearing pendingInstanceIds.
              const wrapEl = (destEl.closest('[data-instance-id]') ?? destEl.parentElement) as HTMLElement | null;
              if (wrapEl) wrapEl.style.transition = 'opacity 180ms ease-out';
              this.pendingInstanceIds.update(s => { const n = new Set(s); n.delete(tempId); return n; });
              setTimeout(() => {
                sparks.forEach(s => s.remove());
                if (wrapEl) wrapEl.style.transition = '';
                onComplete?.();
              }, 200);
            }, 600);
      }, 80);
    }));
  }

  // ── Animation: disassemble out (reverse of assemble-in) ──────────────────

  private _disassembleCard(cardEl: HTMLElement, onComplete: () => void) {
    const r     = cardEl.getBoundingClientRect();
    const cx    = r.left + r.width  / 2;
    const cy    = r.top  + r.height / 2;
    const color = this.safeColor();

    // Fade the card out simultaneously with sparks bursting outward
    cardEl.style.transition = 'opacity 250ms ease-out';
    cardEl.style.opacity    = '0';

    const sparks: HTMLElement[] = [];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * 2 * Math.PI + Math.random() * 0.3;
      const dist  = 60 + Math.random() * 80;
      const size  = 4  + Math.random() * 5;
      const sp    = document.createElement('div');
      Object.assign(sp.style, {
        position:      'fixed',
        width:          size + 'px',
        height:         size + 'px',
        borderRadius:  '50%',
        background:     color,
        boxShadow:     `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}`,
        left:          (cx - size / 2) + 'px',
        top:           (cy - size / 2) + 'px',
        zIndex:        '9001',
        pointerEvents: 'none',
        opacity:       '1',
        transition:    'transform 500ms cubic-bezier(0.2,0,0.8,1), opacity 400ms ease-out 120ms',
      });
      document.body.appendChild(sp);
      sparks.push(sp);
      void sp.offsetWidth;
      sp.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
      sp.style.opacity   = '0';
    }

    setTimeout(() => {
      sparks.forEach(s => s.remove());
      cardEl.style.transition = '';
      cardEl.style.opacity    = '';
      onComplete();
    }, 600);
  }

  // ── Animation: reassemble in selector grid (reverse of explode-out) ───────

  private _reassembleCardInSelector(sourceId: string) {
    const drawerEl = this.drawerContainerRef?.nativeElement;
    if (!drawerEl) return;

    const scrollContainer = document.querySelector('.void-canvas') as HTMLElement | null;

    // Wait for Angular to re-render the selector grid with the restored card
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const selector = this._cardSelector();
      const destWrap = drawerEl.querySelector<HTMLElement>(`.pic-selector-card-wrap[data-source-id="${sourceId}"]`);
      const destCard = destWrap?.querySelector<HTMLElement>(selector) ?? null;
      if (!destWrap || !destCard) return;

      // Scroll into view
      if (scrollContainer) {
        const dR  = destWrap.getBoundingClientRect();
        const cR  = scrollContainer.getBoundingClientRect();
        const off = dR.top    - cR.top;
        const bot = dR.bottom - cR.bottom;
        if (off < 0)      scrollContainer.scrollBy({ top: off - 16, behavior: 'smooth' });
        else if (bot > 0) scrollContainer.scrollBy({ top: bot + 16, behavior: 'smooth' });
      }

      setTimeout(() => {
        const r     = destWrap.getBoundingClientRect();
        const cx    = r.left + r.width  / 2;
        const cy    = r.top  + r.height / 2;
        const color = this.safeColor();

        // Start card invisible; reveal after sparks converge
        destCard.style.opacity    = '0';
        destCard.style.transform  = 'scale(0.85)';
        destCard.style.transition = '';

        const sparks: HTMLElement[] = [];
        for (let i = 0; i < 28; i++) {
          const angle  = (i / 28) * 2 * Math.PI + Math.random() * 0.3;
          const dist   = 60 + Math.random() * 80;
          const size   = 4  + Math.random() * 5;
          const startX = cx + Math.cos(angle) * dist;
          const startY = cy + Math.sin(angle) * dist;
          const sp     = document.createElement('div');
          Object.assign(sp.style, {
            position:      'fixed',
            width:          size + 'px',
            height:         size + 'px',
            borderRadius:  '50%',
            background:     color,
            boxShadow:     `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}`,
            left:          (startX - size / 2) + 'px',
            top:           (startY - size / 2) + 'px',
            zIndex:        '9001',
            pointerEvents: 'none',
            opacity:       '1',
            transition:    'transform 550ms cubic-bezier(0.4,0,0.6,1), opacity 300ms ease-in 280ms',
          });
          document.body.appendChild(sp);
          sparks.push(sp);
          void sp.offsetWidth;
          sp.style.transform = `translate(${cx - startX}px, ${cy - startY}px)`;
          sp.style.opacity   = '0';
        }

        // After sparks converge, reveal the card with fade + scale
        setTimeout(() => {
          destCard.style.transition = 'opacity 250ms ease-out, transform 250ms ease-out';
          destCard.style.opacity    = '1';
          destCard.style.transform  = 'scale(1)';
          setTimeout(() => {
            sparks.forEach(s => s.remove());
            destCard.style.transition = '';
            destCard.style.opacity    = '';
            destCard.style.transform  = '';
          }, 260);
        }, 600);
      }, 80);
    }));
  }

  private _fadeLabelTo(text: 'Saved' | 'Saving...' | 'Error') {
    this.labelVisible.set(false);
    setTimeout(() => { this.labelText.set(text); this.labelVisible.set(true); }, 280);
  }

  private _fadeSublocationLabelTo(text: 'Saved' | 'Saving...' | 'Error') {
    this.sublocationLabelVisible.set(false);
    setTimeout(() => { this.sublocationLabelText.set(text); this.sublocationLabelVisible.set(true); }, 280);
  }

  private _fadeCastLabelTo(text: 'Saved' | 'Saving...' | 'Error') {
    this.castLabelVisible.set(false);
    setTimeout(() => { this.castLabelText.set(text); this.castLabelVisible.set(true); }, 280);
  }

  onSaveNewCast() {
    if (this.castForm.invalid || this.castSaveStatus() === 'saving') return;
    this.castSaveStatus.set('saving');
    this._fadeCastLabelTo('Saving...');

    const raw = this.castForm.value;
    const payload = {
      ...raw,
      voicePlacement: VOICE_OPTIONS.filter((_, i) => (raw.voicePlacement as boolean[])[i]),
    };

    this.http.post<Cast>(`${environment.apiUrl}/api/cast`, payload)
      .pipe(catchError(() => {
        this.castSaveStatus.set('error');
        this._fadeCastLabelTo('Error');
        setTimeout(() => this.castSaveStatus.set('idle'), 2000);
        return EMPTY;
      }))
      .subscribe(cast => {
        this.http.post<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/casts`,
          { castId: cast.id, sublocationInstanceId: this.sublocationInstanceId, locationInstanceId: this.locationInstanceId }
        ).pipe(catchError(() => {
          this.castSaveStatus.set('error');
          this._fadeCastLabelTo('Error');
          setTimeout(() => this.castSaveStatus.set('idle'), 2000);
          return EMPTY;
        }))
        .subscribe(instance => {
          this.castSaveStatus.set('saved');
          this._fadeCastLabelTo('Saved');
          setTimeout(() => this.castSaveStatus.set('idle'), 2000);
          this.libraryCasts.update(list => [...list, cast]);
          const tempId = 'tmp-' + crypto.randomUUID();
          const optimistic: CampaignCastInstance = {
            id:                    instance.sourceCastId,
            instanceId:            tempId,
            sourceCastId:          instance.sourceCastId,
            sublocationInstanceId: this.sublocationInstanceId,
            locationInstanceId:    this.locationInstanceId,
            campaignId:           this._campaign()?.id ?? '',
            name:                 instance.name,
            pronouns:             instance.pronouns,
            race:                 instance.race,
            role:                 instance.role,
            age:                  instance.age,
            alignment:            instance.alignment,
            posture:              instance.posture,
            speed:                instance.speed,
            voicePlacement:       instance.voicePlacement,
            voiceNotes:           instance.voiceNotes,
            description:          instance.description,
            publicDescription:    instance.publicDescription,
            imageUrl:             instance.imageUrl,
            createdAt:            instance.createdAt,
            dmUserId:             instance.dmUserId,
            isVisibleToPlayers:   false,
            keywords:             [],
            dmNotes:              '',
          } as CampaignCastInstance;
          this.pendingInstanceIds.update(s => new Set(s).add(tempId));
          this.castInstanceList.update(list => [...list, optimistic]);
          this.castAdded.emit(optimistic);
          this._assembleCard(tempId, 'app-cast-card', () => {
            this.pendingInstanceIds.update(s => { const n = new Set(s); n.delete(tempId); return n; });
            this.castInstanceList.update(list => list.map(c => c.instanceId === tempId ? instance : c));
            this.castAdded.emit(instance);
          });
          this.castForm.reset();
          const vpArr = this.castVoicePlacementArray;
          VOICE_OPTIONS.forEach((_, i) => vpArr.at(i).setValue(false));
        });
      });
  }
}
