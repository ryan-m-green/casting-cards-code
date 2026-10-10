import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AmbianceDomain, AmbiancePauseMode, SoundtrackDomain, soundtrackDisplayName } from '../shared/models/soundtrack.model';

export type SoundtrackKind = 'music' | 'sound_effect';

/** The editable fields of a library track. */
export interface SoundtrackDraft {
  title: string;
  volume: number;
  isLoop: boolean;
  loopDelaySeconds?: number | null;
  kind: SoundtrackKind;
}

/** One ordered entry of an ambiance playlist. */
export interface AmbianceItemDraft {
  soundtrackId: string;
  volume: number;
  pauseMode: AmbiancePauseMode;
  pauseDelaySeconds: number | null;
  pauseMinSeconds: number | null;
  pauseMaxSeconds: number | null;
}

export interface AmbianceDraft {
  title: string;
  randomizeMusic: boolean;
  items: AmbianceItemDraft[];
}

/**
 * The GM's soundtrack library — the tracks and ambiance playlists that belong to the GM's
 * account and are shared across every campaign the GM runs.
 *
 * Both the journal's Soundtrack Library page and a campaign's soundtrack panel read the same
 * library, so this service keeps one copy of each shelf: an upload from either place lands here,
 * and a delete here is the delete everywhere (the server drops the track from every playlist it
 * sat in, and the ambiance shelf is re-read so those playlists are seen without it).
 */
@Injectable({ providedIn: 'root' })
export class SoundtrackLibraryService {
  private readonly http = inject(HttpClient);

  readonly soundtracks = signal<SoundtrackDomain[]>([]);
  readonly ambiances = signal<AmbianceDomain[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');

  private loadedOnce = false;

  /** Reads the GM's whole library the first time it is asked for; later calls do nothing. */
  load(force = false): void {
    if (this.loadedOnce && !force) return;
    this.loadedOnce = true;

    this.loading.set(true);

    this.http.get<SoundtrackDomain[]>(`${environment.apiUrl}/api/soundtracks`).subscribe({
      next: tracks => {
        this.soundtracks.set(tracks);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.loaded.set(true);
        this.error.set('Could not load your soundtracks.');
      },
    });

    // The ambiance shelf is read alongside the tracks. `reloadAmbiances` hands back a cold observable,
    // so it has to be subscribed here — without that the request is never made and the playlists stay
    // empty however many the account holds.
    this.reloadAmbiances().subscribe();
  }

  /** Re-reads the ambiance shelf, so a playlist that lost a track is seen without it. */
  reloadAmbiances(): Observable<void> {
    return this.http.get<AmbianceDomain[]>(`${environment.apiUrl}/api/ambiances`).pipe(
      tap(list => this.ambiances.set(list)),
      map((): void => undefined),
    );
  }

  upload(file: File, kind: SoundtrackKind): Observable<SoundtrackDomain> {
    const form = new FormData();
    form.append('file', file);
    form.append('title', file.name);
    form.append('volume', '80');
    form.append('isLoop', kind === 'music' ? 'true' : 'false');
    form.append('kind', kind);

    return this.http.post<SoundtrackDomain>(`${environment.apiUrl}/api/soundtracks`, form).pipe(
      tap(track => this.soundtracks.update(tracks => [...tracks, track]))
    );
  }

  update(trackId: string, draft: SoundtrackDraft): Observable<SoundtrackDomain> {
    return this.http.patch<SoundtrackDomain>(`${environment.apiUrl}/api/soundtracks/${trackId}`, {
      title: draft.title,
      volume: draft.volume,
      isLoop: draft.isLoop,
      loopDelaySeconds: draft.loopDelaySeconds ?? null,
      kind: draft.kind,
    }).pipe(
      tap(saved => this.soundtracks.update(tracks => tracks.map(t => (t.id === saved.id ? saved : t))))
    );
  }

  remove(trackId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/soundtracks/${trackId}`).pipe(
      tap(() => {
        this.soundtracks.update(tracks => tracks.filter(t => t.id !== trackId));
        // The track is gone from every playlist it sat in server-side, so the ambiance shelf
        // has to be read again for those playlists to be seen without it.
        this.reloadAmbiances().subscribe();
      })
    );
  }

  createAmbiance(draft: AmbianceDraft): Observable<AmbianceDomain> {
    return this.http.post<AmbianceDomain>(`${environment.apiUrl}/api/ambiances`, draft).pipe(
      tap(created => this.ambiances.update(list => [...list, created]))
    );
  }

  updateAmbiance(ambianceId: string, draft: AmbianceDraft): Observable<AmbianceDomain> {
    return this.http.patch<AmbianceDomain>(`${environment.apiUrl}/api/ambiances/${ambianceId}`, draft).pipe(
      tap(saved => this.ambiances.update(list => list.map(a => (a.id === saved.id ? saved : a))))
    );
  }

  removeAmbiance(ambianceId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/ambiances/${ambianceId}`).pipe(
      tap(() => this.ambiances.update(list => list.filter(a => a.id !== ambianceId)))
    );
  }

  trackById(trackId: string): SoundtrackDomain | null {
    return this.soundtracks().find(t => t.id === trackId) ?? null;
  }

  /** The track's name without its file extension, which is how a title is shown. */
  static displayName(title: string): string {
    return soundtrackDisplayName(title);
  }
}