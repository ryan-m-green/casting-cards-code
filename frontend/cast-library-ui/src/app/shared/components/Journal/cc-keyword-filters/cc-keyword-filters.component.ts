import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { KeywordListService } from '../../../../core/keyword-list.service';

/** Anything the bar can be built from: the library cards all carry their keywords. */
export interface KeywordedCard {
  readonly keywords?: readonly string[];
}

/**
 * The keywords a library offers, drawn as filter buttons — a chip per keyword, pressed to narrow the
 * page to the cards wearing it.
 *
 * The chips come from two places, because a keyword of the collection can live in either: the list
 * the DM keeps for the card type (the keyword manager's list, which a card need not wear yet) and
 * the keywords the cards themselves carry. Whatever the page has loaded is what the bar can offer,
 * so a chip is only ever drawn for something that exists, and a fresh library — no list, no
 * keywords on its cards — is left with no bar at all.
 */
@Component({
  selector: 'cc-keyword-filters',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-keyword-filters.component.html',
  styleUrl: './cc-keyword-filters.component.scss',
})
export class CcKeywordFiltersComponent implements OnInit {
  /** The card type whose keyword list the bar offers, as the page's keyword manager names it. */
  readonly cardType = input('');

  /** The cards the chips are made from — the whole collection, not just what the page is showing. */
  readonly cards = input<readonly KeywordedCard[]>([]);

  /** What the row of chips answers to, for a reader that cannot see the cards behind them. */
  readonly label = input('Filter by keyword');

  /** The keywords that are on, in the order they were pressed, as the page asked to be told. */
  readonly selectedChange = output<string[]>();

  private readonly keywordList = inject(KeywordListService);

  /** The DM's list for this card type — the same list the keyword manager curates beside the bar. */
  private readonly listed = computed(() => this.cardType() ? this.keywordList.list(this.cardType())() : []);

  /**
   * Every keyword the collection knows, once each — the list's spelling wins over a card's — in an
   * order the eye can scan.
   */
  readonly keywords = computed(() => {
    const seen = new Map<string, string>();

    const keep = (raw: string) => {
      const keyword = (raw ?? '').trim();
      if (keyword && !seen.has(keyword.toLowerCase())) seen.set(keyword.toLowerCase(), keyword);
    };

    for (const keyword of this.listed()) keep(keyword);
    for (const card of this.cards()) for (const keyword of card.keywords ?? []) keep(keyword);

    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  });

  /** The keywords this bar has pressed. The bar keeps them; the page is told what they are. */
  readonly selected = signal<readonly string[]>([]);

  constructor() {
    /*
     * A keyword the collection no longer has — taken off the manager's list and off every card that
     * wore it — is no longer a chip, so it is no longer a filter either. The selection is kept to
     * what the bar shows, and the page is told, so a filter that has nothing left to narrow the page
     * to cannot outlive the chip it was pressed on.
     */
    effect(() => {
      const known = new Set(this.keywords().map(k => k.toLowerCase()));
      const kept = this.selected().filter(k => known.has(k.toLowerCase()));

      if (kept.length !== this.selected().length) {
        this.selected.set(kept);
        this.selectedChange.emit([...kept]);
      }
    });
  }

  ngOnInit() {
    /* Fetches the DM's list the first time the bar is drawn; the cards came with the page. */
    this.keywordList.load(this.cardType());
  }

  isSelected(keyword: string): boolean {
    return this.selected().some(k => k.toLowerCase() === keyword.toLowerCase());
  }

  toggle(keyword: string): void {
    const next = this.isSelected(keyword)
      ? this.selected().filter(k => k.toLowerCase() !== keyword.toLowerCase())
      : [...this.selected(), keyword];

    this.selected.set(next);
    this.selectedChange.emit([...next]);
  }
}
