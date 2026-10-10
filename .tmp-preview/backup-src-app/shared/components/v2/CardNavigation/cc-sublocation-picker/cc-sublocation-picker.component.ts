import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CampaignSublocationInstance, Sublocation } from '../../../../models/sublocation.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcSimpleSublocationCardComponent } from '../../carddeck/cc-simple-sublocation-card/cc-simple-sublocation-card.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcSublocationNewFormComponent } from '../cc-sublocation-new-form/cc-sublocation-new-form.component';

type PickerTab = 'library' | 'new';

interface SublocationKeywordChip {
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
  selector: 'cc-sublocation-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent, CcSimpleSublocationCardComponent, CcSublocationNewFormComponent],
  templateUrl: './cc-sublocation-picker.component.html',
  styleUrl: './cc-sublocation-picker.component.scss'
})
export class CcSublocationPickerComponent implements OnInit {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);

  readonly campaignId = input.required<string>();
  readonly locationInstanceId = input.required<string>();
  readonly locationName = input('');
  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();

  readonly activeTab = signal<PickerTab>('library');
  readonly loading = signal(false);
  readonly library = signal<Sublocation[]>([]);
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
      library: this.http.get<Sublocation[]>(`${environment.apiUrl}/api/sublocations`),
      campaign: this.http.get<CampaignSublocationInstance[]>(
        `${environment.apiUrl}/api/campaign/${this.campaignId()}/sublocationinstances`
      ),
      keywords: this.http.get<{ keywords: string[] }>(
        `${environment.apiUrl}/api/campaign-keywords?cardType=sublocation`
      ),
    }).subscribe({
      next: ({ library, campaign, keywords }) => {
        this.library.set(library ?? []);
        this.heldIds.set(new Set((campaign ?? []).map(instance => instance.sourceSublocationId)));
        this.keywordIndex.set(keywords?.keywords ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load your sublocation library.');
      },
    });
  }

  private readonly offered = computed<Sublocation[]>(() => {
    const held = this.heldIds();
    const term = this.search().trim().toLowerCase();

    return this.library()
      .filter(sublocation => !held.has(sublocation.id))
      .filter(sublocation => !term || this.matches(sublocation, term));
  });

  readonly candidates = computed<Sublocation[]>(() =>
    this.withKeywords(this.offered()).sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly keywordChips = computed<SublocationKeywordChip[]>(() => {
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

  isSelected(sublocationId: string): boolean {
    return this.selectedIds().has(sublocationId);
  }

  toggleSublocation(sublocation: Sublocation) {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(sublocation.id)) next.delete(sublocation.id);
      else next.add(sublocation.id);
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

    forkJoin(ids.map(sublocationId =>
      this.http.post<CampaignSublocationInstance>(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations`,
        { sublocationId, locationInstanceId: this.locationInstanceId() }
      ).pipe(
        map(() => true),
        catchError(() => of(false))
      )
    )).subscribe(results => {
      this.busy.set(false);

      const added = ids.filter((_, index) => results[index]);
      if (!added.length) {
        this.error.set(`Could not add the sublocations to ${this.locationName() || 'this location'}.`);
        return;
      }

      this.clearSelection();
      this.publishCardsChanged();
    });
  }

  onSublocationCreated() {
    this.publishCardsChanged();
  }

  private publishCardsChanged() {
    this.shellSvc.publishCardsChanged(this.campaignId());
    this.closeDrawer.emit();
  }

  private matches(sublocation: Sublocation, term: string): boolean {
    return sublocation.name.toLowerCase().includes(term)
      || (sublocation.description ?? '').toLowerCase().includes(term)
      || (sublocation.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
  }

  private withKeywords(
    cards: Sublocation[],
    keywords: readonly string[] = this.activeKeywords()
  ): Sublocation[] {
    if (!keywords.length) return cards;

    const wanted = keywords.map(keyword => keyword.toLowerCase());
    const matchAll = this.matchAll();

    return cards.filter(sublocation => {
      const carried = (sublocation.keywords ?? []).map(keyword => keyword.toLowerCase());
      return matchAll
        ? wanted.every(keyword => carried.includes(keyword))
        : wanted.some(keyword => carried.includes(keyword));
    });
  }
}
