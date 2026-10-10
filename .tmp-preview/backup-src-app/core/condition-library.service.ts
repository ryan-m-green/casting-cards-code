import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ConditionEntry } from '../shared/models/condition-entry.model';
import { newGuid } from '../shared/models/rule.model';

@Injectable({ providedIn: 'root' })
export class ConditionLibraryService {
  private readonly http = inject(HttpClient);
  private readonly shelves = signal<ReadonlyMap<string, readonly ConditionEntry[]>>(new Map());
  private readonly pending = signal<ReadonlySet<string>>(new Set());
  private readonly failed = signal<ReadonlySet<string>>(new Set());

  private readonly availableShelves = signal<ReadonlyMap<string, readonly ConditionEntry[]>>(new Map());
  private readonly availablePending = signal<ReadonlySet<string>>(new Set());

  conditions(campaignId: string): readonly ConditionEntry[] {
    return this.shelves().get(campaignId) ?? [];
  }

  available(campaignId: string): readonly ConditionEntry[] {
    return this.availableShelves().get(campaignId) ?? [];
  }

  isLoadingAvailable(campaignId: string): boolean {
    return this.availablePending().has(campaignId);
  }

  loadAvailable(campaignId: string): Observable<void> {
    if (!campaignId || this.availableShelves().has(campaignId)) return of(void 0);

    this.setMember(this.availablePending, campaignId, true);

    return this.http.get<unknown>(`${this.collectionUrl(campaignId)}/available`).pipe(
      tap(payload => this.writeAvailable(campaignId, this.toShelf(payload))),
      map((): void => undefined),
      catchError(() => {
        this.writeAvailable(campaignId, []);
        return of(void 0);
      }),
      tap(() => this.setMember(this.availablePending, campaignId, false))
    );
  }

  link(campaignId: string, conditionIds: readonly string[]): Observable<readonly ConditionEntry[]> {
    const ids = [...new Set(conditionIds)].filter(id => id !== '');

    if (ids.length === 0) return of([]);

    const picked = this.available(campaignId).filter(entry => ids.includes(entry.id));

    return this.http.post<unknown>(`${this.collectionUrl(campaignId)}/link`, { conditionIds: ids }).pipe(
      map(() => picked),
      tap(lifted => {
        this.write(campaignId, [...this.conditions(campaignId), ...lifted]);
        this.writeAvailable(
          campaignId,
          this.available(campaignId).filter(entry => !ids.includes(entry.id))
        );
      })
    );
  }

  isLoading(campaignId: string): boolean {
    return this.pending().has(campaignId);
  }

  hasFailed(campaignId: string): boolean {
    return this.failed().has(campaignId);
  }

  load(campaignId: string): Observable<void> {
    if (!campaignId || this.shelves().has(campaignId)) return of(void 0);

    this.setMember(this.pending, campaignId, true);

    return this.http.get<unknown>(this.collectionUrl(campaignId)).pipe(
      tap(payload => {
        this.write(campaignId, this.toShelf(payload));
        this.setMember(this.failed, campaignId, false);
      }),
      map((): void => undefined),
      catchError(() => {
        this.setMember(this.failed, campaignId, true);
        return of(void 0);
      }),
      tap(() => this.setMember(this.pending, campaignId, false))
    );
  }

  reload(campaignId: string): Observable<void> {
    this.forget(campaignId);
    return this.load(campaignId);
  }

  create(campaignId: string, draft: ConditionEntry): Observable<ConditionEntry> {
    const body = {
      name: draft.name.trim(),
      consequence: draft.consequence,
      keywords: this.toKeywords(draft.keywords),
    };

    return this.http.post<unknown>(this.collectionUrl(campaignId), body).pipe(
      map(payload => this.toEntry(payload)),
      tap(created => this.append(campaignId, created))
    );
  }

  remove(campaignId: string, conditionId: string): Observable<void> {
    return this.http.delete<void>(`${this.collectionUrl(campaignId)}/${conditionId}`).pipe(
      tap(() => {
        this.write(campaignId, this.conditions(campaignId).filter(entry => entry.id !== conditionId));
        this.writeAvailable(campaignId, this.available(campaignId).filter(entry => entry.id !== conditionId));
      })
    );
  }

  private collectionUrl(campaignId: string): string {
    return `${environment.apiUrl}/api/campaigns/${campaignId}/conditions`;
  }

  private write(campaignId: string, entries: readonly ConditionEntry[]): void {
    const next = new Map(this.shelves());
    next.set(campaignId, entries);
    this.shelves.set(next);
  }

  private writeAvailable(campaignId: string, entries: readonly ConditionEntry[]): void {
    const next = new Map(this.availableShelves());
    next.set(campaignId, entries);
    this.availableShelves.set(next);
  }

  private forget(campaignId: string): void {
    const next = new Map(this.shelves());
    next.delete(campaignId);
    this.shelves.set(next);
  }

  private append(campaignId: string, entry: ConditionEntry): void {
    this.write(campaignId, [...this.conditions(campaignId), entry]);
  }

  private setMember(target: typeof this.pending, campaignId: string, member: boolean): void {
    const current = target();

    if (current.has(campaignId) === member) return;

    const next = new Set(current);
    if (member) next.add(campaignId);
    else next.delete(campaignId);
    target.set(next);
  }

  private toShelf(payload: unknown): ConditionEntry[] {
    if (!Array.isArray(payload)) return [];

    return payload.map(entry => this.toEntry(entry));
  }

  private toEntry(entry: unknown): ConditionEntry {
    const source = (entry ?? {}) as Partial<ConditionEntry>;

    return {
      id: typeof source.id === 'string' && source.id ? source.id : newGuid(),
      name: typeof source.name === 'string' ? source.name : '',
      consequence: typeof source.consequence === 'string' ? source.consequence : '',
      keywords: this.toKeywords(source.keywords),
    };
  }

  private toKeywords(keywords: unknown): string[] {
    if (!Array.isArray(keywords)) return [];

    return keywords
      .filter((keyword): keyword is string => typeof keyword === 'string')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword !== '');
  }
}
