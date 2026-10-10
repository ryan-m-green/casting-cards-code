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

  byId(campaignId: string, conditionId: string): ConditionEntry | null {
    return this.conditions(campaignId).find(entry => entry.id === conditionId) ?? null;
  }

  available(campaignId: string): readonly ConditionEntry[] {
    return this.availableShelves().get(campaignId) ?? [];
  }

  /**
   * The sentinel shelf key the GM's whole condition library is held under. Campaign shelves are
   * keyed by campaign id (a GUID), so this can never collide with one.
   */
  private static readonly LIBRARY_SHELF = '__library__';

  /** Every condition the GM owns — the Conditions Library page's shelf. */
  libraryConditions(): readonly ConditionEntry[] {
    return this.conditions(ConditionLibraryService.LIBRARY_SHELF);
  }

  isLoadingLibrary(): boolean {
    return this.isLoading(ConditionLibraryService.LIBRARY_SHELF);
  }

  hasFailedLibrary(): boolean {
    return this.hasFailed(ConditionLibraryService.LIBRARY_SHELF);
  }

  /** Reads the GM's whole condition library the first time it is asked for; later calls do nothing. */
  loadLibrary(): Observable<void> {
    const key = ConditionLibraryService.LIBRARY_SHELF;
    if (this.shelves().has(key)) return of(void 0);

    this.setMember(this.pending, key, true);

    return this.http.get<unknown>(`${environment.apiUrl}/api/conditions`).pipe(
      tap(payload => {
        this.write(key, this.toShelf(payload));
        this.setMember(this.failed, key, false);
      }),
      map((): void => undefined),
      catchError(() => {
        this.setMember(this.failed, key, true);
        return of(void 0);
      }),
      tap(() => this.setMember(this.pending, key, false))
    );
  }

  reloadLibrary(): Observable<void> {
    this.forget(ConditionLibraryService.LIBRARY_SHELF);
    return this.loadLibrary();
  }

  createInLibrary(draft: ConditionEntry): Observable<ConditionEntry> {
    const body = {
      name: draft.name.trim(),
      consequence: draft.consequence,
      keywords: this.toKeywords(draft.keywords),
      color: draft.color,
    };

    return this.http.post<unknown>(`${environment.apiUrl}/api/conditions`, body).pipe(
      map(payload => this.toEntry(payload)),
      tap(created => this.append(ConditionLibraryService.LIBRARY_SHELF, created))
    );
  }

  updateInLibrary(draft: ConditionEntry): Observable<ConditionEntry> {
    const body = {
      name: draft.name.trim(),
      consequence: draft.consequence,
      keywords: this.toKeywords(draft.keywords),
      color: draft.color,
    };

    return this.http.put<unknown>(`${environment.apiUrl}/api/conditions/${draft.id}`, body).pipe(
      map(payload => this.toEntry(payload)),
      tap(saved => this.replace(ConditionLibraryService.LIBRARY_SHELF, saved))
    );
  }

  removeFromLibrary(conditionId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/conditions/${conditionId}`).pipe(
      tap(() => this.unlink(ConditionLibraryService.LIBRARY_SHELF, conditionId))
    );
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

  /**
   * Refetches what a campaign has not added yet and replaces the shelf in place, so a picker that is
   * already open never flashes its empty state. Unlike `loadAvailable` the fetch always runs — a
   * pool a DM chooses from has to be what the server holds now, not whatever was cached the first
   * time it was read.
   */
  refreshAvailable(campaignId: string): Observable<void> {
    if (!campaignId) return of(void 0);

    return this.http.get<unknown>(`${this.collectionUrl(campaignId)}/available`).pipe(
      tap(payload => this.writeAvailable(campaignId, this.toShelf(payload))),
      map((): void => undefined),
      catchError(() => of(void 0))
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
      color: draft.color,
    };

    return this.http.post<unknown>(this.collectionUrl(campaignId), body).pipe(
      map(payload => this.toEntry(payload)),
      tap(created => this.append(campaignId, created))
    );
  }

  update(campaignId: string, draft: ConditionEntry): Observable<ConditionEntry> {
    const body = {
      name: draft.name.trim(),
      consequence: draft.consequence,
      keywords: this.toKeywords(draft.keywords),
      color: draft.color,
    };

    return this.http.put<unknown>(this.conditionUrl(campaignId, draft.id), body).pipe(
      map(payload => this.toEntry(payload)),
      tap(saved => this.replace(campaignId, saved))
    );
  }

  remove(campaignId: string, conditionId: string): Observable<void> {
    return this.http.delete<void>(this.conditionUrl(campaignId, conditionId)).pipe(
      tap(() => this.unlink(campaignId, conditionId))
    );
  }

  private collectionUrl(campaignId: string): string {
    return `${environment.apiUrl}/api/campaigns/${campaignId}/conditions`;
  }

  private conditionUrl(campaignId: string, conditionId: string): string {
    return `${this.collectionUrl(campaignId)}/${conditionId}`;
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

  private replace(campaignId: string, entry: ConditionEntry): void {
    const current = this.conditions(campaignId);
    const known = current.some(existing => existing.id === entry.id);

    this.write(
      campaignId,
      known ? current.map(existing => (existing.id === entry.id ? entry : existing)) : [...current, entry]
    );
  }

  private unlink(campaignId: string, conditionId: string): void {
    const held = this.conditions(campaignId);
    const dropped = held.find(entry => entry.id === conditionId);

    if (!dropped) return;

    this.write(campaignId, held.filter(entry => entry.id !== conditionId));

    // The condition is only off this campaign now, so it belongs back in the pool a picker draws
    // from — but only when that pool is already loaded, or we would freeze it as this one entry and
    // its own fetch would then be skipped.
    if (!this.availableShelves().has(campaignId)) return;
    if (this.available(campaignId).some(entry => entry.id === conditionId)) return;

    this.writeAvailable(campaignId, [...this.available(campaignId), dropped]);
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
      color: typeof source.color === 'string' ? source.color : '',
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
