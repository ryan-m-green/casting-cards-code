import { Injectable, computed, inject, signal, type Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * The keyword list the DM keeps for a card type.
 *
 * This is the list the keyword manager curates, and the list a library's keyword bar filters by —
 * one list per card type, fetched once and shared, so the manager and the bar cannot disagree about
 * what the keywords are: adding or removing one in the manager moves the bar's chips with it.
 *
 * A card need not carry a keyword from this list to wear it (the card forms let one be typed), which
 * is why readers pair this with the cards' own keywords rather than taking it for the whole story —
 * see cc-keyword-filters.
 */
@Injectable({ providedIn: 'root' })
export class KeywordListService {
  private readonly http = inject(HttpClient);

  /** What each card type's list holds, as one map so every reader sees the same edits. */
  private readonly lists = signal<ReadonlyMap<string, readonly string[]>>(new Map());

  /** The view of a card type's list, made once per card type and kept. */
  private readonly views = new Map<string, Signal<string[]>>();

  /** The card types whose list has been asked for, so the fetch happens once. */
  private readonly started = new Set<string>();

  /** The keywords kept for a card type, as a signal the page can watch. Add nothing to it directly. */
  list(cardType: string): Signal<string[]> {
    let view = this.views.get(cardType);

    if (!view) {
      view = computed(() => [...(this.lists().get(cardType) ?? [])]);
      this.views.set(cardType, view);
    }

    return view;
  }

  /** Fetches a card type's list the first time it is asked for; later calls do nothing. */
  load(cardType: string): void {
    if (!cardType || this.started.has(cardType)) return;
    this.started.add(cardType);

    this.http.get<{ keywords: string[] }>(
      `${environment.apiUrl}/api/campaign-keywords?cardType=${encodeURIComponent(cardType)}`
    ).subscribe({
      next: res => this.write(cardType, res.keywords ?? []),
      error: () => this.write(cardType, []),
    });
  }

  /** Adds a keyword to the list, once the server has taken it. */
  add(cardType: string, keyword: string): Observable<{ keyword: string }> {
    return this.http.post<{ keyword: string }>(
      `${environment.apiUrl}/api/campaign-keywords`,
      { cardType, keyword }
    ).pipe(
      tap(res => {
        const list = this.raw(cardType);
        const stored = res.keyword ?? keyword;
        if (!list.some(k => k.toLowerCase() === stored.toLowerCase())) {
          this.write(cardType, [...list, stored].sort());
        }
      })
    );
  }

  /** Removes a keyword from the list, once the server has let it go. */
  remove(cardType: string, keyword: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/api/campaign-keywords/${encodeURIComponent(keyword)}?cardType=${encodeURIComponent(cardType)}`
    ).pipe(
      tap(() => this.write(cardType, this.raw(cardType).filter(k => k !== keyword)))
    );
  }

  private raw(cardType: string): readonly string[] {
    return this.lists().get(cardType) ?? [];
  }

  private write(cardType: string, keywords: readonly string[]): void {
    const next = new Map(this.lists());
    next.set(cardType, keywords);
    this.lists.set(next);
  }
}
