import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SoundtrackDomain } from '../../../shared/models/soundtrack.model';
import { SoundtrackKind, SoundtrackLibraryService } from '../../../core/soundtrack-library.service';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';

/**
 * The Soundtrack Library's edit page, written as a journal form the way the cast card page is:
 * journal title, a "← Library" header, `fi` fields, and the save at the bottom-left. A track is
 * added by uploading it (the ＋ tile at the end of the library's row), so this page only ever edits
 * a track the library already holds.
 */
@Component({
  selector: 'app-soundtrack-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, JournalTitleComponent],
  templateUrl: './soundtrack-form.component.html',
  styleUrl: './soundtrack-form.component.scss',
})
export class SoundtrackFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly library = inject(SoundtrackLibraryService);
  private readonly fb = inject(FormBuilder);

  private readonly trackId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly form = this.fb.group({
    title: ['', Validators.required],
  });

  readonly track = signal<SoundtrackDomain | null>(null);
  readonly kind = signal<SoundtrackKind>('music');
  readonly volume = signal(80);
  readonly isLoop = signal(false);
  readonly loopDelaySeconds = signal<number | null>(null);

  readonly saving = signal(false);
  readonly error = signal('');

  /** True once the library has been read and the track was not in it. */
  readonly notFound = computed(() => this.library.loaded() && !this.track());

  /** Whether the loop controls apply — a sound effect never loops. */
  showsLoop(): boolean {
    return this.kind() === 'music';
  }

  constructor() {
    // The shelf may not have been read yet (a deep link), so the track is seeded once it lands.
    effect(() => {
      if (this.track() || !this.library.loaded()) return;

      const found = this.library.soundtracks().find(t => t.id === this.trackId);
      if (found) this.seed(found);
    });
  }

  ngOnInit() {
    this.library.load();
  }

  private seed(track: SoundtrackDomain) {
    this.track.set(track);
    this.form.setValue({ title: SoundtrackLibraryService.displayName(track.title) }, { emitEvent: false });
    this.kind.set(track.kind);
    this.volume.set(track.volume);
    this.isLoop.set(track.isLoop);
    this.loopDelaySeconds.set(track.loopDelaySeconds ?? null);
  }

  setKind(kind: SoundtrackKind) {
    this.kind.set(kind);
    // A sound effect never loops, so picking one turns the loop off.
    if (kind === 'sound_effect') this.isLoop.set(false);
  }

  onVolume(value: string) {
    const parsed = Number(value);
    this.volume.set(Number.isFinite(parsed) ? Math.round(parsed) : 0);
  }

  onLoopToggle(checked: boolean) {
    this.isLoop.set(checked);
  }

  onLoopDelay(value: string) {
    const parsed = Number(value);
    this.loopDelaySeconds.set(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null);
  }

  save() {
    const track = this.track();
    if (!track || this.saving() || this.form.invalid || this.notFound()) return;

    const kind = this.kind();
    const loop = kind === 'music' && this.isLoop();

    this.saving.set(true);
    this.error.set('');

    this.library.update(track.id, {
      title: (this.form.value.title ?? '').trim(),
      volume: this.volume(),
      isLoop: loop,
      loopDelaySeconds: loop ? this.loopDelaySeconds() : null,
      kind,
    }).subscribe({
      next: () => this.router.navigate(['/gm/soundtracks']),
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save the track. Try again.');
      },
    });
  }
}