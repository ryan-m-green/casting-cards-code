import {
  Component, Input, Output, EventEmitter, OnInit, OnChanges,
  signal, computed, inject, ViewChild, ElementRef, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Location, CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { Cast, CampaignCastInstance } from '../../models/cast.model';
import { CampaignDetail } from '../../models/campaign.model';
import { Faction, CampaignFactionInstance } from '../../models/faction.model';
import { LocationCardComponent } from '../location-card/location-card.component';
import { SublocationCardComponent } from '../sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../cast-card/cast-card.component';
import { FactionCardComponent } from '../faction-card/faction-card.component';
import { IconPickerComponent } from '../icon-picker/icon-picker.component';
import { JournalDropdownComponent } from '../journal-dropdown/journal-dropdown.component';
import { JournalRandomizeButtonComponent } from '../journal-randomize-button/journal-randomize-button.component';
import { Sublocation } from '../../models/sublocation.model';
import { FACTION_TYPE_OPTIONS, perceptionLabel } from '../../../features/faction/faction-form/faction-form.component';
import { StripeService, EntityLimitsResponse } from '../../../core/stripe.service';
import { AuthService } from '../../../core/auth/auth.service';
import { effect } from '@angular/core';

export type ImportCardType = 'location' | 'sublocation' | 'cast' | 'faction';

const VOICE_OPTIONS        = ['chest', 'throat', 'mouth / oral', 'nasal', 'head / sinus'];
const POSTURE_OPTIONS      = ['upright', 'slouched', 'hunched', 'rigid', 'relaxed', 'open', 'closed‑off', 'confident', 'defensive', 'aggressive', 'passive', 'dominant', 'submissive', 'balanced', 'unsteady', 'leaning forward', 'leaning back', 'leaning to the side', 'arms crossed', 'hands on hips', 'hands behind back', 'military‑straight', 'casual', 'tense', 'loose', 'curved spine', 'straight spine', 'reclined', 'perched', 'crouched', 'kneeling', 'squatting', 'wide‑stance', 'narrow‑stance', 'asymmetrical', 'symmetrical', 'tall', 'compressed'];
const SPEED_OPTIONS        = ['slow & deliberate', 'steady drumbeat', 'brisk', 'quick & hurried', 'nervous & rushed', 'measured', 'lumbering', 'graceful', 'sluggish', 'easygoing', 'calm & steady', 'smooth‑moving', 'relaxed pace', 'casual stride', 'purposeful stride', 'energetic', 'lively', 'darting', 'jittery', 'frantic', 'rapid‑fire', 'snappy', 'hurried', 'urgent', 'plodding', 'creeping', 'tentative', 'cautious', 'bold & decisive', 'fluid', 'sprightly', 'swift', 'nimble', 'light‑footed', 'heavy‑footed', 'stomping', 'drifting', 'wandering', 'methodical', 'stop‑and‑go', 'erratic', 'unpredictable'];
const ALIGNMENT_OPTIONS    = ['lawful good', 'neutral good', 'chaotic good', 'lawful neutral', 'true neutral', 'chaotic neutral', 'lawful evil', 'neutral evil', 'chaotic evil'];
const PRONOUN_OPTIONS      = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'it/its', 'any pronouns'];
const SIZE_OPTIONS         = ['Hamlet', 'Village', 'Town', 'Large Town', 'Location', 'Large Location', 'Metropolis'];
const CONDITION_OPTIONS    = ['calm', 'peaceful', 'bustling', 'crowded', 'quiet', 'deserted', 'lively', 'festive', 'tense', 'volatile', 'dangerous', 'unstable', 'war‑torn', 'recovering', 'thriving', 'prosperous', 'struggling', 'impoverished', 'neglected', 'fortified', 'guarded', 'patrolled', 'abandoned', 'ruined', 'decaying', 'overgrown', 'pristine', 'untouched', 'polluted', 'toxic', 'hazardous', 'stormy', 'windy', 'rainy', 'flooded', 'drought‑stricken', 'frozen', 'snow‑covered', 'foggy', 'smoky', 'dusty', 'scorching', 'humid', 'temperate', 'frigid', 'eerie', 'cursed', 'blessed', 'sacred', 'corrupted', 'chaotic', 'orderly', 'lawless', 'controlled', 'contested', 'occupied', 'besieged', 'isolated', 'remote', 'connected', 'central', 'strategic', 'forgotten', 'hidden', 'exposed'];
const GEOGRAPHY_OPTIONS    = ['mountain', 'mountain range', 'hill', 'valley', 'canyon', 'plateau', 'mesa', 'plain', 'grassland', 'prairie', 'savanna', 'desert', 'dune field', 'tundra', 'glacier', 'ice field', 'forest', 'jungle', 'rainforest', 'swamp', 'marsh', 'wetland', 'bog', 'moor', 'heath', 'coastline', 'beach', 'shoreline', 'cliff', 'reef', 'island', 'archipelago', 'peninsula', 'bay', 'gulf', 'fjord', 'river', 'river delta', 'riverlands', 'lake', 'lagoon', 'pond', 'waterfall', 'spring', 'cave', 'cavern system', 'cave network', 'volcano', 'crater', 'badlands', 'steppe'];
const ARCHITECTURE_OPTIONS = ['ancient stonework', 'classical', 'gothic', 'baroque', 'renaissance', 'medieval', 'rustic', 'rural', 'frontier‑built', 'industrial', 'modern', 'futuristic', 'brutalist', 'minimalist', 'ornate', 'imperial', 'colonial', 'fortified', 'militaristic', 'monastic', 'temple‑focused', 'sacred', 'ceremonial', 'nomadic', 'tribal', 'desert‑carved', 'mountain‑carved', 'forest‑integrated', 'coastal', 'maritime', 'subterranean', 'cavern‑built', 'cliffside‑built', 'sprawling', 'compact', 'labyrinthine', 'orderly', 'chaotic', 'high‑rise', 'low‑rise', 'timber‑framed', 'masonry', 'marble‑heavy', 'metal‑worked', 'glass‑heavy', 'mixed‑material', 'overgrown', 'reclaimed', 'ruined', 'reconstructed', 'pristine'];
const CLIMATE_OPTIONS      = ['tropical', 'subtropical', 'temperate', 'arid', 'semi‑arid', 'mediterranean', 'continental', 'oceanic', 'alpine', 'polar'];
const RELIGION_OPTIONS     = ['sun cult', 'moon cult', 'star cult', 'storm faith', 'earth mother', 'sea father', 'fire worship', 'nature druidism', 'beast totemism', 'ancestor worship', 'spirit veneration', 'elemental pantheon', 'celestial pantheon', 'infernal cult', 'abyssal cult', 'death cult', 'life cult', 'harvest faith', 'forge faith', 'knowledge order', 'trickster cult', 'war brotherhood', 'peace fellowship', 'justice order', 'shadow cult', 'light church', 'balance sect', 'time order', 'fate weavers', 'prophecy circle', 'arcane order', 'wild magic cult', 'blood rite cult', 'stone guardians', 'river spirits', 'mountain spirits', 'forest spirits', 'sky spirits', 'seasonal faith', 'spring renewal cult', 'winter vigil', 'autumn rites', 'summer flame cult'];
const VIBE_OPTIONS         = ['cozy', 'warm', 'welcoming', 'peaceful', 'serene', 'tranquil', 'lively', 'bustling', 'vibrant', 'festive', 'cheerful', 'whimsical', 'quirky', 'mysterious', 'eerie', 'haunting', 'somber', 'gloomy', 'oppressive', 'tense', 'foreboding', 'dangerous', 'chaotic', 'wild', 'primal', 'sacred', 'reverent', 'solemn', 'majestic', 'awe‑inspiring', 'ancient', 'timeless', 'rustic', 'homely', 'refined', 'elegant', 'gritty', 'rough', 'harsh', 'bleak', 'desolate', 'lonely', 'isolated', 'remote', 'hidden', 'secretive', 'enchanted', 'magical', 'arcane', 'otherworldly', 'surreal', 'dreamlike'];
const CLASSIFICATION_OPTIONS = ['city', 'town', 'village', 'region', 'province', 'territory', 'country', 'kingdom', 'empire', 'capital', 'district', 'wilderness', 'forest', 'jungle', 'desert', 'tundra', 'mountain range', 'valley', 'canyon', 'plains', 'grasslands', 'highlands', 'lowlands', 'coastline', 'shoreline', 'island', 'archipelago', 'peninsula', 'riverlands', 'wetlands', 'badlands', 'frontier', 'heartland', 'plateau', 'crater', 'volcanic region', 'glacier', 'steppe', 'savanna', 'moorland', 'ocean', 'sea', 'reef', 'cavern system', 'cave network', 'mine system', 'farmland', 'countryside', 'trade hub', 'port city', 'harbor district', 'crossroads region', 'caravan route', 'sacred grounds', 'ruins', 'ancient site', 'archaeological zone'];
const AGE_OPTIONS           = ['infant', 'toddler', 'child', 'youth', 'teen', 'youngadult', 'adult', 'midlife', 'elder', 'ancient'];
const ROLE_OPTIONS          = ['innkeeper', 'blacksmith', 'guildmaster', 'archivist', 'captain of the guard', 'merchant', 'healer', 'stablemaster', 'hunter', 'court advisor', 'high priest', 'ship captain', 'artificer', 'scout', 'mayor', 'quest scribe', 'wizard', 'bard', 'smuggler', 'naturalist', 'cartographer', 'diplomat', 'herbalist', 'monster hunter', 'librarian', 'alchemist', 'fence', 'noble', 'scribe', 'ranger', 'cook', 'quartermaster', 'engineer', 'spy', 'gladiator trainer', 'caravan leader', 'historian', 'sailor', 'miner', 'architect', 'tailor', 'brewer', 'butcher', 'farmer', 'shepherd', 'fisher', 'mason', 'jeweler', 'banker', 'tax collector', 'magistrate', 'lawyer', 'doctor', 'undertaker', 'gravekeeper', 'fortune teller', 'oracle', 'prophet', 'druid', 'shaman', 'beast tamer', 'falconer', 'weaponsmith', 'armorer', 'leatherworker', 'bowyer', 'fletcher', 'potion maker', 'scroll scribe', 'map seller', 'street performer', 'pickpocket', 'beggar', 'bounty hunter', 'mercenary', 'bodyguard', 'assassin', 'scout captain', 'guard recruiter', 'prison warden', 'jailor', 'courier', 'messenger', 'stablehand', 'dockworker', 'harbor master', 'lighthouse keeper', 'weather watcher', 'explorer', 'archaeologist', 'relic hunter', 'sage', 'tutor', 'professor', 'student', 'ritualist', 'cult leader', 'acolyte', 'temple attendant', 'festival organizer', 'town crier', 'auctioneer', 'market overseer'];
const RACE_OPTIONS          = ['human', 'elf', 'high elf', 'wood elf', 'dark elf', 'drow', 'half‑elf', 'dwarf', 'hill dwarf', 'mountain dwarf', 'halfling', 'lightfoot halfling', 'stout halfling', 'gnome', 'forest gnome', 'rock gnome', 'orc', 'half‑orc', 'goblin', 'hobgoblin', 'bugbear', 'kobold', 'dragonborn', 'tiefling', 'aasimar', 'genasi', 'fire genasi', 'water genasi', 'air genasi', 'earth genasi', 'tabaxi', 'kenku', 'tortle', 'lizardfolk', 'triton', 'firbolg', 'goliath', 'minotaur', 'centaur', 'satyr', 'leonin', 'merfolk', 'changeling', 'shifter', 'warforged', 'kalashtar', 'vedalken', 'simic hybrid', 'aarakocra', 'yuan‑ti pureblood', 'fairy', 'harengon', 'githyanki', 'githzerai', 'duergar', 'svirfneblin', 'eladrin', 'sea elf', 'shadar‑kai', 'reborn', 'dhampir', 'hexblood', 'vampire', 'werewolf', 'catfolk', 'ratfolk', 'tengu', 'kitsune', 'ifrit', 'undine', 'sylph', 'oread', 'fetchling', 'grippli', 'vanara', 'nagaji', 'samsaran', 'skinwalker', 'gillman', 'android', 'lashunta', 'vesk', 'ysoki', 'kasatha', 'half‑giant', 'thri‑kreen', 'mul', 'elan', 'maenad', 'blue', 'loxodon', 'owlin', 'plasmoid', 'autognome', 'hadozee', 'giff', 'locathah', 'khenra', 'naga', 'serpentfolk', 'birdfolk', 'foxfolk', 'wolffolk', 'bearfolk', 'rabbitfolk', 'turtlefolk', 'insectfolk', 'construct', 'living construct', 'elemental‑touched', 'celestial‑touched', 'infernal‑touched', 'fey‑touched', 'shadow‑touched', 'giant‑kin'];
const ALL_LANGUAGES        = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Aquan', 'Auran', 'Ignan', 'Terran', 'Sylvan', 'Undercommon', 'Druidic', "Thieves' Cant", 'Aarakocra', 'Gith', 'Modron', 'Slaad', 'Sphinx', 'Bullywug', 'Hook Horror', 'Sahuagin', 'Troglodyte', 'Drow Sign Language', 'Ixitxachitl'];

@Component({
  selector: 'app-portal-import-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationCardComponent, SublocationCardComponent, CastCardComponent, FactionCardComponent, IconPickerComponent, JournalDropdownComponent, JournalRandomizeButtonComponent],
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
  @Input() initialInstances: (CampaignLocationInstance | CampaignSublocationInstance | CampaignCastInstance | CampaignFactionInstance)[] = [];
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
  @Output() factionAdded   = new EventEmitter<CampaignFactionInstance>();
  @Output() factionRemoved = new EventEmitter<string>();
  @Output() drawerOpenChange   = new EventEmitter<boolean>();

  // ── ViewChild ─────────────────────────────────────────────────────────────
  @ViewChild('drawerContainer') drawerContainerRef!: ElementRef<HTMLElement>;
  @ViewChild('drawerInner') drawerInnerRef!: ElementRef<HTMLElement>;
  @ViewChild('spacer') spacerRef!: ElementRef<HTMLElement>;
  @ViewChild('selectorGrid') selectorGridRef!: ElementRef<HTMLElement>;

  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);
  private stripe = inject(StripeService);
  private auth = inject(AuthService);

  // ── Drawer state ──────────────────────────────────────────────────────────
  drawerOpen       = signal(false);
  drawerPulsing    = signal(false);
  drawerCollapsing = signal(false);
  activeTab        = signal<'select' | 'new'>('select');
  searchTerm       = signal('');
  limitReached     = signal(false);
  drawerHeight     = signal('auto');

  // ── Pagination state ──────────────────────────────────────────────────────
  currentPage      = signal(1);
  isMobile         = signal(window.innerWidth < 768);
  readonly itemsPerPage = computed(() => this.isMobile() ? 14 : 35); // 14 on mobile (2x7), 35 on desktop (5x7)

  readonly isCreateDisabled = computed(() => {
    if (this.auth.isExempt()) return false;
    if (this.auth.isFreeTrial()) return false;
    const level = this.auth.lockLevel();
    return level !== 'FullAccess';
  });

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
  /** Internal live list for factions */
  factionInstanceList      = signal<CampaignFactionInstance[]>([]);
  libraryFactions          = signal<Faction[]>([]);

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

  factionSaveStatus   = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  factionLabelText    = signal<'Saved' | 'Saving...' | 'Error'>('Saved');
  factionLabelVisible = signal(true);
  selectedFactionIcon = signal<string | null>(null);

  castImageFile            = signal<File | null>(null);
  castImagePreviewUrl      = signal<string | null>(null);
  locationImageFile        = signal<File | null>(null);
  locationImagePreviewUrl  = signal<string | null>(null);
  sublocationImageFile        = signal<File | null>(null);
  sublocationImagePreviewUrl  = signal<string | null>(null);

  factionTypeOptions = FACTION_TYPE_OPTIONS;
  perceptionLabel    = perceptionLabel;

  factionForm = this.fb.group({
    name:        ['', Validators.required],
    type:        ['', Validators.required],
    description: [''],
    dmNotes:     [''],
    influence:   [0],
    perception:  [0],
    hidden:      [false],
    goodColor:   ['#ff99bb'],
    evilColor:   ['#004d1a'],
  });

  sizeOptions         = SIZE_OPTIONS;
  conditionOptions    = CONDITION_OPTIONS;
  geographyOptions    = GEOGRAPHY_OPTIONS;
  architectureOptions = ARCHITECTURE_OPTIONS;
  climateOptions      = CLIMATE_OPTIONS;
  religionOptions     = RELIGION_OPTIONS;
  vibeOptions         = VIBE_OPTIONS;
  classificationOptions = CLASSIFICATION_OPTIONS;
  voiceOptions     = VOICE_OPTIONS;
  postureOptions   = POSTURE_OPTIONS;
  speedOptions     = SPEED_OPTIONS;
  alignmentOptions = ALIGNMENT_OPTIONS;
  pronounOptions   = PRONOUN_OPTIONS;
  ageOptions       = AGE_OPTIONS;
  roleOptions      = ROLE_OPTIONS;
  raceOptions      = RACE_OPTIONS;

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
    dmNotes:        [''],
  });

  sublocationForm = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
    dmNotes:     [''],
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

  // Location form controls
  get classificationControl() { return this.form.get('classification') as FormControl; }
  get sizeControl() { return this.form.get('size') as FormControl; }
  get conditionControl() { return this.form.get('condition') as FormControl; }
  get geographyControl() { return this.form.get('geography') as FormControl; }
  get architectureControl() { return this.form.get('architecture') as FormControl; }
  get climateControl() { return this.form.get('climate') as FormControl; }
  get religionControl() { return this.form.get('religion') as FormControl; }
  get vibeControl() { return this.form.get('vibe') as FormControl; }

  // Cast form controls
  get roleControl() { return this.castForm.get('role') as FormControl; }
  get raceControl() { return this.castForm.get('race') as FormControl; }
  get ageControl() { return this.castForm.get('age') as FormControl; }
  get pronounsControl() { return this.castForm.get('pronouns') as FormControl; }
  get postureControl() { return this.castForm.get('posture') as FormControl; }
  get speedControl() { return this.castForm.get('speed') as FormControl; }
  get alignmentControl() { return this.castForm.get('alignment') as FormControl; }

  // Faction form controls
  get factionTypeControl() { return this.factionForm.get('type') as FormControl; }

  readonly currencies = ['cp', 'sp', 'ep', 'gp', 'pp'];

  // ── Computed ──────────────────────────────────────────────────────────────

  availableLanguages = computed(() =>
    ALL_LANGUAGES.filter(l => !this.selectedLanguages().includes(l))
  );

  addedSourceIds = computed(() => {
    if (this.cardType === 'sublocation') {
      return new Set(this.sublocationInstanceList().map(l => l.sourceSublocationId).filter(Boolean));
    }
    if (this.cardType === 'faction') {
      return new Set(this.factionInstanceList().map(f => f.sourceFactionId).filter(Boolean));
    }
    return new Set(this.instanceList().map(l => l.sourceLocationId).filter(Boolean));
  });

  campaignWideAddedFactionSourceIds = computed(() =>
    new Set((this._campaign()?.factions ?? []).map(f => f.sourceFactionId).filter(Boolean))
  );

  availableFactions = computed(() => {
    const campaignAdded = this.campaignWideAddedFactionSourceIds();
    return this.libraryFactions().filter(f => !campaignAdded.has(f.id));
  });

  filteredAvailableFactions = computed(() => {
    const term  = this.searchTerm().toLowerCase().trim();
    const avail = this.availableFactions();
    if (!term) return avail;
    return avail.filter(f =>
      f.name.toLowerCase().includes(term) ||
      f.type.toLowerCase().includes(term)
    );
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

  // ── Pagination computed properties ───────────────────────────────────────
  paginatedLocations = computed(() => {
    const items = this.filteredAvailable();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return items.slice(start, start + this.itemsPerPage());
  });

  paginatedSublocations = computed(() => {
    const items = this.filteredAvailableSublocations();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return items.slice(start, start + this.itemsPerPage());
  });

  paginatedCasts = computed(() => {
    const items = this.filteredAvailableCasts();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return items.slice(start, start + this.itemsPerPage());
  });

  paginatedFactions = computed(() => {
    const items = this.filteredAvailableFactions();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return items.slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => {
    const items = this.cardType === 'location' ? this.filteredAvailable() :
                  this.cardType === 'sublocation' ? this.filteredAvailableSublocations() :
                  this.cardType === 'cast' ? this.filteredAvailableCasts() :
                  this.filteredAvailableFactions();
    return Math.ceil(items.length / this.itemsPerPage());
  });

  hasPrevPage = computed(() => this.currentPage() > 1);
  hasNextPage = computed(() => this.currentPage() < this.totalPages());

  // ── Pagination methods ─────────────────────────────────────────────────────
  nextPage() {
    if (this.hasNextPage()) {
      this._scrollToGridTop(() => {
        this.currentPage.update(p => p + 1);
      });
    }
  }

  prevPage() {
    if (this.hasPrevPage()) {
      this._scrollToGridTop(() => {
        this.currentPage.update(p => p - 1);
      });
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this._scrollToGridTop(() => {
        this.currentPage.set(page);
      });
    }
  }

  resetPagination() {
    this.currentPage.set(1);
  }

  private _scrollToGridTop(callback?: () => void) {
    const scrollTarget = document.querySelector('.scroll-target') as HTMLElement;
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (callback) {
        // Use Intersection Observer to detect when scroll completes
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                observer.disconnect();
                callback();
              }
            });
          },
          { threshold: 0.1 }
        );
        observer.observe(scrollTarget);
      }
    } else if (callback) {
      callback();
    }
  }

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
    if (this.cardType === 'faction') {
      return new Set(this.factionInstanceList().map(f => f.factionInstanceId));
    }
    return new Set<string>();
  });

  tabLabel = computed(() => {
    switch (this.cardType) {
      case 'sublocation': return { select: 'Select Sub-loc', new: '+ New Sub-loc' };
      case 'cast':        return { select: 'Select Cast',        new: '+ New Cast' };
      case 'faction':     return { select: 'Select Faction',     new: '+ New Faction' };
      default:            return { select: 'Select Location',    new: '+ New Location' };
    }
  });

  safeColor(): string {
    const color = this._campaign()?.spineColor ?? '';
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  private _calculateDrawerHeight() {
    // Wait for DOM to render before calculating
    requestAnimationFrame(() => {
      const selectorGrid = this.selectorGridRef?.nativeElement;
      const drawerInner = this.drawerInnerRef?.nativeElement;

      if (!selectorGrid || !drawerInner) {
        this.drawerHeight.set('auto');
        return;
      }

      // Measure actual drawer-to-first-row spacing from DOM
      const drawerInnerRect = drawerInner.getBoundingClientRect();
      const selectorGridRect = selectorGrid.getBoundingClientRect();
      const drawerToFirstRowSpacing = selectorGridRect.top - drawerInnerRect.top;

      // Use actual rendered grid height instead of calculating
      const actualGridHeight = selectorGridRect.height;

      // Add additional buffer to account for spacer and scroll area
      // Faction, location, and cast forms are taller, so use larger buffer
      const bufferSpacing = this.cardType === 'faction' || this.cardType === 'location' || this.cardType === 'cast' ? 550 : 300;

      // Calculate final drawer height
      const calculatedHeight = drawerToFirstRowSpacing + actualGridHeight + bufferSpacing;

      this.drawerHeight.set(`${calculatedHeight}px`);
    });
  }

  private loadEntityLimits() {
    this.stripe.getUserEntityLimits().subscribe({
      next: (limits: EntityLimitsResponse) => {
        switch (this.cardType) {
          case 'location':
            this.limitReached.set(limits.locations.limitReached);
            break;
          case 'sublocation':
            this.limitReached.set(limits.sublocations.limitReached);
            break;
          case 'cast':
            this.limitReached.set(limits.cast.limitReached);
            break;
          case 'faction':
            this.limitReached.set(limits.factions.limitReached);
            break;
        }
      },
      error: () => {
        this.limitReached.set(false);
      }
    });
  }

  // Switch to select tab if limit reached or locked and currently on new tab
  private _limitReachedEffect = effect(() => {
    if ((this.limitReached() || this.isCreateDisabled()) && this.activeTab() === 'new') {
      this.activeTab.set('select');
    }
  });

  // Reset pagination when search term changes
  private _searchEffect = effect(() => {
    this.searchTerm();
    this.resetPagination();
  });

  // Reset pagination when screen size changes to avoid invalid page numbers
  private _screenSizeEffect = effect(() => {
    this.isMobile();
    this.resetPagination();
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  private resizeListener?: () => void;
  private screenSizeListener?: () => void;

  ngOnInit() {
    if (this.cardType === 'sublocation') {
      this.sublocationInstanceList.set(this.initialInstances as CampaignSublocationInstance[]);
      this._fetchLibrarySublocations();
    } else if (this.cardType === 'cast') {
      this.castInstanceList.set(this.initialInstances as CampaignCastInstance[]);
      this._fetchLibraryCasts();
    } else if (this.cardType === 'faction') {
      this.factionInstanceList.set(this.initialInstances as CampaignFactionInstance[]);
      this._fetchLibraryFactions();
    } else {
      this.instanceList.set(this.initialInstances as CampaignLocationInstance[]);
      if (this.cardType === 'location') this._fetchLibraryLocations();
    }
    this.loadEntityLimits();

    // Add window resize listener for drawer height
    this.resizeListener = () => this._calculateDrawerHeight();
    window.addEventListener('resize', this.resizeListener);

    // Add window resize listener for screen size detection
    this.screenSizeListener = () => this.isMobile.set(window.innerWidth < 768);
    window.addEventListener('resize', this.screenSizeListener);
  }

  ngOnDestroy() {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.screenSizeListener) {
      window.removeEventListener('resize', this.screenSizeListener);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cardType'] && !changes['cardType'].firstChange) {
      if (this.cardType === 'location')    this._fetchLibraryLocations();
      if (this.cardType === 'sublocation') this._fetchLibrarySublocations();
      if (this.cardType === 'cast')        this._fetchLibraryCasts();
      if (this.cardType === 'faction')     this._fetchLibraryFactions();
      this.loadEntityLimits();
    }
  }

  private _fetchLibraryLocations() {
    this.http.get<Location[]>(`${environment.apiUrl}/api/locations`)
      .subscribe(list => {
        this.libraryLocations.set(list);
        if (!this.availableLocations().length) this.activeTab.set('new');
        this._calculateDrawerHeight();
      });
  }

  private _fetchLibrarySublocations() {
    this.http.get<Sublocation[]>(`${environment.apiUrl}/api/sublocations`)
      .subscribe(list => {
        this.librarySublocations.set(list);
        if (!this.availableSublocations().length) this.activeTab.set('new');
        this._calculateDrawerHeight();
      });
  }

  private _fetchLibraryCasts() {
    this.http.get<Cast[]>(`${environment.apiUrl}/api/cast`)
      .subscribe(list => {
        this.libraryCasts.set(list);
        if (!this.availableCasts().length) this.activeTab.set('new');
        this._calculateDrawerHeight();
      });
  }

  private _fetchLibraryFactions() {
    this.http.get<Faction[]>(`${environment.apiUrl}/api/factions`)
      .subscribe(list => {
        this.libraryFactions.set(list);
        if (!this.availableFactions().length) this.activeTab.set('new');
        this._calculateDrawerHeight();
      });
  }

  // ── Drawer / FAB ──────────────────────────────────────────────────────────

  toggleDrawer() {
    const opening = !this.drawerOpen();
    if (opening) {
      const scrollEl = document.querySelector('.void-canvas') as HTMLElement | null;
      if (scrollEl) {
        scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
      }
      this.drawerPulsing.set(true);
      setTimeout(() => {
        this.drawerOpen.set(true);
        this.drawerOpenChange.emit(true);
        // Calculate drawer height after opening
        this._calculateDrawerHeight();
        // Scroll so the top of the drawer lands at 75% of the viewport height.
        setTimeout(() => {
          const scrollEl = document.querySelector('.void-canvas') as HTMLElement | null;
          const drawerEl = this.drawerContainerRef?.nativeElement;
          if (scrollEl && drawerEl) {
            const drawerTop = drawerEl.getBoundingClientRect().top;
            const targetTop = window.innerHeight * 0.25;
            const currentScrollTop = scrollEl.scrollTop;
            const requiredScrollTop = currentScrollTop + drawerTop - targetTop;
            scrollEl.scrollTo({ top: requiredScrollTop, behavior: 'smooth' });
          }
        }, 400);
      }, 1200);
    } else {
      this.drawerOpen.set(false);
      this.drawerOpenChange.emit(false);
      // Wait for drawer to collapse (0.8s transition), then collapse pulse bar
      setTimeout(() => {
        this.drawerCollapsing.set(true);
        setTimeout(() => {
          this.drawerPulsing.set(false);
          this.drawerCollapsing.set(false);
        }, 1200);
      }, 800);
    }
  }

  setTab(tab: 'select' | 'new') {
    this.activeTab.set(tab);
    // Recalculate height when switching to new tab for factions
    if (tab === 'new' && this.cardType === 'faction') {
      this._calculateDrawerHeight();
    }
  }

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
        isPartyAnchor:       false,
      };

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
            this.instanceList.update(list => list.map(l => {
              if (l.instanceId !== tempId) return l;
              const merged = { ...instance, imageUrl: l.imageUrl || instance.imageUrl };
              return merged;
            }));
            const emitted = this.instanceList().find(l => l.sourceLocationId === instance.sourceLocationId) ?? instance;
            this.locationAdded.emit(emitted);
          });
          const locImageFile  = this.locationImageFile();
          const locPreviewUrl = this.locationImagePreviewUrl();
          this.locationImageFile.set(null);
          this.locationImagePreviewUrl.set(null);
          if (locPreviewUrl) URL.revokeObjectURL(locPreviewUrl);
          if (locImageFile) {
            const formData = new FormData();
            formData.append('file', locImageFile);
            this.http.post<{ imageUrl: string }>(
              `${environment.apiUrl}/api/locations/${location.id}/image`, formData
            ).subscribe({
              next: res => {
                const cacheBustedUrl = res.imageUrl.includes('?') ? `${res.imageUrl}&t=${Date.now()}` : `${res.imageUrl}?t=${Date.now()}`;
                this.libraryLocations.update(list => list.map(l => l.id === location.id ? { ...l, imageUrl: cacheBustedUrl } : l));
                this.instanceList.update(list => list.map(l => l.sourceLocationId === location.id ? { ...l, imageUrl: cacheBustedUrl } : l));
                const updated = this.instanceList().find(l => l.sourceLocationId === location.id);
                if (updated) this.locationAdded.emit(updated);
              },
            });
          }
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
    } else if (this.cardType === 'faction') {
      sourceId = this.factionInstanceList().find(f => f.factionInstanceId === instanceId)?.sourceFactionId ?? null;
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
    if (this.cardType === 'faction')     return 'app-faction-card';
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
    } else if (this.cardType === 'faction') {
      this.factionInstanceList.update(list => list.filter(f => f.factionInstanceId !== instanceId));
      this.factionRemoved.emit(instanceId);
      this.http.delete(
        `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/factions/${instanceId}`
      ).subscribe();
    }
  }

  // ── Sublocation shop item helpers ─────────────────────────────────────

  private newSublocationItem() {
    return this.fb.group({
      name:             [''],
      priceAmount:      [null as number | null],
      priceCurrencyType:['gp'],
      description:      [''],
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
      dmNotes:     formVal.dmNotes,
      shopItems:   (formVal.shopItems ?? []).map((item: any) => ({
        name:             item.name,
        priceAmount:      item.priceAmount ?? 0,
        priceCurrencyType: item.priceCurrencyType ?? 'gp',
        description:      item.description,
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
            isPartyAnchor:       false,
          };
          this.pendingInstanceIds.update(s => new Set(s).add(tempId));
          this.sublocationInstanceList.update(list => [...list, optimistic]);
          this.sublocationAdded.emit(optimistic);
          this._assembleCard(tempId, 'app-sublocation-card', () => {
            this.pendingInstanceIds.update(s => { const n = new Set(s); n.delete(tempId); return n; });
            this.sublocationInstanceList.update(list => list.map(l => {
              if (l.instanceId !== tempId) return l;
              return { ...instance, imageUrl: l.imageUrl || instance.imageUrl };
            }));
            const emitted = this.sublocationInstanceList().find(l => l.sourceSublocationId === instance.sourceSublocationId) ?? instance;
            this.sublocationAdded.emit(emitted);
          });
          const subImageFile  = this.sublocationImageFile();
          const subPreviewUrl = this.sublocationImagePreviewUrl();
          this.sublocationImageFile.set(null);
          this.sublocationImagePreviewUrl.set(null);
          if (subPreviewUrl) URL.revokeObjectURL(subPreviewUrl);
          if (subImageFile) {
            const formData = new FormData();
            formData.append('file', subImageFile);
            this.http.post<{ imageUrl: string }>(
              `${environment.apiUrl}/api/sublocations/${sublocation.id}/image`, formData
            ).subscribe({
              next: res => {
                const cacheBustedUrl = res.imageUrl.includes('?') ? `${res.imageUrl}&t=${Date.now()}` : `${res.imageUrl}?t=${Date.now()}`;
                this.librarySublocations.update(list => list.map(l => l.id === sublocation.id ? { ...l, imageUrl: cacheBustedUrl } : l));
                this.sublocationInstanceList.update(list => list.map(l => l.sourceSublocationId === sublocation.id ? { ...l, imageUrl: cacheBustedUrl } : l));
                const updated = this.sublocationInstanceList().find(l => l.sourceSublocationId === sublocation.id);
                if (updated) this.sublocationAdded.emit(updated);
              },
            });
          }
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

  selectFaction(faction: Faction, cardEl: HTMLElement) {
    if (this._inFlightSourceIds.has(faction.id)) return;
    this._inFlightSourceIds.add(faction.id);

    const tempId = 'tmp-' + crypto.randomUUID();

    let apiResult: CampaignFactionInstance | null = null;
    let apiError  = false;
    let animDone  = false;

    const applyResult = () => {
      if (!animDone) return;
      if (apiError) {
        this.factionInstanceList.update(list => list.filter(f => f.factionInstanceId !== tempId));
        this.factionRemoved.emit(tempId);
      } else if (apiResult) {
        this.factionInstanceList.update(list => list.map(f => f.factionInstanceId === tempId ? apiResult! : f));
        this.factionAdded.emit(apiResult!);
      }
    };

    this.http.post<CampaignFactionInstance>(
      `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/factions`,
      { factionId: faction.id }
    ).subscribe({
      next:  instance => { apiResult = instance; applyResult(); },
      error: ()       => { apiError  = true;     applyResult(); },
    });

    this._explodeCard(cardEl, () => {
      this._inFlightSourceIds.delete(faction.id);

      const optimistic: CampaignFactionInstance = {
        factionInstanceId:      tempId,
        sourceFactionId:        faction.id,
        campaignId:             this._campaign()?.id ?? '',
        dmUserId:               '',
        name:                   faction.name,
        type:                   faction.type,
        influence:              faction.influence,
        perception:             faction.perception ?? 0,
        hidden:                 faction.hidden,
        isVisibleToPlayers:     false,
        symbolPath:             faction.symbolPath,
        colors:                 faction.colors ?? { evilColor: '#B8D820', goodColor: '#FFC0DC' },
        createdAt:              faction.createdAt,
        subLocationInstanceIds: [],
        castInstanceIds:        [],
        factionRelationships:   [],
      };

      this.pendingInstanceIds.update(s => new Set(s).add(tempId));
      this.factionInstanceList.update(list => [...list, optimistic]);
      this.factionAdded.emit(optimistic);
      this._assembleCard(tempId, 'app-faction-card');

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
        zIndex:        '1002',
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
            zIndex:        '1002',
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
        zIndex:        '1002',
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
            zIndex:        '1002',
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

  private _fadeFactionLabelTo(text: 'Saved' | 'Saving...' | 'Error') {
    this.factionLabelVisible.set(false);
    setTimeout(() => { this.factionLabelText.set(text); this.factionLabelVisible.set(true); }, 280);
  }

  onNewCastFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.castImagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.castImageFile.set(file);
    this.castImagePreviewUrl.set(URL.createObjectURL(file));
  }

  onNewLocationFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.locationImagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.locationImageFile.set(file);
    this.locationImagePreviewUrl.set(URL.createObjectURL(file));
  }

  onNewSublocationFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.sublocationImagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.sublocationImageFile.set(file);
    this.sublocationImagePreviewUrl.set(URL.createObjectURL(file));
  }

  onSaveNewFaction() {
    if (this.factionForm.invalid || !this.selectedFactionIcon() || this.factionSaveStatus() === 'saving') return;
    this.factionSaveStatus.set('saving');
    this._fadeFactionLabelTo('Saving...');

    const raw = this.factionForm.value;
    const payload = {
      name:        raw.name,
      type:        raw.type,
      description: raw.description ?? undefined,
      dmNotes:     raw.dmNotes ?? undefined,
      hidden:      raw.hidden ?? false,
      influence:   raw.influence ?? 0,
      perception:  raw.perception ?? 0,
      symbolPath:  this.selectedFactionIcon() ?? undefined,
      colors: {
        goodColor: raw.goodColor ?? '#ff99bb',
        evilColor: raw.evilColor ?? '#004d1a',
      },
    };

    this.http.post<Faction>(`${environment.apiUrl}/api/factions`, payload)
      .pipe(catchError(() => {
        this.factionSaveStatus.set('error');
        this._fadeFactionLabelTo('Error');
        setTimeout(() => this.factionSaveStatus.set('idle'), 2000);
        return EMPTY;
      }))
      .subscribe(faction => {
        this.http.post<CampaignFactionInstance>(
          `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/factions`,
          { factionId: faction.id }
        ).pipe(catchError(() => {
          this.factionSaveStatus.set('error');
          this._fadeFactionLabelTo('Error');
          setTimeout(() => this.factionSaveStatus.set('idle'), 2000);
          return EMPTY;
        }))
        .subscribe(instance => {
          this.factionSaveStatus.set('saved');
          this._fadeFactionLabelTo('Saved');
          setTimeout(() => this.factionSaveStatus.set('idle'), 2000);
          this.libraryFactions.update(list => [...list, faction]);
          const influence = raw.influence ?? 0;
          // Patch the instance influence immediately after creation
          this.http.patch(
            `${environment.apiUrl}/api/campaigns/${this._campaign()?.id}/factions/${instance.factionInstanceId}`,
            { name: instance.name, type: instance.type, description: instance.description ?? '', hidden: instance.hidden, dmNotes: instance.dmNotes ?? '', influence, perception: raw.perception ?? 0, syncLibrary: false }
          ).subscribe();
          const tempId = 'tmp-' + crypto.randomUUID();
          const optimistic: CampaignFactionInstance = {
            factionInstanceId:      tempId,
            sourceFactionId:        instance.sourceFactionId,
            campaignId:             this._campaign()?.id ?? '',
            dmUserId:               '',
            name:                   instance.name,
            type:                   instance.type,
            influence:              influence,
            perception:             raw.perception ?? 0,
            hidden:                 instance.hidden,
            isVisibleToPlayers:     false,
            symbolPath:             instance.symbolPath,
            colors:                 instance.colors ?? { evilColor: '#B8D820', goodColor: '#FFC0DC' },
            createdAt:              instance.createdAt,
            subLocationInstanceIds: [],
            castInstanceIds:        [],
            factionRelationships:   [],
          };
          this.pendingInstanceIds.update(s => new Set(s).add(tempId));
          this.factionInstanceList.update(list => [...list, optimistic]);
          this.factionAdded.emit(optimistic);
          this._assembleCard(tempId, 'app-faction-card', () => {
            this.pendingInstanceIds.update(s => { const n = new Set(s); n.delete(tempId); return n; });
            const resolved = { ...instance, perception: raw.perception ?? 0, influence };
            this.factionInstanceList.update(list => list.map(f => f.factionInstanceId === tempId ? resolved : f));
            this.factionAdded.emit(resolved);
          });
          this.factionForm.reset({
            name:        '',
            type:        '',
            description: '',
            dmNotes:     '',
            influence:   0,
            perception:  0,
            hidden:      false,
            goodColor:   '#ff99bb',
            evilColor:   '#004d1a',
          });
          this.selectedFactionIcon.set(null);
        });
      });
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
            this.castInstanceList.update(list => list.map(c => {
              if (c.instanceId !== tempId) return c;
              return { ...instance, imageUrl: c.imageUrl || instance.imageUrl };
            }));
            const emitted = this.castInstanceList().find(c => c.sourceCastId === instance.sourceCastId) ?? instance;
            this.castAdded.emit(emitted);
          });
          const castImageFile  = this.castImageFile();
          const castPreviewUrl = this.castImagePreviewUrl();
          this.castImageFile.set(null);
          this.castImagePreviewUrl.set(null);
          if (castPreviewUrl) URL.revokeObjectURL(castPreviewUrl);
          if (castImageFile) {
            const formData = new FormData();
            formData.append('file', castImageFile);
            this.http.post<{ imageUrl: string }>(
              `${environment.apiUrl}/api/cast/${cast.id}/image`, formData
            ).subscribe({
              next: res => {
                const cacheBustedUrl = res.imageUrl.includes('?') ? `${res.imageUrl}&t=${Date.now()}` : `${res.imageUrl}?t=${Date.now()}`;
                this.libraryCasts.update(list => list.map(c => c.id === cast.id ? { ...c, imageUrl: cacheBustedUrl } : c));
                this.castInstanceList.update(list => list.map(c => c.sourceCastId === cast.id ? { ...c, imageUrl: cacheBustedUrl } : c));
                const updated = this.castInstanceList().find(c => c.sourceCastId === cast.id);
                if (updated) this.castAdded.emit(updated);
              },
            });
          }
          this.castForm.reset();
          const vpArr = this.castVoicePlacementArray;
          VOICE_OPTIONS.forEach((_, i) => vpArr.at(i).setValue(false));
        });
      });
  }
}
