import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CampaignFactionInstance, Faction } from '../../../../models/faction.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { EntityLimitsResponse, StripeService } from '../../../../../core/stripe.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CcSimpleFactionCardComponent } from '../../carddeck/cc-simple-faction-card/cc-simple-faction-card.component';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';
import { CcFactionNewFormComponent } from '../cc-faction-new-form/cc-faction-new-form.component';

type PickerTab = 'library' | 'new';

interface FactionLibraryPage {
  items: Faction[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  libraryCount: number;
}

interface FactionKeywordCount {
  keyword: string;
  count: number;
}

const SEARCH_DEBOUNCE_MS = 250;

@Component({
  selector: 'cc-faction-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent, CcSimpleFactionCardComponent, CcFactionNewFormComponent],
  templateUrl: './cc-faction-picker.component.html',
  styleUrl: './cc-faction-picker.component.scss'
})
export class CcFactionPickerComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private stripe = inject(StripeService);
  private shellSvc = inject(CampaignShellService);
  private hub = inject(CampaignHubService);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();

  readonly activeTab = signal<PickerTab>('library');

  readonly factions = signal<Faction[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  readonly libraryCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly limitReached = signal(false);

  readonly searchTerm = signal('');
  readonly activeKeywords = signal<string[]>([]);
  readonly matchAll = signal(false);
  readonly keywordChips = signal<FactionKeywordCount[]>([]);
  readonly currentPage = signal(1);
  readonly isMobile = signal(window.innerWidth < 768);
  readonly itemsPerPage = computed(() => (this.isMobile() ? 14 : 35));
  readonly hasPrevPage = computed(() => this.currentPage() > 1);
  readonly hasNextPage = computed(() => this.currentPage() < this.totalPages());

  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly busy = signal(false);

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly canAdd = computed(() => this.selectedCount() > 0 && !this.busy());

  private searchTimer = 0;
  private screenSizeListener?: () => void;
  private hubSubscriptions: Subscription[] = [];

  ngOnInit() {
    this.loadPage(1);
    this.loadKeywordChips();
    this.loadEntityLimits();

    this.hubSubscriptions.push(
      this.hub.on('FactionRemoved', 'cc-faction-picker', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.loadPage(this.currentPage());
      })
    );

    this.screenSizeListener = () => {
      const mobile = window.innerWidth < 768;
      if (mobile === this.isMobile()) return;
      this.isMobile.set(mobile);
      this.loadPage(1);
    };
    window.addEventListener('resize', this.screenSizeListener);
  }

  ngOnDestroy() {
    window.clearTimeout(this.searchTimer);
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
    if (this.screenSizeListener) window.removeEventListener('resize', this.screenSizeListener);
  }

  private loadPage(pageNumber: number) {
    this.loading.set(true);
    this.error.set(null);

    const params = this.filterParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', this.itemsPerPage());

    this.http.get<FactionLibraryPage>(
      `${environment.apiUrl}/api/campaign/${this.campaignId()}/factions/library`,
      { params }
    ).subscribe({
      next: page => {
        this.factions.set(page.items);
        this.currentPage.set(page.pageNumber);
        this.totalPages.set(page.totalPages);
        this.totalCount.set(page.totalCount);
        this.libraryCount.set(page.libraryCount);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load your faction library.');
      }
    });
  }

  private loadKeywordChips() {
    this.http.get<FactionKeywordCount[]>(
      `${environment.apiUrl}/api/campaign/${this.campaignId()}/factions/library/keywords`,
      { params: this.filterParams() }
    ).subscribe({
      next: chips => this.keywordChips.set(chips),
      error: () => this.keywordChips.set([]),
    });
  }

  private filterParams(): HttpParams {
    let params = new HttpParams();

    const search = this.searchTerm().trim();
    if (search) params = params.set('searchQuery', search);

    const keywords = this.activeKeywords();
    if (keywords.length) {
      params = params
        .set('keywords', keywords.join(','))
        .set('keywordMode', this.matchAll() ? 'all' : 'any');
    }

    return params;
  }

  private loadEntityLimits() {
    this.stripe.getUserEntityLimits().subscribe({
      next: (limits: EntityLimitsResponse) => this.limitReached.set(limits.factions.limitReached),
      error: () => this.limitReached.set(false)
    });
  }

  setTab(tab: PickerTab) {
    if (tab === 'new' && this.limitReached()) return;
    this.activeTab.set(tab);
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    window.clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => {
      this.loadPage(1);
      this.loadKeywordChips();
    }, SEARCH_DEBOUNCE_MS);
  }

  isKeywordOn(keyword: string): boolean {
    return this.activeKeywords().includes(keyword);
  }

  toggleKeyword(keyword: string) {
    this.activeKeywords.update(current =>
      current.includes(keyword) ? current.filter(k => k !== keyword) : [...current, keyword]);
    this.loadPage(1);
    this.loadKeywordChips();
  }

  toggleMatchAll() {
    this.matchAll.update(all => !all);
    this.loadPage(1);
    this.loadKeywordChips();
  }

  prevPage() {
    if (this.hasPrevPage()) this.loadPage(this.currentPage() - 1);
  }

  nextPage() {
    if (this.hasNextPage()) this.loadPage(this.currentPage() + 1);
  }

  isSelected(factionId: string): boolean {
    return this.selectedIds().has(factionId);
  }

  toggleFaction(faction: Faction) {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(faction.id)) next.delete(faction.id);
      else next.add(faction.id);
      return next;
    });
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  onAdd() {
    const ids = [...this.selectedIds()];
    if (!ids.length || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);

    forkJoin(ids.map(factionId =>
      this.http.post<CampaignFactionInstance>(
        `${environment.apiUrl}/api/campaign/${this.campaignId()}/factions`,
        { factionId }
      ).pipe(catchError(() => of(null)))
    )).subscribe(results => {
      this.busy.set(false);

      const added = ids.filter((_, index) => results[index] !== null);
      if (!added.length) {
        this.error.set('Could not add the factions to this campaign.');
        return;
      }

      this.clearSelection();
      this.publishFactionsChanged();
    });
  }

  onFactionCreated() {
    this.publishFactionsChanged();
  }

  private publishFactionsChanged() {
    this.shellSvc.publishFactionsChanged(this.campaignId());
    this.closeDrawer.emit();
  }
}

