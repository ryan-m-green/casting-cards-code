import {
  Component, ChangeDetectionStrategy, ElementRef, HostListener, Injector, OnDestroy, OnInit,
  ViewChild, afterNextRender, computed, effect, inject, input, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { AudioPlayerService } from '../../../../../core/audio-player.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { SoundtrackDomain, AmbianceDomain } from '../../../../models/soundtrack.model';
import { CcSliderComponent } from '../cc-slider/cc-slider.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';

type SoundtrackKind = 'music' | 'sound_effect';

@Component({
  selector: 'app-cc-soundtracks',
  standalone: true,
  imports: [CommonModule, CcSliderComponent, CcEditButtonComponent, CcDeleteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-soundtracks.component.html',
  styleUrl: './cc-soundtracks.component.scss',
})
export class CcSoundtracksComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private audioPlayer = inject(AudioPlayerService);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private injector = inject(Injector);

  private readonly mark = publishGridAreaMark('middle-right', 'soundtracks', {
    title: () => ['Soundtracks'],
    icon: { path: '/musical_instruments_grey.svg', width: 34, height: 29 },
  });

  campaignId = input.required<string>();
  portalColor = input<string>('#6e28d0');

  soundtracks = signal<SoundtrackDomain[]>([]);
  ambiances = signal<AmbianceDomain[]>([]);
  activeTrackIds = signal<string[]>([]);
  activeAmbianceIds = signal<string[]>([]);
  masterVolume = signal(100);

  selectedTrackIds = signal<string[]>([]);

  uploading = signal(false);
  errorMessage = signal('');

  hasPlayingAudio = computed(() => this.activeTrackIds().length > 0 || this.activeAmbianceIds().length > 0);

  @ViewChild('trackRow', { static: false }) trackRowRef!: ElementRef<HTMLElement>;
  @ViewChild('ambianceRow', { static: false }) ambianceRowRef!: ElementRef<HTMLElement>;

  private trackSwiper: Swiper | null = null;
  private ambianceSwiper: Swiper | null = null;

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

    effect(() => {
      const count = this.soundtracks().length + 1;
      if (this.trackSwiper && this.trackSwiper.slides.length === count) {
        this.trackSwiper.update();
        return;
      }
      afterNextRender(() => this.initTrackSwiper(), { injector: this.injector });
    });

    effect(() => {
      const count = this.ambiances().length;
      if (count === 0) {
        this.destroyAmbianceSwiper();
        return;
      }
      if (this.ambianceSwiper && this.ambianceSwiper.slides.length === count) {
        this.ambianceSwiper.update();
        return;
      }
      afterNextRender(() => this.initAmbianceSwiper(), { injector: this.injector });
    });
  }

  ngOnInit() {
    this.subscriptions.push(
      this.audioPlayer.activeTrackIds$.subscribe(ids => this.activeTrackIds.set(ids)),
      this.audioPlayer.activeAmbianceIds$.subscribe(ids => this.activeAmbianceIds.set(ids)),
      this.hub.on('SoundtrackVolumeChanged', 'cc-soundtracks', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.applyTrackVolume(event.soundtrackId, event.volume);
      }),
      this.audioPlayer.masterVolume$.subscribe(volume => this.masterVolume.set(volume)),
      this.shellSvc.ambianceChanged.subscribe(() => this.loadAmbiances(this.campaignId())),

      this.shellSvc.ambianceSaved.subscribe(() => this.selectedTrackIds.set([])),

      this.hub.on('AmbianceChanged', 'cc-soundtracks', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.applyAmbianceChanged(event.ambianceId, event.ambiance ?? null);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.timers.forEach(timer => window.clearTimeout(timer));
    this.destroyTrackSwiper();
    this.destroyAmbianceSwiper();
  }

  @HostListener('wheel', ['$event'])
  onHorizontalWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
    }
  }

  private static readonly ROW_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: 10,
    centeredSlides: true,
    freeMode: {
      enabled: true,
      momentum: true,
      momentumRatio: 1,
      momentumBounceRatio: 1,
      sticky: false,
    },
    mousewheel: {
      enabled: true,
      forceToAxis: true,
      sensitivity: 1,
      releaseOnEdges: false,
    },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    watchOverflow: true,
    watchSlidesProgress: true,
  };

  private initTrackSwiper() {
    if (!this.trackRowRef?.nativeElement) return;
    this.destroyTrackSwiper();
    this.trackSwiper = new Swiper(this.trackRowRef.nativeElement, CcSoundtracksComponent.ROW_OPTIONS);
  }

  private initAmbianceSwiper() {
    if (!this.ambianceRowRef?.nativeElement) return;
    this.destroyAmbianceSwiper();
    this.ambianceSwiper = new Swiper(this.ambianceRowRef.nativeElement, CcSoundtracksComponent.ROW_OPTIONS);
  }

  private destroyTrackSwiper() {
    if (this.trackSwiper) {
      this.trackSwiper.destroy(true, true);
      this.trackSwiper = null;
    }
  }

  private destroyAmbianceSwiper() {
    if (this.ambianceSwiper) {
      this.ambianceSwiper.destroy(true, true);
      this.ambianceSwiper = null;
    }
  }

  loadSoundtracks(id: string) {
    this.http.get<SoundtrackDomain[]>(`${environment.apiUrl}/api/campaigns/${id}/soundtracks`).subscribe({
      next: tracks => {
        this.soundtracks.set(tracks);
        const live = new Set(tracks.map(t => t.id));
        this.selectedTrackIds.update(ids => ids.filter(trackId => live.has(trackId)));
        this.gridLoad.report('middle-right', 'soundtracks');
      },
      error: () => this.gridLoad.report('middle-right', 'soundtracks'),
    });
  }

  loadAmbiances(id: string) {
    this.http.get<AmbianceDomain[]>(`${environment.apiUrl}/api/campaigns/${id}/ambiances`).subscribe({
      next: ambiances => {
        this.ambiances.set(ambiances);
        this.gridLoad.report('middle-right', 'ambiances');
      },
      error: () => this.gridLoad.report('middle-right', 'ambiances'),
    });
  }

  private applyAmbianceChanged(ambianceId: string, ambiance: AmbianceDomain | null) {
    this.ambiances.update(list => {
      const index = list.findIndex(a => a.id === ambianceId);

      if (!ambiance) return index < 0 ? list : list.filter(a => a.id !== ambianceId);
      if (index < 0) return [...list, ambiance];

      const next = list.slice();
      next[index] = ambiance;
      return next;
    });
  }

  chooseUpload(kind: SoundtrackKind) {
    if (this.uploading()) return;
    this.openUpload(kind);
  }

  openUpload(kind: SoundtrackKind) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) this.uploadSoundtrack(file, kind);
    };
    input.click();
  }

  uploadSoundtrack(file: File, kind: SoundtrackKind) {
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

  toggleSelected(track: SoundtrackDomain) {
    this.selectedTrackIds.update(ids =>
      ids.includes(track.id) ? ids.filter(id => id !== track.id) : [...ids, track.id]
    );
  }

  isSelected(trackId: string): boolean {
    return this.selectedTrackIds().includes(trackId);
  }

  confirmDeleteTrack(trackId: string) {
    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/soundtracks/${trackId}`).subscribe({
      next: () => {
        this.soundtracks.update(tracks => tracks.filter(t => t.id !== trackId));
        this.selectedTrackIds.update(ids => ids.filter(id => id !== trackId));
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

  openAmbianceCreator() {
    const seedTrackIds = this.selectedTrackIds();
    if (seedTrackIds.length === 0) return;

    this.shellSvc.openAmbianceCreatorDrawer(
      seedTrackIds,
      this.campaignId(),
      this.portalColor(),
      `Ambiance ${this.ambiances().length + 1}`
    );
  }

  toggleAmbiance(ambiance: AmbianceDomain) {
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

  confirmDeleteAmbiance(ambianceId: string) {
    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/ambiances/${ambianceId}`).subscribe({
      next: () => {
        this.audioPlayer.stopAmbiance(ambianceId);
        this.ambiances.update(list => list.filter(a => a.id !== ambianceId));
      },
      error: () => this.showError('Failed to delete ambiance.')
    });
  }

  onVolumeChange(volume: number) {
    this.masterVolume.set(volume);
    this.audioPlayer.setMasterVolume(volume);
  }

  onTrackVolumeChange(track: SoundtrackDomain, volume: number) {
    this.updateSoundtrackVolume(track.id, volume);
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

  private applyTrackVolume(trackId: string, volume: number) {
    this.soundtracks.update(tracks => tracks.map(t => t.id === trackId ? { ...t, volume } : t));
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
