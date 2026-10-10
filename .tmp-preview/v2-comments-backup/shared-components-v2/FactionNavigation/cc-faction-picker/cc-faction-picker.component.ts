import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CampaignFactionInstance, Faction } from '../../../../models/faction.model';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { EntityLimitsResponse, StripeService } from '../../../../../core/stripe.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CcSimpleFactionCardComponent } from '../../carddeck/cc-simple-faction-card/cc-simple-faction-card.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcFactionNewFormComponent } from '../cc-faction-new-form/cc-faction-new-form.component';

/** The picker's two faces: pick from the library, or build a new faction. */
type PickerTab = 'library' | 'new';

/** One page of the campaign's faction library, as the server draws it. */
interface FactionLibraryPage {
  items: Faction[];
  pageNumber: number;
  pageSize: number;
  /** How many library factions match the current filter. */
  totalCount: number;
  totalPages: number;
  /** The DM's whole faction library, added or not. */
  libraryCount: number;
}

/** A keyword the filtered factions carry, and how many of them carry it (a chip). */
interface FactionKeywordCount {
  keyword: string;
  count: number;
}

/** How long typing settles before the server is asked for the next page. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * cc-faction-picker
 *
 * Drawer content for filling the campaign's faction row. Two tabs:
 *
 *  - `library` one page of the DM's faction library as simple faction cards. The server pages
 *              it (`GET api/campaign/{id}/factions/library`): it leaves out the factions the
 *              campaign already holds, narrows by free text against the name or the type, and
 *              hands back one page with its counts — so the drawer never pulls the whole
 *              library down. Cards are picked one after another into a set (clicking again
 *              takes one back out) and "Add" writes every pick into the campaign at once;
 *              picks are held by id, so they survive turning the page.
 *  - `new`     the faction form (`cc-faction-new-form`), which creates the faction in
 *              the library and adds it to the campaign in one go.
 *
 * Either tab's success raises `factionsChanged` on the shell service, so the campaign
 * and the faction row behind the drawer both pick the new card up, then asks for the
 * drawer to be closed.
 */
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
  private shellSvc = inject(V2CampaignShellService);
  private hub = inject(CampaignHubService);

  /** Campaign the picks are added to. */
  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  /** The drawer's work is done; the shell closes it. */
  readonly closeDrawer = output<void>();

  // ── Faces ────────────────────────────────────────────────────────────────
  readonly activeTab = signal<PickerTab>('library');

  // ── The page the server drew ─────────────────────────────────────────────
  /** The cards on this page, as the server chose them. */
  readonly factions = signal<Faction[]>([]);
  /** How many factions match the current filter (all pages of them). */
  readonly totalCount = signal(0);
  readonly totalPages = signal(0);
  /** The DM's whole faction library, added or not, so the empty states can tell themselves apart. */
  readonly libraryCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** True when the account has no room left for another library faction. */
  readonly limitReached = signal(false);

  // ── Filter + paging ──────────────────────────────────────────────────────
  readonly searchTerm = signal('');
  /** The keywords the DM has picked off the chip row, and how they are matched. */
  readonly activeKeywords = signal<string[]>([]);
  readonly matchAll = signal(false);
  /** The chips themselves: the keywords the factions in the current filter carry, with counts. */
  readonly keywordChips = signal<FactionKeywordCount[]>([]);
  readonly currentPage = signal(1);
  readonly isMobile = signal(window.innerWidth < 768);
  readonly itemsPerPage = computed(() => (this.isMobile() ? 14 : 35));
  readonly hasPrevPage = computed(() => this.currentPage() > 1);
  readonly hasNextPage = computed(() => this.currentPage() < this.totalPages());

  // ── Picks ────────────────────────────────────────────────────────────────
  /** By id, so a pick stays picked as the pages turn under it. */
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

    /*
     * A faction taken out of the campaign becomes available to add again, so the page the DM is
     * on is re-read when the hub says one has gone: the card joins the grid and the counts move
     * under it. This is what keeps a drawer that is already open honest when the deletion came
     * from somewhere else — another DM's screen, the campaign's own page, or the faction card's
     * delete button behind this drawer.
     */
    this.hubSubscriptions.push(
      this.hub.factionRemoved$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.loadPage(this.currentPage());
      })
    );

    // Crossing the phone/desktop line changes how many cards fit a page, so the first page is
    // asked for again at the new size rather than leaving the DM on a page that no longer lines
    // up with the paging the server just did.
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

  /**
   * Asks the server for one page of the library as this campaign can still use it. The
   * filtering, the leaving-out of the campaign's own factions and the paging all happen
   * server-side, so only the cards on screen are ever fetched.
   */
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

  /**
   * The chip row: the keywords the factions in the current filter carry, each with how many of
   * them carry it, refreshed with the filter so the chips always describe what the grid holds.
   */
  private loadKeywordChips() {
    this.http.get<FactionKeywordCount[]>(
      `${environment.apiUrl}/api/campaign/${this.campaignId()}/factions/library/keywords`,
      { params: this.filterParams() }
    ).subscribe({
      next: chips => this.keywordChips.set(chips),
      error: () => this.keywordChips.set([]),
    });
  }

  /** The picker's filter as the server reads it: free text, then the keywords and their mode. */
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

  /**
   * Typing settles before the server is asked, so a search is one request rather than one per
   * keystroke, and the search always starts from the first page. The chips are refreshed with it,
   * since the words narrow which keywords are left in play.
   */
  onSearchChange(term: string) {
    this.searchTerm.set(term);
    window.clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => {
      this.loadPage(1);
      this.loadKeywordChips();
    }, SEARCH_DEBOUNCE_MS);
  }

  // ── Keyword chips ────────────────────────────────────────────────────────
  isKeywordOn(keyword: string): boolean {
    return this.activeKeywords().includes(keyword);
  }

  /** Picking a chip narrows the list to that keyword; picking it again takes it back off. */
  toggleKeyword(keyword: string) {
    this.activeKeywords.update(current =>
      current.includes(keyword) ? current.filter(k => k !== keyword) : [...current, keyword]);
    this.loadPage(1);
    this.loadKeywordChips();
  }

  /** With more than one chip on: whether the list takes factions carrying all of them or any. */
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

  // ── Picking ──────────────────────────────────────────────────────────────
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

  /**
   * Adds every picked faction to the campaign in one go. A pick that fails is reported
   * but does not hold the others back, and the drawer only closes when at least one
   * faction landed.
   */
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

  /** The form finished: the faction is in the library and in the campaign. */
  onFactionCreated() {
    this.publishFactionsChanged();
  }

  /** Tells the shell (and the faction row behind the drawer) that the campaign changed. */
  private publishFactionsChanged() {
    this.shellSvc.publishFactionsChanged(this.campaignId());
    this.closeDrawer.emit();
  }
}

