import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface ChronicleLinkedEntity {
  entityType: string;
  entityId: string;
  entityName: string;
}

/** One entry of the v2 standalone chronicle feed (GET .../chronicles/feed). */
export interface CampaignChronicleEntry {
  id: string;
  campaignId: string;
  /** 'scene' | 'handout' | 'player-note' | 'secret' | 'coin-reward' | 'shop-purchase' */
  contentType: string;
  sourceId: string | null;
  title: string;
  body: string;
  sortOrder: number;
  linkedEntities?: ChronicleLinkedEntity[];
  filePath: string;
  imageUrl?: string | null;
  todSliceName: string;
  isGmOnly: boolean;
  playedOn: string;
  sessionNumber: number | null;
  archivedAt: string;
  createdAt: string;
  updatedAt: string;
  keywords?: string[];
}

/** Entries bucketed under the day they were created (no sessions in v2). */
export interface ChronicleDayGroup {
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

/**
 * v2 campaign chronicle drawer content. Reads the standalone chronicle feed and
 * groups it by the day each entry was created - there is no session concept here.
 * Search and type filtering are handled locally by this component.
 */
@Component({
  selector: 'app-cc-campaign-chronicle-content',
  standalone: true,
  imports: [],
  templateUrl: './cc-campaign-chronicle-content.component.html',
  styleUrl: './cc-campaign-chronicle-content.component.scss',
})
export class CcCampaignChronicleContentComponent implements OnInit {
  private http = inject(HttpClient);

  @Input() campaignId = '';
  @Input() portalColor = '#6e28d0';
  @Input() isDmMode = false;

  readonly types = CHRONICLE_TYPES;

  loading = signal(true);
  error = signal('');
  entries = signal<CampaignChronicleEntry[]>([]);

  searchQuery = signal('');
  activeTypes = signal<string[]>([]);

  /** Only the types actually present in the feed, with counts for the chips. */
  typeCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this.entries()) {
      counts.set(entry.contentType, (counts.get(entry.contentType) ?? 0) + 1);
    }
    return this.types
      .filter(type => counts.has(type.value))
      .map(type => ({ ...type, count: counts.get(type.value) ?? 0 }));
  });

  filtered = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const types = this.activeTypes();

    return this.entries().filter(entry => {
      if (types.length && !types.includes(entry.contentType)) return false;
      if (!query) return true;

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
    });
  });

  resultCount = computed(() => this.filtered().length);

  /** Newest day first, newest entry first within each day. */
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

  // ── Filters ────────────────────────────────────────────────────────────────

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

  clearFilters() {
    this.activeTypes.set([]);
    this.searchQuery.set('');
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  typeMeta(value: string): ChronicleTypeMeta {
    return this.types.find(type => type.value === value)
      ?? { value, label: value, icon: '/storyline.svg' };
  }

  /** Handout art only renders once the feed hands back a public URL. */
  imageFor(entry: CampaignChronicleEntry): string | null {
    const imageUrl = entry.imageUrl ?? '';
    if (imageUrl) return imageUrl;

    const filePath = entry.filePath ?? '';
    return /^https?:\/\//i.test(filePath) ? filePath : null;
  }

  /**
   * Linked entities to show under an entry. The archive handler adds a fallback
   * participant typed with the entry's own content type when nothing else was
   * linked, which just repeats the type badge at the top - those are dropped here.
   */
  displayEntities(entry: CampaignChronicleEntry): ChronicleLinkedEntity[] {
    return (entry.linkedEntities ?? []).filter(entity => entity.entityType !== entry.contentType);
  }

  /**
   * Bolds every occurrence of the current search term in a rendered chunk so the
   * match that made an entry relevant is visible. Text is HTML-escaped first so
   * entry content can never inject markup through [innerHTML].
   */
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
