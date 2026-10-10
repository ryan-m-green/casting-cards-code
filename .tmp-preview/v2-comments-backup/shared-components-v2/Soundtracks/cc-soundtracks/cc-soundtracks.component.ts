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
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/v2-grid-area-mark.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { SoundtrackDomain, AmbianceDomain } from '../../../../models/soundtrack.model';
import { CcSliderComponent } from '../cc-slider/cc-slider.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';

/** The two kinds of thing a soundtrack can be, as the Add Track panel offers them. */
type SoundtrackKind = 'music' | 'sound_effect';

@Component({
  selector: 'app-cc-soundtracks',
  standalone: true,
  imports: [CommonModule, CcSliderComponent, CcEditButtonComponent, CcDeleteButtonComponent],
  /**
   * OnPush: the library, the ambiances and what is playing are all signals, so the panel is redrawn
   * when one of them moves — an ambiance written by another client, say (see `applyAmbianceChanged`)
   * — and not on every check the page takes.
   */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-soundtracks.component.html',
  styleUrl: './cc-soundtracks.component.scss',
})
export class CcSoundtracksComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private audioPlayer = inject(AudioPlayerService);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(V2CampaignShellService);
  private gridLoad = inject(V2GridLoadService);
  private injector = inject(Injector);

  /**
   * What the middle-right area is known by — the heading over the library, and the mark it wears on
   * the radial navigator — published for as long as the library stands in the area. The library is
   * the DM's own (see the shell's own `@if`), so a player — who is handed no soundtracks panel at
   * all — publishes nothing here: the area keeps a bare heading and a bare button (see
   * V2GridAreaMarkService).
   */
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

  /**
   * The library cards ticked for the ambiance card being built — each one wears a purple check in
   * its corner — taken to the drawer as the new card's items when ＋ Ambiance is pressed (see
   * `toggleSelected` and `openAmbianceCreator`).
   */
  selectedTrackIds = signal<string[]>([]);

  uploading = signal(false);
  errorMessage = signal('');

  /**
   * Whether the area is playing anything at all — a track of its own or an ambiance card's whole
   * arrangement. What ■ All has to stop: while nothing is playing there is nothing for it to do, so
   * the control is held (see `stopAll`).
   */
  hasPlayingAudio = computed(() => this.activeTrackIds().length > 0 || this.activeAmbianceIds().length > 0);

  /**
   * The two rows, each with its own Swiper: the library's cards above, the ambiance buttons below.
   * Both are held the way every other row in the campaign holds one (see cc-party-panel, which keeps
   * two of them): made afresh whenever the cards under them change shape, and taken down with the
   * last of them.
   */
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
      // The library row always holds one slide more than the tracks that are in it: the tile that
      // adds a soundtrack stands at its end, and slides with the cards as the realm's own "New
      // location" tile slides with its locations (see the row's markup, and cc-card-navigation).
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
      this.hub.soundtrackVolumeChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.applyTrackVolume(event.soundtrackId, event.volume);
      }),
      this.audioPlayer.masterVolume$.subscribe(volume => this.masterVolume.set(volume)),
      this.shellSvc.ambianceChanged.subscribe(() => this.loadAmbiances(this.campaignId())),

      // The playlist the ticks were gathered for has been written in the drawer: they are spent, so
      // the cards drop their purple checks and the ＋ Playlist button goes back to standing bare —
      // no count on it and nothing ticked behind it (see V2CampaignShellService.ambianceSaved).
      this.shellSvc.ambianceSaved.subscribe(() => this.selectedTrackIds.set([])),

      // An ambiance written by another client: the ambiance travels with the event now, so the list
      // here takes the change on from what it is handed rather than reading the campaign's list
      // back — one entry rewritten, and the panel redrawn around it. An event with no ambiance on it
      // is a deletion, and its id says which entry to drop.
      this.hub.ambianceChanged$.subscribe(event => {
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

  /**
   * Swallow horizontal wheel/trackpad gestures, as every other row in the campaign does, so the
   * browser does not read them as back/forward history navigation (which shows the left-edge arrow
   * and reloads the page).
   */
  @HostListener('wheel', ['$event'])
  onHorizontalWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
    }
  }

  // ── Rows ───────────────────────────────────────────────────────────────────
  /**
   * What both rows are set up with, as every other card row in the campaign is: free-form sideways
   * dragging — the cards follow the hand and keep their momentum — with the wheel turned along the
   * row rather than down the page.
   *
   * The row is centred on a slide, as the card navigation's own rows are (see cc-card-navigation):
   * it opens with the first card standing in the middle of the screen — halfway across the row — and
   * every card after it comes to the middle in turn as the row is turned, rather than the row running
   * out at its ends with the last card stranded against the right edge.
   */
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

  /** One row's own Swiper, hearing every time that row moves under the hand. */
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

  // ── Library ────────────────────────────────────────────────────────────────
  loadSoundtracks(id: string) {
    this.http.get<SoundtrackDomain[]>(`${environment.apiUrl}/api/campaigns/${id}/soundtracks`).subscribe({
      next: tracks => {
        this.soundtracks.set(tracks);
        // The ticks follow the library: a track that is gone is no longer ticked for a card.
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

  /**
   * The campaign's list of ambiances with one entry written into it: the entry the event names takes
   * what the event carries, joins the list where it is new, or leaves it where the event carries
   * nothing — a deletion. Only the entry that changes is copied and a list with nothing to do is
   * handed back as it stands, so another client's write costs one entry's redraw here.
   */
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

  // ── Uploads ────────────────────────────────────────────────────────────────
  /**
   * One half of the Add Track tile was pressed — its top half for music, its bottom half for a sound
   * effect — so the file picker opens for that kind. The kind is said by the half that was pressed
   * rather than asked for by a panel of its own (see the tile in the toolbar).
   */
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

  /**
   * The library card's own click: it ticks the track for the ambiance card being built, and unticks
   * one that is already in. The tick it wears is the check in the card's top-right corner.
   */
  toggleSelected(track: SoundtrackDomain) {
    this.selectedTrackIds.update(ids =>
      ids.includes(track.id) ? ids.filter(id => id !== track.id) : [...ids, track.id]
    );
  }

  isSelected(trackId: string): boolean {
    return this.selectedTrackIds().includes(trackId);
  }

  /**
   * The delete control's own answer (see cc-delete-button): the track goes, and so does any tick it
   * was wearing. A card that was playing stops with it.
   */
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

  // ── Building an ambiance card ──────────────────────────────────────────────
  /**
   * The ＋ Ambiance button: the ticked tracks are handed to the shell's drawer as the new card's
   * items, and the card is named, ordered and finished there — the same drawer an existing card is
   * edited in, with the same volume, pause and randomise controls (see cc-soundtrack-content).
   *
   * The ticks are left standing while the drawer is open, so what the drawer was handed is exactly
   * what the library shows behind it.
   */
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

  // ── Ambiances ──────────────────────────────────────────────────────────────
  /**
   * The card's one button, both play and stop, exactly as a library card carries its own: pressed
   * with nothing playing it starts the whole arrangement, and pressed while it plays it stops.
   */
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

  /**
   * The card's delete control's own answer (see cc-delete-button): an ambiance that is playing stops
   * with the card.
   */
  confirmDeleteAmbiance(ambianceId: string) {
    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/ambiances/${ambianceId}`).subscribe({
      next: () => {
        this.audioPlayer.stopAmbiance(ambianceId);
        this.ambiances.update(list => list.filter(a => a.id !== ambianceId));
      },
      error: () => this.showError('Failed to delete ambiance.')
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  /**
   * A soundtrack's volume is the single source of truth. When it changes (locally or via the
   * SoundtrackVolumeChanged hub event) keep every UI mirror in sync: the library cards, the persisted
   * ambiance item snapshots, and currently-playing audio.
   */
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
