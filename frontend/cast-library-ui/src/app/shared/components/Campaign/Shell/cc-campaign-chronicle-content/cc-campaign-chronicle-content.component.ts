import { Component, Input, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { Cast, CampaignCastInstance } from '../../../../models/cast.model';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';

interface ChronicleLinkedEntity {
  entityType: string;
  entityId: string;
  entityName: string;
  entityRole?: string;
  entityRace?: string;
  entityImageUrl?: string;
  entityState?: string;
  entityCount?: number;
}

interface CampaignChronicleEntry {
  id: string;
  campaignId: string;
  contentType: string;
  sourceId: string | null;
  title: string;
  body: string;
  sortOrder: number;
  linkedEntities?: ChronicleLinkedEntity[];
  filePath: string;
  imageUrl?: string | null;
  todSliceName: string;
  dayNumber: number;
  isGmOnly: boolean;
  playedOn: string;
  sessionNumber: number | null;
  archivedAt: string;
  createdAt: string;
  updatedAt: string;
  keywords?: string[];
}

interface ChronicleDayGroup {
  key: string;
  date: string;
  weekday: string;
  entries: CampaignChronicleEntry[];
}

interface ChronicleTypeMeta {
  value: string;
  label: string;
  icon: string;
}

const CHRONICLE_TYPES: ChronicleTypeMeta[] = [
  { value: 'scene',         label: 'Scene',       icon: '/storyline.svg' },
  { value: 'handout',       label: 'Handout',     icon: '/handout_image.svg' },
  { value: 'player-note',   label: 'Player Note', icon: '/feather_quill_writing_tool.svg' },
  { value: 'secret',        label: 'Secret',      icon: '/locked_book_secrets.svg' },
  { value: 'coin-reward',   label: 'Treasure',    icon: '/treasure_chest_gold_coins.svg' },
  { value: 'shop-purchase', label: 'Purchase',    icon: '/open_book_diamond_bookmark.svg' },
  { value: 'time-passed',   label: 'Time',        icon: '/hourglass_passing_time.svg' },
];

@Component({
  selector: 'app-cc-campaign-chronicle-content',
  standalone: true,
  imports: [CcSimpleCastCardComponent],
  templateUrl: './cc-campaign-chronicle-content.component.html',
  styleUrl: './cc-campaign-chronicle-content.component.scss',
})
export class CcCampaignChronicleContentComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(CampaignShellService);

  private hubSubscriptions: Subscription[] = [];

  @Input() campaignId = '';
  @Input() portalColor = '#6e28d0';
  @Input() isDmMode = false;
  @Input() initialSearchQuery = '';

  readonly types = CHRONICLE_TYPES;

  loading = signal(true);
  error = signal('');
  entries = signal<CampaignChronicleEntry[]>([]);

  searchQuery = signal('');
  activeTypes = signal<string[]>([]);

  readonly searchFiltered = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.entries();
    return this.entries().filter(entry => this.matchesSearch(entry, query));
  });

  typeCounts = computed(() => {
    const known = new Set<string>(this.entries().map(entry => entry.contentType));
    const counts = new Map<string, number>();
    for (const entry of this.searchFiltered()) {
      counts.set(entry.contentType, (counts.get(entry.contentType) ?? 0) + 1);
    }
    return this.types
      .filter(type => known.has(type.value))
      .map(type => ({ ...type, count: counts.get(type.value) ?? 0 }));
  });

  filtered = computed(() => {
    const types = this.activeTypes();
    if (!types.length) return this.searchFiltered();
    return this.searchFiltered().filter(entry => types.includes(entry.contentType));
  });

  private matchesSearch(entry: CampaignChronicleEntry, query: string): boolean {
    const haystack = [
      entry.title,
      entry.body,
      entry.todSliceName,
      ...(entry.keywords ?? []),
      ...(entry.linkedEntities ?? []).map(entity => entity.entityName),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  resultCount = computed(() => this.filtered().length);

  groups = computed<ChronicleDayGroup[]>(() => {
    const buckets = new Map<string, CampaignChronicleEntry[]>();

    for (const entry of this.filtered()) {
      const key = this.dayKey(entry.createdAt);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(entry);
      else buckets.set(key, [entry]);
    }

    return [...buckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, entries]) => ({
        key,
        date: this.formatDate(entries[0].createdAt),
        weekday: this.formatWeekday(entries[0].createdAt),
        entries: [...entries].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));
  });

  ngOnInit() {
    if (this.initialSearchQuery) {
      this.searchQuery.set(this.initialSearchQuery);
    }

    this.hubSubscriptions.push(
      this.hub.on('ChronicleAdded', 'cc-campaign-chronicle-content', event => {
        if (event?.campaignId !== this.campaignId) return;
        this.load(true);
      })
    );

    this.load();
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(subscription => subscription.unsubscribe());
  }

  load(quiet = false) {
    if (!this.campaignId) {
      this.loading.set(false);
      return;
    }

    if (!quiet) {
      this.loading.set(true);
      this.error.set('');
    }

    this.http
      .get<CampaignChronicleEntry[]>(
        `${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/feed?limit=200`
      )
      .subscribe({
        next: entries => {
          this.entries.set(entries ?? []);
          this.loading.set(false);
          this.error.set('');
        },
        error: () => {
          if (quiet) return;
          this.error.set('Could not load the campaign chronicle.');
          this.loading.set(false);
        },
      });
  }

  toggleType(value: string) {
    this.activeTypes.update(current =>
      current.includes(value) ? current.filter(type => type !== value) : [...current, value]
    );
  }

  isTypeActive(value: string) {
    return this.activeTypes().includes(value);
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
  }

  clearTypeFilters() {
    this.activeTypes.set([]);
  }

  clearFilters() {
    this.activeTypes.set([]);
    this.searchQuery.set('');
  }

  typeMeta(value: string): ChronicleTypeMeta {
    return this.types.find(type => type.value === value)
      ?? { value, label: value, icon: '/storyline.svg' };
  }

  whenLabel(entry: CampaignChronicleEntry): string {
    const parts: string[] = [];
    if ((entry.dayNumber ?? 0) > 0) parts.push(`Day ${entry.dayNumber}`);
    if (entry.todSliceName) parts.push(entry.todSliceName);
    return parts.join(' · ');
  }

  imageFor(entry: CampaignChronicleEntry): string | null {
    const imageUrl = entry.imageUrl ?? '';
    if (imageUrl) return imageUrl;

    const filePath = entry.filePath ?? '';
    return /^https?:\/\//i.test(filePath) ? filePath : null;
  }

  private linkedCards(entry: CampaignChronicleEntry): ChronicleLinkedEntity[] {
    return (entry.linkedEntities ?? []).filter(entity => entity.entityType !== entry.contentType);
  }

  castCards(entry: CampaignChronicleEntry): ChronicleLinkedEntity[] {
    return this.linkedCards(entry).filter(entity => entity.entityType === 'cast');
  }

  displayEntities(entry: CampaignChronicleEntry): ChronicleLinkedEntity[] {
    return this.linkedCards(entry).filter(entity => entity.entityType !== 'cast');
  }

  isTimeEntry(entry: CampaignChronicleEntry): boolean {
    return entry.contentType === 'time-passed';
  }

  asCast(entity: ChronicleLinkedEntity): Cast {
    const card = this.campaignCardFor(entity.entityId);

    return {
      id: entity.entityId,
      dmUserId: '',
      name: entity.entityName,
      pronouns: '',
      race: entity.entityRace || card?.race || '',
      role: entity.entityRole || card?.role || '',
      age: '',
      maxHitPoints: 0,
      posture: '',
      speed: '',
      keywords: [],
      voiceNotes: '',
      description: '',
      publicDescription: '',
      imageUrl: entity.entityImageUrl || card?.imageUrl || undefined,
      createdAt: '',
    };
  }

  /**
   * The campaign's own card behind a linked entity, when the campaign still holds it.
   *
   * The card's face cannot be taken from the link alone: an entry the encounter wrap-up wrote
   * carries its own copy of the portrait, role and race, but one written from a storyline scene or
   * a quicknote carries only the card's type, id and name (see storylineChronicleParticipants) —
   * those links have no face to store. So the gaps are filled from the card as the campaign holds
   * it now, which also picks up a portrait uploaded since the entry was written.
   */
  private campaignCardFor(entityId: string): CampaignCastInstance | null {
    const id = this.plainEntityId(entityId);
    if (!id) return null;

    return this.shellSvc.campaign()?.casts.find(cast =>
      cast.instanceId === id || cast.sourceCastId === id) ?? null;
  }

  /**
   * The id an encounter's card key wraps: a card taken from the campaign's own cast is keyed
   * `instance:<instance id>`, one picked straight from the library `cast:<cast id>`, and a card
   * that only ever had a source id is the bare id. All three name the card itself.
   */
  private plainEntityId(entityId: string): string {
    const id = entityId ?? '';
    const separator = id.indexOf(':');
    return separator > 0 ? id.slice(separator + 1) : id;
  }

  isDefeated(entity: ChronicleLinkedEntity): boolean {
    return entity.entityState === 'defeated';
  }

  isCaptured(entity: ChronicleLinkedEntity): boolean {
    return entity.entityState === 'captured';
  }

  isEscaped(entity: ChronicleLinkedEntity): boolean {
    return entity.entityState === 'escaped';
  }

  hasCount(entity: ChronicleLinkedEntity): boolean {
    return (entity.entityCount ?? 0) > 0;
  }

  highlightText(value: string): string {
    const query = this.searchQuery().trim();
    const safeText = this.escapeHtml(value ?? '');
    if (!query) return safeText;

    const safeQuery = this.escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safeText.replace(new RegExp(`(${safeQuery})`, 'gi'), '<mark class="cc-highlight">$1</mark>');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private dayKey(value: string): string {
    const date = new Date(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  private formatWeekday(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { weekday: 'long' });
  }
}
