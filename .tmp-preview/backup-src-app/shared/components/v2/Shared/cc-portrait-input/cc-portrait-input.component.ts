import { Component, input, signal, forwardRef, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'cc-portrait-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CcPortraitInputComponent),
      multi: true
    }
  ],
  templateUrl: './cc-portrait-input.component.html',
  styleUrl: './cc-portrait-input.component.scss',
})
export class CcPortraitInputComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly context = input<'journal' | 'campaign'>('journal');
  readonly initialImageUrl = input<string>('');
  readonly cardType = input<'location' | 'sublocation' | 'cast' | 'faction'>('location');
  /**
   * The campaign card whose frame this portrait should wear: pick the one the portrait's instance
   * belongs to and its border is drawn from the very colours that card's own frame is built from
   * (see cc-location-card, cc-sublocation-card, cc-cast-card and cc-player-card). Left unset the
   * portrait keeps its own gold default.
   */
  readonly borderStyle = input<'location' | 'sublocation' | 'cast' | 'player' | null>(null);
  /**
   * Shows the portrait as a plain frame of its own: no picker, no hover prompt and no dimming. For
   * places that display a portrait without editing it (cc-my-character's card — its drawer is what
   * changes the image).
   */
  readonly readOnly = input<boolean>(false);

  isCampaignContext = computed(() => this.context() === 'campaign');

  /** Either mode means the portrait can't be swapped from here. */
  isLocked = computed(() => this.disabled() || this.readOnly());

  imageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  hasImage = computed(() => this.imagePreviewUrl() !== null);

  constructor() {
    effect(() => {
      const url = this.initialImageUrl();
      if (url) {
        this.imagePreviewUrl.set(url);
      }
    });
  }

  private onChange: (value: File | null) => void = () => {};
  onTouched: () => void = () => {};

  onFileSelected(event: Event): void {
    if (this.isLocked()) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return;
    }

    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);

    this.imageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
    this.onChange(file);
    this.onTouched();
  }

  writeValue(value: File | null): void {
    if (value) {
      this.imageFile.set(value);
      const prev = this.imagePreviewUrl();
      if (prev) URL.revokeObjectURL(prev);
      this.imagePreviewUrl.set(URL.createObjectURL(value));
    } else {
      this.imageFile.set(null);
      if (!this.initialImageUrl()) {
        const prev = this.imagePreviewUrl();
        if (prev) URL.revokeObjectURL(prev);
        this.imagePreviewUrl.set(null);
      }
    }
  }

  registerOnChange(fn: (value: File | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
  }
}
