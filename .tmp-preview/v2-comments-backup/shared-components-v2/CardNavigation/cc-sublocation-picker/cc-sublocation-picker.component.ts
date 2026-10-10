import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CampaignSublocationInstance, Sublocation } from '../../../../models/sublocation.model';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { CcSimpleSublocationCardComponent } from '../../carddeck/cc-simple-sublocation-card/cc-simple-sublocation-card.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcSublocationNewFormComponent } from '../cc-sublocation-new-form/cc-sublocation-new-form.component';

/** The picker's two faces: pick from the library, or build a new sublocation. */
type PickerTab = 'library' | 'new';

/** A keyword the DM's sublocation cards carry, and how many the cards on offer would leave. */
interface SublocationKeywordChip {
  keyword: string;
  count: number;
}

/**
 * The filter buttons' vocabulary: the DM's own hashtags for this card type, with the offered
 * cards' own spellings laid over the top (a card's `Tavern` beats the index's normalised
 * `tavern`), matched without regard to case. The index is what makes the buttons stand even
 * when the library cards on offer happen to carry no hashtags of their own — they are the DM's
 * words for sublocations, not only the words of one screenful.
 */
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

/**
 * cc-sublocation-picker
 *
 * Drawer content for the realm row's ＋ under a location card. Two tabs, as the faction
 * picker's are:
 *
 *  - `library` the DM's own sublocation library as simple sublocation cards (`GET
 *              api/sublocations`), narrowed by a search box and by keyword chips read off the
 *              cards themselves. Cards are picked one after another into a set (clicking again
 *              takes one back out) and "Add" writes every pick under the location the ＋ stood
 *              on at once — one `POST api/campaigns/{id}/sublocations` per card, each carrying
 *              that location instance.
 *  - `new`     the sublocation form (`cc-sublocation-new-form`), which creates the sublocation
 *              in the library and adds it under the same location in one go.
 *
 * The library leaves out the sublocations this campaign already holds (the server refuses one
 * twice — a campaign instance is keyed by the sublocation it was made from), so the drawer only
 * ever offers what can still be added. Either tab's success raises `cardsChanged` on the shell
 * service, so the campaign and the realm row behind the drawer both pick the new card up, then
 * asks for the drawer to be closed.
 */
@Component({
  selector: 'cc-sublocation-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent, CcSimpleSublocationCardComponent, CcSublocationNewFormComponent],
  templateUrl: './cc-sublocation-picker.component.html',
  styleUrl: './cc-sublocation-picker.component.scss'
})
export class CcSublocationPickerComponent implements OnInit {
  private http = inject(HttpClient);
  private shellSvc = inject(V2CampaignShellService);

  /** Campaign the picks are added to, and the location instance they go under. */
  readonly campaignId = input.required<string>();
  readonly locationInstanceId = input.required<string>();
  /** The location's name, for the drawer's own section line. */
  readonly locationName = input('');
  readonly portalColor = input<string>('#6e28d0');

  /** The drawer's work is done; the shell closes it. */
  readonly closeDrawer = output<void>();

  /** The tab on show, and the library it draws. */
  readonly activeTab = signal<PickerTab>('library');
  readonly loading = signal(false);
  readonly library = signal<Sublocation[]>([]);
  /** The library sublocations this campaign already holds (by their library id). */
  private readonly heldIds = signal<ReadonlySet<string>>(new Set());
  /** The DM's own hashtags for sublocation cards, as the filter buttons' vocabulary. */
  private readonly keywordIndex = signal<string[]>([]);

  // ── Filter + picks ────────────────────────────────────────────────────────
  readonly search = signal('');
  /** The keywords that are on, and whether a card has to carry all of them. */
  readonly activeKeywords = signal<string[]>([]);
  readonly matchAll = signal(false);
  /** By id, so a pick stays picked while the list narrows under it. */
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly canAdd = computed(() => this.selectedCount() > 0 && !this.busy());

  /** True when the DM's sublocation library is empty — there is nothing to offer at all. */
  readonly libraryEmpty = computed(() => this.library().length === 0);


  /**
   * The DM's sublocation library, the sublocations this campaign already holds, and the DM's own
   * hashtag vocabulary for sublocation cards — read together, because what the drawer offers is
   * the difference between the first two, and what its filter buttons are made of is the third
   * laid over the first. The campaign's own instances name the library sublocation they were made
   * from (`sourceSublocationId`), which is what the held set is keyed by.
   */
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

  /**
   * The library's sublocations this campaign does not hold, narrowed by the search box: the pool
   * the keyword chips are read off, and the set the keyword filters narrow.
   */
  private readonly offered = computed<Sublocation[]>(() => {
    const held = this.heldIds();
    const term = this.search().trim().toLowerCase();

    return this.library()
      .filter(sublocation => !held.has(sublocation.id))
      .filter(sublocation => !term || this.matches(sublocation, term));
  });

  /** The cards on offer, name-first, carrying the keywords that are on. */
  readonly candidates = computed<Sublocation[]>(() =>
    this.withKeywords(this.offered()).sort((a, b) => a.name.localeCompare(b.name))
  );

  /**
   * The filter buttons: the DM's own hashtags for sublocation cards (`keywordIndex`), with any
   * hashtag the cards on offer carry that the index has not caught up with laid over the top.
   * Each button says how many of the cards on offer it would leave, so a word nothing on offer
   * carries stands dimmed (the `--empty` dress) rather than disappearing — which is what makes
   * the row keep its shape as the list narrows. Kept in keyword order so the buttons hold still
   * under the pointer.
   */
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

  // ── Keyword filters ──────────────────────────────────────────────────────
  isKeywordOn(keyword: string): boolean {
    return this.activeKeywords().includes(keyword);
  }

  /** Picking a chip narrows the list to that keyword; picking it again takes it back off. */
  toggleKeyword(keyword: string) {
    this.activeKeywords.update(current =>
      current.includes(keyword) ? current.filter(k => k !== keyword) : [...current, keyword]);
  }

  /** With more than one chip on: whether a card has to carry all of them or any one of them. */
  toggleMatchAll() {
    this.matchAll.update(all => !all);
  }


  /**
   * Adds every picked sublocation under the location the drawer's ＋ stood on, in one go. A pick
   * that fails is reported but does not hold the others back, and the drawer only closes when at
   * least one card landed.
   *
   * The write answers with the new campaign instance, but a pick that landed must not be read
   * off the body: each call is mapped to a plain true/false, so a body that could not be read
   * cannot make a landed card look like a failed one.
   */
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

  /** The form finished: the sublocation is in the library and in the campaign. */
  onSublocationCreated() {
    this.publishCardsChanged();
  }

  /** Tells the shell (and the realm row behind the drawer) that the campaign changed. */
  private publishCardsChanged() {
    this.shellSvc.publishCardsChanged(this.campaignId());
    this.closeDrawer.emit();
  }

  private matches(sublocation: Sublocation, term: string): boolean {
    return sublocation.name.toLowerCase().includes(term)
      || (sublocation.description ?? '').toLowerCase().includes(term)
      || (sublocation.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
  }

  /**
   * The cards carrying the keywords that are on — every one of them, or any one of them, as the
   * "any"/"all" button beside the search box says. Keywords are matched without regard to case,
   * as the other pickers match them. With the chips off the cards are passed through.
   */
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
