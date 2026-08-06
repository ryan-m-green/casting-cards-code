import { Component, input, signal, forwardRef, computed } from '@angular/core';
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

  isCampaignContext = computed(() => this.context() === 'campaign');

  imageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  hasImage = computed(() => this.imagePreviewUrl() !== null);

  private onChange: (value: File | null) => void = () => {};
  onTouched: () => void = () => {};

  onFileSelected(event: Event): void {
    if (this.disabled()) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return;
    }

    // Clean up previous preview URL
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);

    this.imageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
    this.onChange(file);
    this.onTouched();
  }

  removeImage(): void {
    if (this.disabled()) return;
    
    // Clean up preview URL
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);

    this.imageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.onChange(null);
    this.onTouched();
  }

  writeValue(value: File | null): void {
    if (value) {
      this.imageFile.set(value);
      // Create preview URL from File object
      const prev = this.imagePreviewUrl();
      if (prev) URL.revokeObjectURL(prev);
      this.imagePreviewUrl.set(URL.createObjectURL(value));
    } else {
      this.imageFile.set(null);
      const prev = this.imagePreviewUrl();
      if (prev) URL.revokeObjectURL(prev);
      this.imagePreviewUrl.set(null);
    }
  }

  registerOnChange(fn: (value: File | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handled via disabled input
  }
}
