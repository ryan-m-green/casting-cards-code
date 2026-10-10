import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CampaignLocationInstance, Location } from '../../../../models/location.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcSimpleLocationCardComponent } from '../../carddeck/cc-simple-location-card/cc-simple-location-card.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcLocationNewFormComponent } from '../cc-location-new-form/cc-location-new-form.component';

type PickerTab = 'library' | 'new';

interface LocationKeywordChip {
  keyword: string;
  count: number;
}

function keywordVocabulary(index: string[], offered: { keywords?: string[] }[]): string[] {
  const words = new Map<string, string>();
  for (const keyword of index) {
    if (keyword) words.set(keyword.toLowerCase(), keyword);
  }
  for (const card of offered) {
    for (const keyword of card.keywords ?? []) {
      if (keyword) words.set(keyword.toLowerCase(), keyword);
    }
  }
  return [...words.values()];
}

@Component({
  selector: 'cc-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent, CcSimpleLocationCardComponent, CcLocationNewFormComponent],
  templateUrl: './cc-location-picker.component.html',
  styleUrl: './cc-location-picker.component.scss'
})
export class CcLocationPickerComponent implements OnInit {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();

  readonly activeTab = signal<PickerTab>('library');
  readonly loading = signal(false);
  readonly library = signal<Location[]>([]);
  private readonly heldIds = signal<ReadonlySet<string>>(new Set());
  private readonly keywordIndex = signal<string[]>([]);

  readonly search = signal('');
  readonly activeKeywords = signal<string[]>([]);
  readonly matchAll = signal(false);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly canAdd = computed(() => this.selectedCount() > 0 && !this.busy());

  readonly libraryEmpty = computed(() => this.library().length === 0);

  ngOnInit() {
    if (!this.campaignId()) return;
    this.loading.set(true);

    forkJoin({
      library: this.http.get<Location[]>(`${environment.apiUrl}/api/locations`),
      campaign: this.http.get<CampaignLocationInstance[]>(
        `${environment.apiUrl}/api/campaign/${this.campaignId()}/locationinstances`
      ),
      keywords: this.http.get<{ keywords: string[] }>(
        `${environment.apiUrl}/api/campaign-keywords?cardType=location`
      ),
    }).subscribe({
      next: ({ library, campaign, keywords }) => {
        this.library.set(library ?? []);
        this.heldIds.set(new Set((campaign ?? []).map(instance => instance.sourceLocationId)));
        this.keywordIndex.set(keywords?.keywords ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load your location library.');
      },
    });
  }

  private readonly offered = computed<Location[]>(() => {
    const held = this.heldIds();
    const term = this.search().trim().toLowerCase();

    return this.library()
      .filter(location => !held.has(location.id))
      .filter(location => !term || this.matches(location, term));
  });

  readonly candidates = computed<Location[]>(() =>
    this.withKeywords(this.offered()).sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly keywordChips = computed<LocationKeywordChip[]>(() => {
    const offered = this.offered();

    return keywordVocabulary(this.keywordIndex(), offered)
      .map(keyword => ({
        keyword,
        count: this.withKeywords(offered, [...this.activeKeywords(), keyword]).length,
      }))
      .sort((a, b) => a.keyword.localeCompare(b.keyword));
  });

  setTab(tab: PickerTab) {
    this.activeTab.set(tab);
    this.error.set(null);
  }

  isSelected(locationId: string): boolean {
    return this.selectedIds().has(locationId);
  }

  toggleLocation(location: Location) {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(location.id)) next.delete(location.id);
      else next.add(location.id);
      return next;
    });
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  onSearchChange(term: string) {
    this.search.set(term);
  }

  isKeywordOn(keyword: string): boolean {
    return this.activeKeywords().includes(keyword);
  }

  toggleKeyword(keyword: string) {
    this.activeKeywords.update(current =>
      current.includes(keyword) ? current.filter(k => k !== keyword) : [...current, keyword]);
  }

  toggleMatchAll() {
    this.matchAll.update(all => !all);
  }

  onAdd() {
    const ids = [...this.selectedIds()];
    if (!ids.length || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);

    forkJoin(ids.map(locationId =>
      this.http.post<CampaignLocationInstance>(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations`,
        { locationId }
      ).pipe(
        map(() => true),
        catchError(() => of(false))
      )
    )).subscribe(results => {
      this.busy.set(false);

      const added = ids.filter((_, index) => results[index]);
      if (!added.length) {
        this.error.set('Could not add the locations to this campaign.');
        return;
      }

      this.clearSelection();
      this.publishCardsChanged();
    });
  }

  onLocationCreated() {
    this.publishCardsChanged();
  }

  private publishCardsChanged() {
    this.shellSvc.publishCardsChanged(this.campaignId());
    this.closeDrawer.emit();
  }

  private matches(location: Location, term: string): boolean {
    return location.name.toLowerCase().includes(term)
      || (location.classification ?? '').toLowerCase().includes(term)
      || (location.description ?? '').toLowerCase().includes(term)
      || (location.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
  }

  private withKeywords(
    cards: Location[],
    keywords: readonly string[] = this.activeKeywords()
  ): Location[] {
    if (!keywords.length) return cards;

    const wanted = keywords.map(keyword => keyword.toLowerCase());
    const matchAll = this.matchAll();

    return cards.filter(location => {
      const carried = (location.keywords ?? []).map(keyword => keyword.toLowerCase());
      return matchAll
        ? wanted.every(keyword => carried.includes(keyword))
        : wanted.some(keyword => carried.includes(keyword));
    });
  }
}

