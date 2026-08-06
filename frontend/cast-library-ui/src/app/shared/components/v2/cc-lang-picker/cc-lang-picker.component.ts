import { Component, input, signal, forwardRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const ALL_LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
  'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal',
  'Primordial', 'Aquan', 'Auran', 'Ignan', 'Terran',
  'Sylvan', 'Undercommon', 'Druidic', "Thieves' Cant",
  'Aarakocra', 'Gith', 'Modron', 'Slaad', 'Sphinx',
  'Bullywug', 'Hook Horror', 'Sahuagin', 'Troglodyte',
  'Drow Sign Language', 'Ixitxachitl',
];

@Component({
  selector: 'cc-lang-picker',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CcLangPickerComponent),
      multi: true
    }
  ],
  templateUrl: './cc-lang-picker.component.html',
  styleUrl: './cc-lang-picker.component.scss'
})
export class CcLangPickerComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly context = input<'journal' | 'campaign'>('journal');

  isCampaignContext = computed(() => this.context() === 'campaign');

  selectedLanguages = signal<string[]>([]);
  availableLanguages = computed(() =>
    ALL_LANGUAGES.filter(l => !this.selectedLanguages().includes(l))
  );

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  addLanguage(lang: string): void {
    if (this.disabled()) return;
    this.selectedLanguages.update(list => [...list, lang]);
    this.updateValue();
    this.onTouched();
  }

  removeLanguage(lang: string): void {
    if (this.disabled()) return;
    this.selectedLanguages.update(list => list.filter(l => l !== lang));
    this.updateValue();
    this.onTouched();
  }

  private updateValue(): void {
    const value = this.selectedLanguages().join(', ');
    this.onChange(value);
  }

  writeValue(value: string): void {
    if (value) {
      const languages = value.split(',').map((l: string) => l.trim()).filter(Boolean);
      this.selectedLanguages.set(languages);
    } else {
      this.selectedLanguages.set([]);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handled via disabled input
  }
}