import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CampaignCastInstance, Cast } from '../../../../models/cast.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcCastNewFormComponent } from '../cc-cast-new-form/cc-cast-new-form.component';

type PickerTab = 'library' | 'new';

interface CastKeywordChip {
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
  selector: 'cc-cast-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent, CcSimpleCastCardComponent, CcCastNewFormComponent],
  templateUrl: './cc-cast-picker.component.html',
  styleUrl: './cc-cast-picker.component.scss'
})
export class CcCastPickerComponent implements OnInit {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);

  readonly campaignId = input.required<string>();
  readonly locationInstanceId = input.required<string>();
  readonly sublocationInstanceId = input.required<string>();
  readonly sublocationName = input('');
  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();

  readonly activeTab = signal<PickerTab>('library');
  readonly loading = signal(false);
  readonly library = signal<Cast[]>([]);
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
      library: this.http.get<Cast[]>(`${environment.apiUrl}/api/cast`),
      campaign: this.http.get<CampaignCastInstance[]>(
        `${environment.apiUrl}/api/campaign/${this.campaignId()}/castinstances`
      ),
      keywords: this.http.get<{ keywords: string[] }>(
        `${environment.apiUrl}/api/campaign-keywords?cardType=cast`
      ),
    }).subscribe({
      next: ({ library, campaign, keywords }) => {
        this.library.set(library ?? []);
        this.heldIds.set(new Set((campaign ?? []).map(instance => instance.sourceCastId)));
        this.keywordIndex.set(keywords?.keywords ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load your cast library.');
      },
    });
  }

  private readonly offered = computed<Cast[]>(() => {
    const held = this.heldIds();
    const term = this.search().trim().toLowerCase();

    return this.library()
      .filter(cast => !held.has(cast.id))
      .filter(cast => !term || this.matches(cast, term));
  });

  readonly candidates = computed<Cast[]>(() =>
    this.withKeywords(this.offered()).sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly keywordChips = computed<CastKeywordChip[]>(() => {
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

  isSelected(castId: string): boolean {
    return this.selectedIds().has(castId);
  }

  toggleCast(cast: Cast) {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(cast.id)) next.delete(cast.id);
      else next.add(cast.id);
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

    forkJoin(ids.map(castId =>
      this.http.post<CampaignCastInstance>(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts`,
        {
          castId,
          locationInstanceId: this.locationInstanceId(),
          sublocationInstanceId: this.sublocationInstanceId(),
        }
      ).pipe(
        map(() => true),
        catchError(() => of(false))
      )
    )).subscribe(results => {
      this.busy.set(false);

      const added = ids.filter((_, index) => results[index]);
      if (!added.length) {
        this.error.set(`Could not add the cast to ${this.sublocationName() || 'this sublocation'}.`);
        return;
      }

      this.clearSelection();
      this.publishCardsChanged();
    });
  }

  onCastCreated() {
    this.publishCardsChanged();
  }

  private publishCardsChanged() {
    this.shellSvc.publishCardsChanged(this.campaignId());
    this.closeDrawer.emit();
  }

  private matches(cast: Cast, term: string): boolean {
    return cast.name.toLowerCase().includes(term)
      || (cast.role ?? '').toLowerCase().includes(term)
      || (cast.race ?? '').toLowerCase().includes(term)
      || (cast.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
  }

  private withKeywords(
    cards: Cast[],
    keywords: readonly string[] = this.activeKeywords()
  ): Cast[] {
    if (!keywords.length) return cards;

    const wanted = keywords.map(keyword => keyword.toLowerCase());
    const matchAll = this.matchAll();

    return cards.filter(cast => {
      const carried = (cast.keywords ?? []).map(keyword => keyword.toLowerCase());
      return matchAll
        ? wanted.every(keyword => carried.includes(keyword))
        : wanted.some(keyword => carried.includes(keyword));
    });
  }
}
