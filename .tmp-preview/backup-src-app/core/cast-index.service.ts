import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** One tile of the paged cast index (light projection — no descriptions). */
export interface CastIndexItem {
  id: string;
  name: string;
  role: string;
  race: string;
  keywords: string[];
  imageUrl: string;
}

/** One set of the cast index (25 cards by default). */
export interface CastIndexPage {
  items: CastIndexItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** A keyword with how many casts currently carry it. */
export interface CastKeywordCount {
  keyword: string;
  count: number;
}

/** The filter the picker is currently browsing. */
export interface CastIndexFilter {
  search: string;
  keywords: string[];
  matchAll: boolean;
}

/** Cards fetched per "Next set". */
export const CAST_INDEX_SET_SIZE = 25;

/**
 * Paged cast-library index for the encounter builder picker.
 *
 * The library is browsed a set at a time (25 cards), filtered by free text
 * and/or keywords, so the picker never loads or renders the whole library.
 * Sets already fetched for a filter are cached, and loaded sets accumulate in
 * `items` — "Next set" appends the following set rather than replacing what the
 * DM has already looked at.
 */
@Injectable({ providedIn: 'root' })
export class CastIndexService {
  private http = inject(HttpClient);

  /** Every card loaded so far for the current filter, in set order. */
  readonly items = signal<CastIndexItem[]>([]);

  /** Keyword chips for the current filter (with counts). */
  readonly keywords = signal<CastKeywordCount[]>([]);

  /** Number of the highest set loaded (0 = none yet). */
  readonly lastSetLoaded = signal(0);

  /** Total sets available for the current filter. */
  readonly totalSets = signal(0);

  /** Total matching casts for the current filter. */
  readonly totalCount = signal(0);

  readonly loading = signal(false);
  readonly error = signal('');

  private filter: CastIndexFilter = { search: '', keywords: [], matchAll: false };
  private readonly pageCache = new Map<string, CastIndexPage>();
  private inflight = false;

  /** True while another set is available to fetch. */
  canLoadNextSet(): boolean {
    return !this.loading() && !this.inflight && this.lastSetLoaded() < this.totalSets();
  }

  /**
   * Starts browsing a new filter: clears the loaded sets, fetches set 1 and
   * refreshes the keyword chips.
   */
  reset(filter: CastIndexFilter): void {
    this.filter = { search: filter.search.trim(), keywords: [...filter.keywords], matchAll: filter.matchAll };
    this.items.set([]);
    this.lastSetLoaded.set(0);
    this.totalSets.set(0);
    this.totalCount.set(0);
    this.error.set('');
    this.loadSet(1, true);
    this.loadKeywordCounts();
  }

  /** Loads the next set and appends it to `items` ("Next set"). */
  loadNextSet(): void {
    if (!this.canLoadNextSet()) return;
    this.loadSet(this.lastSetLoaded() + 1, false);
  }

  private loadSet(pageNumber: number, replace: boolean): void {
    const key = this.cacheKey(pageNumber);
    const cached = this.pageCache.get(key);
    if (cached) {
      this.applyPage(cached, replace);
      return;
    }

    if (this.inflight) return;
    this.inflight = true;
    this.loading.set(true);

    this.http.get<CastIndexPage>(`${environment.apiUrl}/api/cast/index`, { params: this.params(pageNumber) })
      .subscribe({
        next: page => {
          this.pageCache.set(key, page);
          this.applyPage(page, replace);
          this.inflight = false;
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load the cast library.');
          this.inflight = false;
          this.loading.set(false);
        },
      });
  }

  private applyPage(page: CastIndexPage, replace: boolean): void {
    this.items.update(current => replace
      ? [...page.items]
      // Later sets append; a re-fetched set replaces its own slice so the order stays stable.
      : this.mergeSet(current, page));

    this.lastSetLoaded.update(last => Math.max(last, page.pageNumber));
    this.totalSets.set(page.totalPages);
    this.totalCount.set(page.totalCount);
  }

  /** Keeps loaded sets in page order, replacing the slice for this set. */
  private mergeSet(current: CastIndexItem[], page: CastIndexPage): CastIndexItem[] {
    const committed = this.pageCache.get(this.cacheKey(page.pageNumber));
    const setCount = committed?.items.length ?? page.items.length;
    const head = (page.pageNumber - 1) * (page.pageSize || setCount);
    return [...current.slice(0, head), ...page.items, ...current.slice(head + setCount)];
  }

  private params(pageNumber: number): HttpParams {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', CAST_INDEX_SET_SIZE);

    if (this.filter.search) params = params.set('searchQuery', this.filter.search);
    if (this.filter.keywords.length) {
      params = params
        .set('keywords', this.filter.keywords.join(','))
        .set('keywordMode', this.filter.matchAll ? 'all' : 'any');
    }
    return params;
  }

  private loadKeywordCounts(): void {
    this.http.get<CastKeywordCount[]>(`${environment.apiUrl}/api/cast/keywords`, { params: this.params(1) })
      .subscribe({
        next: counts => this.keywords.set(counts),
        error: () => this.keywords.set([]),
      });
  }

  private cacheKey(pageNumber: number): string {
    const { search, keywords, matchAll } = this.filter;
    return `${search}|${[...keywords].sort().join(',')}|${matchAll}|${pageNumber}`;
  }
}
