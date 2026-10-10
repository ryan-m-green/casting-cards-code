import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Rule, RuleDefinition, newGuid } from '../shared/models/rule.model';

@Injectable({ providedIn: 'root' })
export class RuleLibraryService {
  private readonly http = inject(HttpClient);
  private readonly shelves = signal<ReadonlyMap<string, readonly Rule[]>>(new Map());
  private readonly pending = signal<ReadonlySet<string>>(new Set());
  private readonly failed = signal<ReadonlySet<string>>(new Set());

  private readonly availableShelves = signal<ReadonlyMap<string, readonly Rule[]>>(new Map());
  private readonly availablePending = signal<ReadonlySet<string>>(new Set());

  rules(campaignId: string): readonly Rule[] {
    return this.shelves().get(campaignId) ?? [];
  }

  available(campaignId: string): readonly Rule[] {
    return this.availableShelves().get(campaignId) ?? [];
  }

  /**
   * The sentinel shelf key the GM's whole cheat sheet is held under. Campaign shelves are keyed by
   * campaign id (a GUID), so this can never collide with one.
   */
  private static readonly LIBRARY_SHELF = '__library__';

  /** Every entry the DM owns — the Cheat Sheet Library page's shelf. */
  libraryRules(): readonly Rule[] {
    return this.rules(RuleLibraryService.LIBRARY_SHELF);
  }

  isLoadingLibrary(): boolean {
    return this.isLoading(RuleLibraryService.LIBRARY_SHELF);
  }

  hasFailedLibrary(): boolean {
    return this.hasFailed(RuleLibraryService.LIBRARY_SHELF);
  }

  /** Reads the DM's whole cheat sheet the first time it is asked for; later calls do nothing. */
  loadLibrary(): Observable<void> {
    const key = RuleLibraryService.LIBRARY_SHELF;
    if (this.shelves().has(key)) return of(void 0);

    this.setMember(this.pending, key, true);

    return this.http.get<unknown>(`${environment.apiUrl}/api/rules`).pipe(
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
    this.forget(RuleLibraryService.LIBRARY_SHELF);
    return this.loadLibrary();
  }

  createInLibrary(draft: Rule): Observable<Rule> {
    const body = {
      name: draft.name.trim(),
      definition: draft.definition,
      children: this.toChildrenBody(draft.children),
      keywords: this.toKeywords(draft.keywords),
    };

    return this.http.post<unknown>(`${environment.apiUrl}/api/rules`, body).pipe(
      map(payload => this.toRule(payload)),
      tap(created => this.append(RuleLibraryService.LIBRARY_SHELF, created))
    );
  }

  updateInLibrary(draft: Rule): Observable<Rule> {
    const body = {
      name: draft.name.trim(),
      definition: draft.definition,
      children: this.toChildrenBody(draft.children),
      keywords: this.toKeywords(draft.keywords),
    };

    return this.http.put<unknown>(`${environment.apiUrl}/api/rules/${draft.id}`, body).pipe(
      map(payload => this.toRule(payload)),
      tap(saved => this.replace(RuleLibraryService.LIBRARY_SHELF, saved))
    );
  }

  removeFromLibrary(ruleId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/rules/${ruleId}`).pipe(
      tap(() => this.drop(RuleLibraryService.LIBRARY_SHELF, ruleId))
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

  link(campaignId: string, ruleIds: readonly string[]): Observable<readonly Rule[]> {
    const ids = [...new Set(ruleIds)].filter(id => id !== '');

    if (ids.length === 0) return of([]);

    const picked = this.available(campaignId).filter(rule => ids.includes(rule.id));

    return this.http.post<unknown>(`${this.collectionUrl(campaignId)}/link`, { ruleIds: ids }).pipe(
      map(() => picked),
      tap(lifted => {
        this.write(campaignId, [...this.rules(campaignId), ...lifted]);
        this.writeAvailable(
          campaignId,
          this.available(campaignId).filter(rule => !ids.includes(rule.id))
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

  byId(campaignId: string, ruleId: string): Rule | null {
    return this.rules(campaignId).find(rule => rule.id === ruleId) ?? null;
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

  create(campaignId: string, draft: Rule): Observable<Rule> {
    const body = {
      name: draft.name.trim(),
      definition: draft.definition,
      children: this.toChildrenBody(draft.children),
      keywords: this.toKeywords(draft.keywords),
    };

    return this.http.post<unknown>(this.collectionUrl(campaignId), body).pipe(
      map(payload => this.toRule(payload)),
      tap(created => this.append(campaignId, created))
    );
  }

  update(campaignId: string, rule: Rule): Observable<Rule> {
    const body = {
      name: rule.name.trim(),
      definition: rule.definition,
      children: this.toChildrenBody(rule.children),
      keywords: this.toKeywords(rule.keywords),
    };

    return this.http.put<unknown>(this.ruleUrl(campaignId, rule.id), body).pipe(
      map(payload => this.toRule(payload)),
      tap(saved => this.replace(campaignId, saved))
    );
  }

  remove(campaignId: string, ruleId: string): Observable<void> {
    return this.http.delete<void>(this.ruleUrl(campaignId, ruleId)).pipe(
      tap(() => this.drop(campaignId, ruleId))
    );
  }

  private collectionUrl(campaignId: string): string {
    return `${environment.apiUrl}/api/campaigns/${campaignId}/rules`;
  }

  private ruleUrl(campaignId: string, ruleId: string): string {
    return `${this.collectionUrl(campaignId)}/${ruleId}`;
  }

  private write(campaignId: string, rules: readonly Rule[]): void {
    const next = new Map(this.shelves());
    next.set(campaignId, rules);
    this.shelves.set(next);
  }

  private writeAvailable(campaignId: string, rules: readonly Rule[]): void {
    const next = new Map(this.availableShelves());
    next.set(campaignId, rules);
    this.availableShelves.set(next);
  }

  private forget(campaignId: string): void {
    const next = new Map(this.shelves());
    next.delete(campaignId);
    this.shelves.set(next);
  }

  private append(campaignId: string, rule: Rule): void {
    this.write(campaignId, [...this.rules(campaignId), rule]);
  }

  private replace(campaignId: string, rule: Rule): void {
    const current = this.rules(campaignId);
    const known = current.some(entry => entry.id === rule.id);

    this.write(
      campaignId,
      known ? current.map(entry => (entry.id === rule.id ? rule : entry)) : [...current, rule]
    );
  }

  private drop(campaignId: string, ruleId: string): void {
    this.write(campaignId, this.rules(campaignId).filter(rule => rule.id !== ruleId));
  }

  private setMember(target: typeof this.pending, campaignId: string, member: boolean): void {
    const current = target();

    if (current.has(campaignId) === member) return;

    const next = new Set(current);
    if (member) next.add(campaignId);
    else next.delete(campaignId);
    target.set(next);
  }

  private toShelf(payload: unknown): Rule[] {
    if (!Array.isArray(payload)) return [];

    return payload.map(entry => this.toRule(entry));
  }

  private toRule(entry: unknown): Rule {
    const source = (entry ?? {}) as Partial<Rule>;

    return {
      id: typeof source.id === 'string' && source.id ? source.id : newGuid(),
      name: typeof source.name === 'string' ? source.name : '',
      definition: typeof source.definition === 'string' ? source.definition : '',
      children: this.toChildren(source.children),
      keywords: this.toKeywords(source.keywords),
    };
  }

  private toChildren(children: unknown): RuleDefinition[] {
    if (!Array.isArray(children)) return [];

    return children.map(child => {
      const source = (child ?? {}) as Partial<RuleDefinition>;

      return {
        id: typeof source.id === 'string' && source.id ? source.id : newGuid(),
        name: typeof source.name === 'string' ? source.name : '',
        definition: typeof source.definition === 'string' ? source.definition : '',
      };
    });
  }

  private toChildrenBody(children: readonly RuleDefinition[]): RuleDefinition[] {
    return children
      .filter(child => child.name.trim() !== '' || child.definition.trim() !== '')
      .map(child => ({ id: child.id, name: child.name.trim(), definition: child.definition }));
  }

  private toKeywords(keywords: unknown): string[] {
    if (!Array.isArray(keywords)) return [];

    return keywords
      .filter((keyword): keyword is string => typeof keyword === 'string')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword !== '');
  }
}
