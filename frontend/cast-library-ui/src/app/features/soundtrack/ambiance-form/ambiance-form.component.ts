import {
  Component, OnInit, OnDestroy, computed, effect, inject, signal,
  ElementRef, Injector, ViewChild, afterNextRender
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { AmbianceDomain, PlaylistTrackItem, SoundtrackDomain } from '../../../shared/models/soundtrack.model';
import { AudioPlayerService } from '../../../core/audio-player.service';
import { SoundtrackLibraryService, AmbianceItemDraft, AmbianceDraft } from '../../../core/soundtrack-library.service';
import { Subscription } from 'rxjs';
import { CcPlaylistTrackCardComponent } from '../../../shared/components/Campaign/Soundtracks/cc-playlist-track-card/cc-playlist-track-card.component';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';

/**
 * The Soundtrack Library's playlist editor.
 *
 * Songs are picked by tapping the cards in the swipable soundtrack row: each tap drops that
 * soundtrack into the running order below, which is itself a swipable row of track cards — each card
 * holding the whole of its entry's options (volume, and for a sound effect its pause and randomness).
 */
@Component({
  selector: 'app-ambiance-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CcPlaylistTrackCardComponent, JournalTitleComponent],
  templateUrl: './ambiance-form.component.html',
  styleUrl: './ambiance-form.component.scss',
})
export class AmbianceFormComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly library = inject(SoundtrackLibraryService);
  private readonly audioPlayer = inject(AudioPlayerService);
  private readonly injector = inject(Injector);

  private readonly ambianceId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly ambiance = signal<AmbianceDomain | null>(null);
  readonly title = signal('');
  readonly randomizeMusic = signal(false);
  readonly items = signal<PlaylistTrackItem[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');

  /** The tracks that are sounding right now, so a card's button can be a play or a stop. */
  readonly activeTrackIds = signal<string[]>([]);

  /** True while the builder is making a new playlist rather than editing one. */
  readonly isCreating = computed(() => this.ambianceId === '');

  readonly notFound = computed(() => !this.isCreating() && this.library.loaded() && !this.ambiance());

  /** The GM's soundtracks — the pool a playlist is picked from. */
  readonly soundtracks = this.library.soundtracks;

  @ViewChild('trackRow', { static: false }) trackRowRef!: ElementRef<HTMLElement>;
  @ViewChild('trackCardRow', { static: false }) trackCardRowRef!: ElementRef<HTMLElement>;

  /** The sweep the soundtrack cards are picked from. */
  private swiper: Swiper | null = null;

  /** The sweep the running order of track cards is kept in. */
  private itemsSwiper: Swiper | null = null;

  private readonly subscriptions: Subscription[] = [];

  private static readonly ROW_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: 12,
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
    // The shelf may not have been read yet (a deep link), so the playlist is seeded once it lands.
    effect(() => {
      if (this.isCreating() || this.ambiance() || !this.library.loaded()) return;

      const found = this.library.ambiances().find(a => a.id === this.ambianceId);
      if (found) this.seed(found);
    });

    // The row is swept as its cards arrive; a row with nothing in it is left un-swept.
    effect(() => {
      if (this.soundtracks().length === 0) {
        this.destroySwiper();
        return;
      }
      if (this.swiper) {
        this.swiper.update();
        return;
      }
      afterNextRender(() => this.initSwiper(), { injector: this.injector });
    });

    // The running order is swept the same way, and re-swept as songs are added, moved or taken out.
    effect(() => {
      if (this.items().length === 0) {
        this.destroyItemsSwiper();
        return;
      }
      if (this.itemsSwiper) {
        this.itemsSwiper.update();
        return;
      }
      afterNextRender(() => this.initItemsSwiper(), { injector: this.injector });
    });
  }

  ngOnInit() {
    this.library.load();

    this.subscriptions.push(
      this.audioPlayer.activeTrackIds$.subscribe(ids => this.activeTrackIds.set(ids))
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroySwiper();
    this.destroyItemsSwiper();
  }

  private initSwiper() {
    if (!this.trackRowRef?.nativeElement) return;
    this.destroySwiper();
    this.swiper = new Swiper(this.trackRowRef.nativeElement, AmbianceFormComponent.ROW_OPTIONS);
  }

  private destroySwiper() {
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
  }

  private initItemsSwiper() {
    if (!this.trackCardRowRef?.nativeElement) return;
    this.destroyItemsSwiper();
    this.itemsSwiper = new Swiper(this.trackCardRowRef.nativeElement, AmbianceFormComponent.ROW_OPTIONS);
  }

  private destroyItemsSwiper() {
    if (this.itemsSwiper) {
      this.itemsSwiper.destroy(true, true);
      this.itemsSwiper = null;
    }
  }

  // ── Picking songs ───────────────────────────────────────────────────────────

  displayName(title: string): string {
    return SoundtrackLibraryService.displayName(title);
  }

  soundtrackTitle(id: string): string {
    const track = this.library.trackById(id);
    return track ? this.displayName(track.title) : 'Unknown track';
  }

  isSoundEffect(id: string): boolean {
    return this.library.trackById(id)?.kind === 'sound_effect';
  }

  isPicked(soundtrackId: string): boolean {
    return this.items().some(item => item.soundtrackId === soundtrackId);
  }

  // ── Previewing a track ──────────────────────────────────────────────────────

  isTrackPlaying(trackId: string): boolean {
    return this.activeTrackIds().includes(trackId);
  }

  playTrack(track: SoundtrackDomain) {
    this.audioPlayer.playTrack(track);
  }

  stopTrack(trackId: string) {
    this.audioPlayer.stopTrack(trackId);
  }

  /** Tapping a card stacks its soundtrack onto the list; tapping it again takes it out. */
  togglePick(track: SoundtrackDomain) {
    if (this.isPicked(track.id)) {
      this.items.update(list => list.filter(item => item.soundtrackId !== track.id));
      return;
    }

    this.items.update(list => [...list, {
      soundtrackId: track.id,
      volume: track.volume,
      pauseMode: 'none',
      pauseDelaySeconds: null,
      pauseMinSeconds: null,
      pauseMaxSeconds: null,
    }]);
  }

  // ── The track list ──────────────────────────────────────────────────────────

  removeItem(index: number) {
    this.items.update(list => list.filter((_, i) => i !== index));
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

  onItemVolumeChange(index: number, volume: number) {
    this.items.update(list => list.map((row, i) => (i === index ? { ...row, volume } : row)));
  }

  // ── Saving ──────────────────────────────────────────────────────────────────

  private seed(ambiance: AmbianceDomain) {
    this.ambiance.set(ambiance);
    this.title.set(ambiance.title);
    this.randomizeMusic.set(ambiance.randomizeMusic);
    this.items.set(ambiance.items.map(i => ({
      soundtrackId: i.soundtrackId,
      volume: i.volume ?? 80,
      pauseMode: i.pauseMode,
      pauseDelaySeconds: i.pauseDelaySeconds ?? null,
      pauseMinSeconds: i.pauseMinSeconds ?? null,
      pauseMaxSeconds: i.pauseMaxSeconds ?? null,
    })));
  }

  save() {
    if (this.saving() || this.notFound()) return;

    const title = this.title().trim();
    if (!title) {
      this.error.set('A title is required.');
      return;
    }

    const items = this.items();
    if (items.length === 0) {
      this.error.set('Add at least one track.');
      return;
    }

    const draft: AmbianceDraft = {
      title,
      randomizeMusic: this.randomizeMusic(),
      items: items.map<AmbianceItemDraft>(i => ({
        soundtrackId: i.soundtrackId,
        volume: i.volume,
        pauseMode: i.pauseMode,
        pauseDelaySeconds: i.pauseMode === 'manual' ? i.pauseDelaySeconds : null,
        pauseMinSeconds: i.pauseMode === 'random' ? i.pauseMinSeconds : null,
        pauseMaxSeconds: i.pauseMode === 'random' ? i.pauseMaxSeconds : null,
      })),
    };

    this.saving.set(true);
    this.error.set('');

    const write = this.isCreating()
      ? this.library.createAmbiance(draft)
      : this.library.updateAmbiance(this.ambianceId, draft);

    write.subscribe({
      next: () => this.router.navigate(['/gm/soundtracks']),
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save the playlist. Try again.');
      },
    });
  }

  remove() {
    const ambiance = this.ambiance();
    if (!ambiance) return;

    this.library.removeAmbiance(ambiance.id).subscribe({
      next: () => this.router.navigate(['/gm/soundtracks']),
      error: () => this.error.set('Could not delete the playlist. Try again.'),
    });
  }
}