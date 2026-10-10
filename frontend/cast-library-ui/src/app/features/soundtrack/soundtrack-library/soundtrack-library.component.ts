import {
  Component, ChangeDetectionStrategy, ElementRef, HostListener, Injector, OnDestroy, OnInit,
  ViewChild, afterNextRender, effect, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { SoundtrackDomain, AmbianceDomain } from '../../../shared/models/soundtrack.model';
import { AudioPlayerService } from '../../../core/audio-player.service';
import { SoundtrackKind, SoundtrackLibraryService } from '../../../core/soundtrack-library.service';
import { CcSoundtrackCardComponent } from '../../../shared/components/Campaign/Soundtracks/cc-soundtrack-card/cc-soundtrack-card.component';
import { CcEditButtonComponent } from '../../../shared/components/Shared/cc-edit-button/cc-edit-button.component';
import { CcDeleteButtonComponent } from '../../../shared/components/Shared/cc-delete-button/cc-delete-button.component';
import { CcCardAddTileComponent } from '../../../shared/components/Shared/cc-card-add-tile/cc-card-add-tile.component';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/Journal/journal-watermark/journal-watermark.component';

/**
 * The journal's Soundtrack Library — the GM's own audio, shared across every campaign.
 *
 * It is the campaign's soundtrack panel laid out twice: the tracks are swept as a row of full-sized
 * cards (with a ＋ tile at the end to add music or a sound effect), and beneath them the ambiance
 * playlists are swept as a second row. Editing a track opens its page; deleting one takes it out of
 * the library everywhere, including every playlist it sat in.
 */
@Component({
  selector: 'app-soundtrack-library',
  standalone: true,
  imports: [
    CommonModule,
    CcSoundtrackCardComponent,
    CcEditButtonComponent,
    CcDeleteButtonComponent,
    CcCardAddTileComponent,
    JournalTitleComponent,
    JournalWatermarkComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'soundtrack-library' },
  templateUrl: './soundtrack-library.component.html',
  styleUrl: './soundtrack-library.component.scss',
})
export class SoundtrackLibraryComponent implements OnInit, OnDestroy {
  private readonly library = inject(SoundtrackLibraryService);
  private readonly audioPlayer = inject(AudioPlayerService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly soundtracks = this.library.soundtracks;
  readonly ambiances = this.library.ambiances;
  readonly loading = this.library.loading;
  readonly error = this.library.error;

  readonly uploading = signal(false);
  readonly actionError = signal('');
  readonly activeTrackIds = signal<string[]>([]);
  readonly activeAmbianceIds = signal<string[]>([]);

  @ViewChild('trackRow', { static: false }) trackRowRef!: ElementRef<HTMLElement>;
  @ViewChild('ambianceRow', { static: false }) ambianceRowRef!: ElementRef<HTMLElement>;

  private trackSwiper: Swiper | null = null;
  private ambianceSwiper: Swiper | null = null;
  private readonly subscriptions: Subscription[] = [];
  private errorTimer: number | null = null;

  private static readonly ROW_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: 14,
    centeredSlides: true,
    freeMode: { enabled: true, momentum: true, momentumRatio: 1, momentumBounceRatio: 1, sticky: false },
    mousewheel: { enabled: true, forceToAxis: true, sensitivity: 1, releaseOnEdges: false },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    watchOverflow: true,
    watchSlidesProgress: true,
  };

  constructor() {
    // The tracks row always ends with the ＋ tile, so its slide count is the tracks plus one.
    effect(() => {
      const count = this.soundtracks().length + 1;
      if (this.trackSwiper && this.trackSwiper.slides.length === count) {
        this.trackSwiper.update();
        return;
      }
      afterNextRender(() => this.initTrackSwiper(), { injector: this.injector });
    });

    // The playlists row always ends with the "New playlist" tile, so its count is the playlists + one.
    effect(() => {
      const count = this.ambiances().length + 1;
      if (this.ambianceSwiper && this.ambianceSwiper.slides.length === count) {
        this.ambianceSwiper.update();
        return;
      }
      afterNextRender(() => this.initAmbianceSwiper(), { injector: this.injector });
    });
  }

  ngOnInit() {
    this.library.load();
    this.subscriptions.push(
      this.audioPlayer.activeTrackIds$.subscribe(ids => this.activeTrackIds.set(ids)),
      this.audioPlayer.activeAmbianceIds$.subscribe(ids => this.activeAmbianceIds.set(ids)),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.errorTimer !== null) window.clearTimeout(this.errorTimer);
    this.destroyTrackSwiper();
    this.destroyAmbianceSwiper();
  }

  @HostListener('wheel', ['$event'])
  onHorizontalWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) event.preventDefault();
  }

  private initTrackSwiper() {
    if (!this.trackRowRef?.nativeElement) return;
    this.destroyTrackSwiper();
    this.trackSwiper = new Swiper(this.trackRowRef.nativeElement, SoundtrackLibraryComponent.ROW_OPTIONS);
  }

  private initAmbianceSwiper() {
    if (!this.ambianceRowRef?.nativeElement) return;
    this.destroyAmbianceSwiper();
    this.ambianceSwiper = new Swiper(this.ambianceRowRef.nativeElement, SoundtrackLibraryComponent.ROW_OPTIONS);
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

  displayName(title: string): string {
    return SoundtrackLibraryService.displayName(title);
  }

  /** The playlist's songs, by name, in the order they play. */
  ambianceTrackTitles(ambiance: AmbianceDomain): string[] {
    return ambiance.items.map(item => {
      const track = this.library.trackById(item.soundtrackId);
      return track ? this.displayName(track.title) : 'Unknown track';
    });
  }

  // ── Playback ────────────────────────────────────────────────────────────────

  isTrackPlaying(trackId: string): boolean {
    return this.activeTrackIds().includes(trackId);
  }

  playTrack(track: SoundtrackDomain) {
    this.audioPlayer.playTrack(track);
  }

  stopTrack(trackId: string) {
    this.audioPlayer.stopTrack(trackId);
  }

  isAmbiancePlaying(ambianceId: string): boolean {
    return this.activeAmbianceIds().includes(ambianceId);
  }

  // ── Editing a track ─────────────────────────────────────────────────────────

  editTrack(trackId: string) {
    this.router.navigate(['/gm/soundtracks/track', trackId]);
  }

  deleteTrack(track: SoundtrackDomain) {
    this.audioPlayer.stopTrack(track.id);
    this.library.remove(track.id).subscribe({
      error: () => this.showError('Failed to delete the soundtrack.'),
    });
  }

  toggleKind(track: SoundtrackDomain) {
    const kind: SoundtrackKind = track.kind === 'music' ? 'sound_effect' : 'music';
    this.library.update(track.id, {
      title: this.displayName(track.title),
      volume: track.volume,
      isLoop: kind === 'music' ? track.isLoop : false,
      loopDelaySeconds: kind === 'music' ? track.loopDelaySeconds ?? null : null,
      kind,
    }).subscribe({
      error: () => this.showError('Failed to update the track kind.'),
    });
  }

  onTrackVolumeChange(track: SoundtrackDomain, volume: number) {
    this.audioPlayer.updateTrackVolume(track.id, volume);
    this.library.update(track.id, {
      title: this.displayName(track.title),
      volume,
      isLoop: track.isLoop,
      loopDelaySeconds: track.loopDelaySeconds ?? null,
      kind: track.kind,
    }).subscribe({
      error: () => this.showError('Failed to update the volume.'),
    });
  }

  // ── Editing an ambiance ─────────────────────────────────────────────────────

  editAmbiance(ambianceId: string) {
    this.router.navigate(['/gm/soundtracks/ambiance', ambianceId]);
  }

  deleteAmbiance(ambianceId: string) {
    this.audioPlayer.stopAmbiance(ambianceId);
    this.library.removeAmbiance(ambianceId).subscribe({
      error: () => this.showError('Failed to delete the ambiance.'),
    });
  }

  // ── Adding a track ──────────────────────────────────────────────────────────

  chooseUpload(kind: SoundtrackKind) {
    if (this.uploading()) return;
    this.openUpload(kind);
  }

  private openUpload(kind: SoundtrackKind) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) this.uploadSoundtrack(file, kind);
    };
    input.click();
  }

  private uploadSoundtrack(file: File, kind: SoundtrackKind) {
    this.uploading.set(true);
    this.library.upload(file, kind).subscribe({
      next: () => this.uploading.set(false),
      error: () => {
        this.uploading.set(false);
        this.showError('Failed to upload a soundtrack. Check the size (max 25MB) and format.');
      },
    });
  }

  showError(message: string) {
    this.actionError.set(message);
    if (this.errorTimer !== null) window.clearTimeout(this.errorTimer);
    this.errorTimer = window.setTimeout(() => this.actionError.set(''), 3000);
  }
}
