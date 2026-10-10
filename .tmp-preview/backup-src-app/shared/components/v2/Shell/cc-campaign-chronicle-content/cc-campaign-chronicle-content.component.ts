import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { Cast } from '../../../../models/cast.model';
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
];

@Component({
  selector: 'app-cc-campaign-chronicle-content',
  standalone: true,
  imports: [CcSimpleCastCardComponent],
  templateUrl: './cc-campaign-chronicle-content.component.html',
  styleUrl: './cc-campaign-chronicle-content.component.scss',
})
export class CcCampaignChronicleContentComponent implements OnInit {
  private http = inject(HttpClient);

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
    this.load();
  }

  load() {
    if (!this.campaignId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.http
      .get<CampaignChronicleEntry[]>(
        `${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/feed?limit=200`
      )
      .subscribe({
        next: entries => {
          this.entries.set(entries ?? []);
          this.loading.set(false);
        },
        error: () => {
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

  /**
   * The in-game day and time-of-day the entry was recorded at, as the API captured them from the
   * campaign clock (the cc-day-counter) when the entry was stored. Empty when the campaign keeps no
   * day/night cycle and no days have passed, so the stamp only shows once there is something to say.
   */
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

  asCast(entity: ChronicleLinkedEntity): Cast {
    return {
      id: entity.entityId,
      dmUserId: '',
      name: entity.entityName,
      pronouns: '',
      race: entity.entityRace ?? '',
      role: entity.entityRole ?? '',
      age: '',
      maxHitPoints: 0,
      posture: '',
      speed: '',
      keywords: [],
      voiceNotes: '',
      description: '',
      publicDescription: '',
      imageUrl: entity.entityImageUrl || undefined,
      createdAt: '',
    };
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
