import { Component, effect, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AudioPlayerService } from '../../../core/audio-player.service';
import { V2CampaignShellService } from '../../../core/v2-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import {
  SoundtrackDomain,
  AmbianceDomain,
  AmbiancePauseMode
} from '../../models/soundtrack.model';
import { AmbianceItemPauseControlComponent } from '../ambiance-item-pause-control/ambiance-item-pause-control.component';
import { ToggleSwitchComponent } from '../toggle-switch/toggle-switch.component';
import { CcSliderComponent } from '../v2/cc-slider/cc-slider.component';

interface DraftItem {
  soundtrackId: string;
  volume: number;
  pauseMode: AmbiancePauseMode;
  pauseDelaySeconds: number | null;
  pauseMinSeconds: number | null;
  pauseMaxSeconds: number | null;
}

@Component({
  selector: 'app-cc-soundtracks',
  standalone: true,
  imports: [CommonModule, FormsModule, AmbianceItemPauseControlComponent, ToggleSwitchComponent, CcSliderComponent],
  templateUrl: './cc-soundtracks.component.html',
  styleUrl: './cc-soundtracks.component.scss',
})
export class CcSoundtracksComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private audioPlayer = inject(AudioPlayerService);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(V2CampaignShellService);

  campaignId = input.required<string>();
  portalColor = input<string>('#6e28d0');

  soundtracks = signal<SoundtrackDomain[]>([]);
  ambiances = signal<AmbianceDomain[]>([]);
  activeTrackIds = signal<string[]>([]);
  activeAmbianceIds = signal<string[]>([]);
  masterVolume = signal(100);

  uploading = signal(false);
  draftItems = signal<DraftItem[]>([]);
  draftTitle = signal('');
  draftRandomizeMusic = signal(false);

  pendingDeleteTrackId = signal<string | null>(null);
  pendingDeleteAmbianceId = signal<string | null>(null);
  errorMessage = signal('');

  private subscriptions: Subscription[] = [];
  private timers: number[] = [];

  constructor() {
    effect(() => {
      const id = this.campaignId();
      if (id) {
        this.loadSoundtracks(id);
        this.loadAmbiances(id);
      }
    });
  }

  ngOnInit() {
    this.subscriptions.push(
      this.audioPlayer.activeTrackIds$.subscribe(ids => this.activeTrackIds.set(ids)),
      this.audioPlayer.activeAmbianceIds$.subscribe(ids => this.activeAmbianceIds.set(ids)),
      this.hub.soundtrackVolumeChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.applyTrackVolume(event.soundtrackId, event.volume);
      }),
      this.audioPlayer.masterVolume$.subscribe(volume => this.masterVolume.set(volume)),
      this.shellSvc.ambianceChanged.subscribe(() => this.loadAmbiances(this.campaignId()))
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.timers.forEach(timer => window.clearTimeout(timer));
  }

  // ── Library ────────────────────────────────────────────────────────────────
  loadSoundtracks(id: string) {
    this.http.get<SoundtrackDomain[]>(`${environment.apiUrl}/api/campaigns/${id}/soundtracks`).subscribe({
      next: tracks => this.soundtracks.set(tracks)
    });
  }

  loadAmbiances(id: string) {
    this.http.get<AmbianceDomain[]>(`${environment.apiUrl}/api/campaigns/${id}/ambiances`).subscribe({
      next: ambiances => this.ambiances.set(ambiances)
    });
  }

  openUpload(kind: 'music' | 'sound_effect') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) this.uploadSoundtrack(file, kind);
    };
    input.click();
  }

  uploadSoundtrack(file: File, kind: 'music' | 'sound_effect') {
    this.uploading.set(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('volume', '80');
    formData.append('isLoop', kind === 'music' ? 'true' : 'false');
    formData.append('kind', kind);

    this.http.post<SoundtrackDomain>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/soundtracks`,
      formData
    ).subscribe({
      next: track => {
        this.soundtracks.update(tracks => [...tracks, track]);
        this.uploading.set(false);
      },
      error: () => {
        this.uploading.set(false);
        this.showError('Failed to upload soundtrack. Check file size (max 25MB) and format.');
      }
    });
  }

  playTrack(track: SoundtrackDomain) {
    this.audioPlayer.playTrack(track);
  }

  stopTrack(trackId: string) {
    this.audioPlayer.stopTrack(trackId);
  }

  isTrackPlaying(trackId: string): boolean {
    return this.activeTrackIds().includes(trackId);
  }

  requestDeleteTrack(trackId: string) {
    if (this.pendingDeleteTrackId() === trackId) {
      this.confirmDeleteTrack(trackId);
    } else {
      this.pendingDeleteTrackId.set(trackId);
      this.scheduleReset(() => this.pendingDeleteTrackId.set(null));
    }
  }

  confirmDeleteTrack(trackId: string) {
    this.pendingDeleteTrackId.set(null);
    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/soundtracks/${trackId}`).subscribe({
      next: () => {
        this.soundtracks.update(tracks => tracks.filter(t => t.id !== trackId));
        this.draftItems.update(items => items.filter(i => i.soundtrackId !== trackId));
        this.audioPlayer.stopTrack(trackId);
      },
      error: () => this.showError('Failed to delete soundtrack.')
    });
  }

  getDisplayName(title: string): string {
    const lastDotIndex = title.lastIndexOf('.');
    return lastDotIndex > 0 ? title.substring(0, lastDotIndex) : title;
  }

  toggleKind(track: SoundtrackDomain) {
    const newKind = track.kind === 'music' ? 'sound_effect' : 'music';
    this.http.patch<SoundtrackDomain>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/soundtracks/${track.id}`,
      {
        title: track.title,
        volume: track.volume,
        isLoop: newKind === 'music' ? track.isLoop : false,
        loopDelaySeconds: newKind === 'music' ? track.loopDelaySeconds ?? null : null,
        kind: newKind
      }
    ).subscribe({
      next: updated => {
        this.soundtracks.update(tracks => tracks.map(t => t.id === updated.id ? updated : t));
      },
      error: () => this.showError('Failed to update soundtrack kind.')
    });
  }

  toggleDraft(track: SoundtrackDomain) {
    const existing = this.draftItems().find(i => i.soundtrackId === track.id);
    if (existing) {
      this.draftItems.update(items => items.filter(i => i.soundtrackId !== track.id));
      if (this.draftItems().length === 0) this.draftTitle.set('');
    } else {
      const wasEmpty = this.draftItems().length === 0;
      this.draftItems.update(items => [...items, {
        volume: track.volume,
        soundtrackId: track.id,
        pauseMode: 'none',
        pauseDelaySeconds: null,
        pauseMinSeconds: null,
        pauseMaxSeconds: null
      }]);
      if (wasEmpty) this.draftTitle.set(`Ambiance ${this.ambiances().length + 1}`);
    }
  }

  isInDraft(trackId: string): boolean {
    return this.draftItems().some(i => i.soundtrackId === trackId);
  }

  removeDraftItem(trackId: string) {
    this.draftItems.update(items => items.filter(i => i.soundtrackId !== trackId));
    if (this.draftItems().length === 0) this.draftTitle.set('');
  }

  clearDraft() {
    this.draftItems.set([]);
    this.draftTitle.set('');
    this.draftRandomizeMusic.set(false);
  }

  saveDraft() {
    const items = this.draftItems();
    if (items.length === 0) return;

    const title = this.draftTitle().trim() || `Ambiance ${this.ambiances().length + 1}`;
    const payload = {
      title,
      randomizeMusic: this.draftRandomizeMusic(),
      items: items.map(i => ({
        soundtrackId: i.soundtrackId,
        volume: i.volume,
        pauseMode: i.pauseMode,
        pauseDelaySeconds: i.pauseMode === 'manual' ? i.pauseDelaySeconds : null,
        pauseMinSeconds: i.pauseMode === 'random' ? i.pauseMinSeconds : null,
        pauseMaxSeconds: i.pauseMode === 'random' ? i.pauseMaxSeconds : null
      }))
    };

    this.http.post<AmbianceDomain>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/ambiances`,
      payload
    ).subscribe({
      next: saved => {
        this.ambiances.update(list => [...list, saved]);
        this.clearDraft();
      },
      error: () => this.showError('Failed to save ambiance.')
    });
  }

  // ── Ambiances ──────────────────────────────────────────────────────────────
  playAmbiance(ambiance: AmbianceDomain) {
    if (this.audioPlayer.isAmbiancePlaying(ambiance.id)) {
      this.audioPlayer.stopAmbiance(ambiance.id);
    } else {
      this.audioPlayer.playAmbiance(ambiance, this.soundtracks());
    }
  }

  isAmbiancePlaying(ambianceId: string): boolean {
    return this.activeAmbianceIds().includes(ambianceId);
  }

  editAmbiance(ambiance: AmbianceDomain) {
    this.shellSvc.openAmbianceEditorDrawer(ambiance, this.campaignId(), this.portalColor());
  }

  requestDeleteAmbiance(ambianceId: string) {
    if (this.pendingDeleteAmbianceId() === ambianceId) {
      this.confirmDeleteAmbiance(ambianceId);
    } else {
      this.pendingDeleteAmbianceId.set(ambianceId);
      this.scheduleReset(() => this.pendingDeleteAmbianceId.set(null));
    }
  }

  confirmDeleteAmbiance(ambianceId: string) {
    this.pendingDeleteAmbianceId.set(null);
    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/ambiances/${ambianceId}`).subscribe({
      next: () => {
        this.audioPlayer.stopAmbiance(ambianceId);
        this.ambiances.update(list => list.filter(a => a.id !== ambianceId));
      },
      error: () => this.showError('Failed to delete ambiance.')
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  soundtrackTitle(id: string): string {
    const track = this.soundtracks().find(t => t.id === id);
    return track ? this.getDisplayName(track.title) : 'Select a soundtrack';
  }

  isSoundEffect(id: string): boolean {
    const track = this.soundtracks().find(t => t.id === id);
    return track?.kind === 'sound_effect';
  }

  onVolumeChange(volume: number) {
    this.masterVolume.set(volume);
    this.audioPlayer.setMasterVolume(volume);
  }

  onTrackVolumeChange(track: SoundtrackDomain, volume: number) {
    this.updateSoundtrackVolume(track.id, volume);
  }

  onDraftVolumeChange(item: DraftItem, volume: number) {
    this.draftItems.update(items => items.map(i => i.soundtrackId === item.soundtrackId ? { ...i, volume } : i));
    this.updateSoundtrackVolume(item.soundtrackId, volume);
  }

  private updateSoundtrackVolume(trackId: string, volume: number) {
    const track = this.soundtracks().find(t => t.id === trackId);
    if (!track) return;

    this.applyTrackVolume(trackId, volume);

    this.http.patch<SoundtrackDomain>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/soundtracks/${trackId}`,
      {
        title: track.title,
        volume,
        isLoop: track.isLoop,
        loopDelaySeconds: track.loopDelaySeconds ?? null,
        kind: track.kind
      }
    ).subscribe({
      next: updated => {
        this.soundtracks.update(tracks => tracks.map(t => t.id === updated.id ? updated : t));
      },
      error: () => this.showError('Failed to update volume.')
    });
  }

  /**
   * A soundtrack's volume is the single source of truth. When it changes (locally or via the
   * SoundtrackVolumeChanged hub event) keep every UI mirror in sync: the library list, any open
   * ambiance draft rows, the persisted ambiance item snapshots, and currently-playing audio.
   */
  private applyTrackVolume(trackId: string, volume: number) {
    this.soundtracks.update(tracks => tracks.map(t => t.id === trackId ? { ...t, volume } : t));
    this.draftItems.update(items => items.map(i => i.soundtrackId === trackId ? { ...i, volume } : i));
    this.ambiances.update(list => list.map(a => ({
      ...a,
      items: a.items.map(it => it.soundtrackId === trackId ? { ...it, volume } : it)
    })));
    this.audioPlayer.updateTrackVolume(trackId, volume);
  }

  stopAll() {
    this.audioPlayer.stopAllTracks();
    this.activeAmbianceIds().forEach(id => this.audioPlayer.stopAmbiance(id));
  }

  showError(message: string) {
    this.errorMessage.set(message);
    this.scheduleReset(() => this.errorMessage.set(''));
  }

  private scheduleReset(fn: () => void) {
    const timer = window.setTimeout(fn, 3000);
    this.timers.push(timer);
  }
}
