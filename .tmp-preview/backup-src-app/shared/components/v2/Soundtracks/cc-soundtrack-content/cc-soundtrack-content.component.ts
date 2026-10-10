import { Component, computed, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AudioPlayerService } from '../../../../../core/audio-player.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import {
  SoundtrackDomain,
  AmbianceDomain,
  AmbiancePauseMode
} from '../../../../models/soundtrack.model';
import { CcSoundtrackControlsComponent } from '../cc-soundtrack-controls/cc-soundtrack-controls.component';
import { CcToggleSwitchComponent } from '../../Shared/cc-toggle-switch/cc-toggle-switch.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../Shared/cc-campaign-dropdown/cc-campaign-dropdown.component';
import { CcSliderComponent } from '../cc-slider/cc-slider.component';

interface BuilderItem {
  soundtrackId: string;
  volume: number;
  pauseMode: AmbiancePauseMode;
  pauseDelaySeconds: number | null;
  pauseMinSeconds: number | null;
  pauseMaxSeconds: number | null;
}

@Component({
  selector: 'cc-soundtrack-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcSoundtrackControlsComponent, CcToggleSwitchComponent, CampaignDropdownComponent, CcSliderComponent],
  templateUrl: './cc-soundtrack-content.component.html',
  styleUrl: './cc-soundtrack-content.component.scss',
})
export class CcSoundtrackContentComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private audioPlayer = inject(AudioPlayerService);
  private shellSvc = inject(CampaignShellService);
  private hub = inject(CampaignHubService);

  ambiance = input<AmbianceDomain | null>(null);
  campaignId = input.required<string>();
  portalColor = input<string>('#6e28d0');

  seedTrackIds = input<string[]>([]);

  seedTitle = input<string>('');

  closeDrawer = output<void>();

  isCreating = computed(() => this.ambiance() === null);

  title = signal('');
  items = signal<BuilderItem[]>([]);
  library = signal<SoundtrackDomain[]>([]);
  saving = signal(false);
  errorMessage = signal('');
  pendingDelete = signal(false);
  randomizeMusic = signal(false);

  soundtrackOptions = computed<CampaignDropdownOption[]>(() =>
    this.library().map(track => ({
      value: track.id,
      label: `${this.getDisplayName(track.title)} (${track.kind === 'music' ? 'music' : 'sfx'})`
    }))
  );

  private deleteTimer: number | null = null;
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    const existing = this.ambiance();

    if (existing) {
      this.title.set(existing.title);
      this.randomizeMusic.set(existing.randomizeMusic);
      this.items.set(existing.items.map(i => ({
        soundtrackId: i.soundtrackId,
        volume: i.volume ?? 80,
        pauseMode: i.pauseMode,
        pauseDelaySeconds: i.pauseDelaySeconds ?? null,
        pauseMinSeconds: i.pauseMinSeconds ?? null,
        pauseMaxSeconds: i.pauseMaxSeconds ?? null
      })));
    } else {
      this.title.set(this.seedTitle());
      this.items.set(this.seedTrackIds().map(soundtrackId => ({
        soundtrackId,
        volume: 80,
        pauseMode: 'none' as AmbiancePauseMode,
        pauseDelaySeconds: null,
        pauseMinSeconds: null,
        pauseMaxSeconds: null
      })));
    }

    this.loadLibrary();

    this.subscriptions.push(
      this.hub.on('SoundtrackVolumeChanged', 'cc-soundtrack-content', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.applyTrackVolume(event.soundtrackId, event.volume);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.deleteTimer !== null) {
      window.clearTimeout(this.deleteTimer);
    }
  }

  loadLibrary() {
    this.http.get<SoundtrackDomain[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/soundtracks`).subscribe({
      next: tracks => {
        this.library.set(tracks);
        this.syncItemVolumesToLibrary();
      }
    });
  }

  private syncItemVolumesToLibrary() {
    const tracks = this.library();
    this.items.update(list => list.map(row => {
      if (!row.soundtrackId) return row;
      const track = tracks.find(t => t.id === row.soundtrackId);
      return track ? { ...row, volume: track.volume } : row;
    }));
  }

  private applyTrackVolume(trackId: string, volume: number) {
    this.library.update(tracks => tracks.map(t => t.id === trackId ? { ...t, volume } : t));
    this.items.update(list => list.map(row => row.soundtrackId === trackId ? { ...row, volume } : row));
  }

  addItem() {
    this.items.update(list => [...list, {
      soundtrackId: '',
      volume: 80,
      pauseMode: 'none',
      pauseDelaySeconds: null,
      pauseMinSeconds: null,
      pauseMaxSeconds: null
    }]);
  }

  onSoundtrackSelected(index: number, soundtrackId: string) {
    this.items.update(list => {
      const row = list[index];
      if (!row) return list;
      const track = this.library().find(t => t.id === soundtrackId);
      const copy = [...list];
      copy[index] = {
        ...row,
        soundtrackId,
        volume: track ? track.volume : row.volume
      };
      return copy;
    });
  }

  removeItem(index: number) {
    this.items.update(list => list.filter((_, i) => i !== index));
  }

  onItemVolumeChange(index: number, volume: number) {
    const item = this.items()[index];
    if (!item) return;

    this.items.update(list => list.map((i, idx) => idx === index ? { ...i, volume } : i));
    this.updateSoundtrackVolume(item.soundtrackId, volume);
  }

  private updateSoundtrackVolume(soundtrackId: string, volume: number) {
    if (!soundtrackId) return;
    const track = this.library().find(t => t.id === soundtrackId);
    if (!track) return;

    this.library.update(tracks => tracks.map(t => t.id === soundtrackId ? { ...t, volume } : t));

    this.http.patch<SoundtrackDomain>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/soundtracks/${soundtrackId}`,
      {
        title: track.title,
        volume,
        isLoop: track.isLoop,
        loopDelaySeconds: track.loopDelaySeconds ?? null,
        kind: track.kind
      }
    ).subscribe({
      next: updated => {
        this.library.update(tracks => tracks.map(t => t.id === updated.id ? updated : t));
      },
      error: () => this.errorMessage.set('Failed to update volume.')
    });
  }

  moveItem(index: number, direction: -1 | 1) {
    this.items.update(list => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  save() {
    const title = this.title().trim();
    if (!title) {
      this.errorMessage.set('Title is required.');
      return;
    }

    const existing = this.ambiance();
    const items = this.items();
    if (items.some(i => !i.soundtrackId)) {
      this.errorMessage.set('Every track must have a soundtrack selected.');
      return;
    }

    if (!existing && items.length === 0) {
      this.errorMessage.set('Add at least one track.');
      return;
    }

    const payload = {
      title,
      randomizeMusic: this.randomizeMusic(),
      items: items.map(i => ({
        soundtrackId: i.soundtrackId,
        volume: i.volume,
        pauseMode: i.pauseMode,
        pauseDelaySeconds: i.pauseMode === 'manual' ? i.pauseDelaySeconds : null,
        pauseMinSeconds: i.pauseMode === 'random' ? i.pauseMinSeconds : null,
        pauseMaxSeconds: i.pauseMode === 'random' ? i.pauseMaxSeconds : null
      }))
    };

    const url = `${environment.apiUrl}/api/campaigns/${this.campaignId()}/ambiances`;

    this.saving.set(true);
    const write$ = existing
      ? this.http.patch<AmbianceDomain>(`${url}/${existing.id}`, payload)
      : this.http.post<AmbianceDomain>(url, payload);

    write$.subscribe({
      next: () => {
        this.saving.set(false);
        this.shellSvc.ambianceChanged.next();
        this.shellSvc.ambianceSaved.next();
        this.closeDrawer.emit();
      },
      error: () => {
        this.saving.set(false);
        this.errorMessage.set(existing ? 'Failed to save ambiance.' : 'Failed to create ambiance.');
      }
    });
  }

  requestDelete() {
    if (this.pendingDelete()) {
      this.confirmDelete();
    } else {
      this.pendingDelete.set(true);
      this.deleteTimer = window.setTimeout(() => this.pendingDelete.set(false), 3000);
    }
  }

  confirmDelete() {
    const existing = this.ambiance();
    if (!existing) return;

    this.pendingDelete.set(false);
    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/ambiances/${existing.id}`).subscribe({
      next: () => {
        this.audioPlayer.stopAmbiance(existing.id);
        this.shellSvc.ambianceChanged.next();
        this.closeDrawer.emit();
      },
      error: () => this.errorMessage.set('Failed to delete ambiance.')
    });
  }

  soundtrackTitle(id: string): string {
    const track = this.library().find(t => t.id === id);
    return track ? this.getDisplayName(track.title) : 'Select a soundtrack';
  }

  isSoundEffect(id: string): boolean {
    const track = this.library().find(t => t.id === id);
    return track?.kind === 'sound_effect';
  }

  getDisplayName(title: string): string {
    const lastDotIndex = title.lastIndexOf('.');
    return lastDotIndex > 0 ? title.substring(0, lastDotIndex) : title;
  }
}
