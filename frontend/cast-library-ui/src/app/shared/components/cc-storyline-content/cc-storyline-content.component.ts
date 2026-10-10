import { Component, computed, effect, ElementRef, inject, input, OnDestroy, output, signal, untracked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CcTextboxComponent } from '../v2/cc-textbox/cc-textbox.component';
import { environment } from '../../../../environments/environment';

type SceneType = 'campaign-event' | 'campaign-handout';

/** Snapshot passed in when the drawer is opened to edit an existing storyline item. */
export interface StorylineContentEdit {
  id: string;
  title: string;
  body: string;
  sceneType: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-cc-storyline-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent],
  templateUrl: './cc-storyline-content.component.html',
  styleUrl: './cc-storyline-content.component.scss',
})
export class CcStorylineContentComponent implements OnDestroy {
  private http = inject(HttpClient);

  /** Campaign this storyline content belongs to. */
  campaignId = input.required<string>();

  /** Portal color used for accents (matching the rest of the v2 shell). */
  portalColor = input<string>('#6e28d0');

  /** Fired once a scene/handout has been successfully created. */
  readonly created = output<void>();

  /** When set, the form edits this existing storyline item instead of creating a new one. */
  editItem = input<StorylineContentEdit | null>(null);

  isEditMode = computed(() => !!this.editItem());

  // ── Create scene / handout form state (ported from gm-events create panel) ──
  eventTitle = signal('');
  sceneBody = signal('');
  captionBody = signal('');
  createSceneType = signal<SceneType>('campaign-event');
  createFile = signal<File | null>(null);
  createPreviewUrl = signal<string | null>(null);

  /** Body value for the currently selected mode (scene text vs handout caption). */
  currentBody = computed(() =>
    this.createSceneType() === 'campaign-handout' ? this.captionBody() : this.sceneBody()
  );

  /** True while editing once the item's original image has been dropped by switching back to scene mode. */
  imageDropped = signal(false);

  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  private successTimer: ReturnType<typeof setTimeout> | undefined;
  private fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  canSave = computed(() => {
    const title = this.eventTitle();
    const body = this.currentBody();
    const sceneType = this.createSceneType();
    const file = this.createFile();

    if (!title.trim()) return false;

    if (sceneType === 'campaign-event') {
      if (!body.trim()) return false;
    } else if (!this.isEditMode()) {
      // A file is only required when creating a new handout; editing keeps the existing image.
      if (!file) return false;
    }

    return true;
  });

  constructor() {
    // Populate the form whenever the drawer is opened for an existing item.
    // untracked() keeps this from re-running when the user changes the form
    // (toggling scene/handout, picking a file, etc).
    effect(() => {
      const seed = this.editItem();
      if (!seed) return;

      untracked(() => {
        this.eventTitle.set(seed.title ?? '');
        this.sceneBody.set(seed.sceneType === 'campaign-handout' ? '' : (seed.body ?? ''));
        this.captionBody.set(seed.sceneType === 'campaign-handout' ? (seed.body ?? '') : '');
        this.createSceneType.set(seed.sceneType === 'campaign-handout' ? 'campaign-handout' : 'campaign-event');
        this.imageDropped.set(false);
        this.clearPendingFile();
        this.saveError.set(null);
        this.saveSuccess.set(false);
      });
    });
  }

  onCreateSceneTypeChange(value: SceneType) {
    this.createSceneType.set(value);

    if (value === 'campaign-handout') {
      // Carry the scene text into the caption field when moving to handout mode.
      if (!this.captionBody().trim() && this.sceneBody().trim()) {
        this.captionBody.set(this.sceneBody());
      }
      return;
    }

    // Switching back to scene drops any staged image; in edit mode it also
    // drops the item's existing image so switching to handout requires a new upload.
    this.clearPendingFile();
    if (this.isEditMode()) {
      this.imageDropped.set(true);
    }
  }

  /**
   * Save only keeps the body for the active mode: saving a scene drops the caption
   * value, saving a handout drops the scene value (keeping the caption).
   */
  private dropInactiveBody() {
    if (this.createSceneType() === 'campaign-handout') {
      this.sceneBody.set('');
    } else {
      this.captionBody.set('');
    }
  }

  onCreateFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.createPreviewUrl();
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.createFile.set(file);
    this.createPreviewUrl.set(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  }

  saveEvent() {
    if (!this.canSave()) return;

    // Keep only the value for the active mode before saving.
    this.dropInactiveBody();

    if (this.isEditMode()) {
      this.saveEdit();
      return;
    }

    const campaignId = this.campaignId();
    const sceneType = this.createSceneType();

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    if (sceneType === 'campaign-event') {
      this.http.post(
        `${environment.apiUrl}/api/campaigns/${campaignId}/events`,
        {
          title: this.eventTitle().trim(),
          body: this.currentBody().trim(),
          linkedEntities: [],
          todPositionPercent: null,
          isVisibleToPlayers: false,
          soundtrackIds: [],
        }
      ).subscribe({
        next: () => this._finishSave(),
        error: () => {
          this.saving.set(false);
          this.saveError.set('Failed to save scene. Please try again.');
        },
      });
    } else {
      const payload: { title: string; body?: string; linkedEntities: unknown[]; soundtrackIds: string[] } = {
        title: this.eventTitle().trim(),
        linkedEntities: [],
        soundtrackIds: [],
      };
      const body = this.currentBody().trim();
      if (body) payload.body = body;

      this.http.post<{ id: string }>(
        `${environment.apiUrl}/api/campaigns/${campaignId}/events/handout`,
        payload
      ).subscribe({
        next: (created) => {
          const file = this.createFile();
          if (file) {
            const formData = new FormData();
            formData.append('file', file);
            this.http.post(
              `${environment.apiUrl}/api/campaigns/${campaignId}/events/${created.id}/handout-image`,
              formData
            ).subscribe({
              next: () => this._finishSave(),
              error: (err) => {
                this._resetCreateForm();
                this.saving.set(false);
                const raw = err?.error;
                const msg = typeof raw === 'string' && raw.length > 0
                  ? raw
                  : 'Handout saved but image upload failed.';
                this.saveError.set(msg);
              },
            });
          } else {
            this._finishSave();
          }
        },
        error: (err) => {
          this.saving.set(false);
          const raw = err?.error;
          const msg = typeof raw === 'string' && raw.length > 0
            ? raw
            : 'Failed to save handout. Please try again.';
          this.saveError.set(msg);
        },
      });
    }
  }

  private saveEdit() {
    const item = this.editItem();
    if (!item) return;

    const campaignId = this.campaignId();
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const payload = {
      title: this.eventTitle().trim(),
      body: this.currentBody(),
      sceneType: this.createSceneType(),
      linkedEntities: [],
      todPositionPercent: null,
      visibleToPlayers: false,
      soundtrackIds: [],
    };

    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${campaignId}/events/${item.id}/details`,
      payload
    ).subscribe({
      next: () => {
        const file = this.createFile();
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          this.http.post(
            `${environment.apiUrl}/api/campaigns/${campaignId}/events/${item.id}/handout-image`,
            formData
          ).subscribe({
            next: () => this._finishEditSave(),
            error: (err) => {
              this.saving.set(false);
              const raw = err?.error;
              const msg = typeof raw === 'string' && raw.length > 0
                ? raw
                : 'Details saved but image upload failed.';
              this.saveError.set(msg);
            },
          });
        } else {
          this._finishEditSave();
        }
      },
      error: (err) => {
        this.saving.set(false);
        const raw = err?.error;
        const msg = typeof raw === 'string' && raw.length > 0
          ? raw
          : 'Failed to save. Please try again.';
        this.saveError.set(msg);
      },
    });
  }

  private _finishEditSave() {
    this.clearPendingFile();
    this.saving.set(false);
    this.saveSuccess.set(true);
    this.successTimer = setTimeout(() => this.saveSuccess.set(false), 3000);
  }

  private _finishSave() {
    this.created.emit();
    this._resetCreateForm();
    this.saving.set(false);
    this.saveSuccess.set(true);
    this.successTimer = setTimeout(() => this.saveSuccess.set(false), 3000);
  }

  private _resetCreateForm() {
    this.eventTitle.set('');
    this.sceneBody.set('');
    this.captionBody.set('');
    this.createSceneType.set('campaign-event');
    this.clearPendingFile();
  }

  private clearPendingFile() {
    const prev = this.createPreviewUrl();
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.createPreviewUrl.set(null);
    this.createFile.set(null);
    const input = this.fileInputRef()?.nativeElement;
    if (input) input.value = '';
  }

  ngOnDestroy() {
    clearTimeout(this.successTimer);
    const prev = this.createPreviewUrl();
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
  }
}
