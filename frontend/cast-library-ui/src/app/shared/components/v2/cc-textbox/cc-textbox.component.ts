import { Component, input, output, signal, computed, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-cc-textbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CcTextboxComponent),
      multi: true
    }
  ],
  templateUrl: './cc-textbox.component.html',
  styleUrl: './cc-textbox.component.scss'
})
export class CcTextboxComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<'text' | 'textarea'>('text');
  readonly rows = input<number>(3);
  readonly disabled = input<boolean>(false);
  readonly autocomplete = input<string>('off');
  readonly id = input<string>(`textbox-${Math.random().toString(36).substr(2, 9)}`);
  readonly context = input<'journal' | 'campaign'>('journal');
  readonly showClear = input<boolean>(false);
  
  readonly valueChange = output<string>();
  
  value = signal<string>('');
  
  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  isTextarea = computed(() => this.type() === 'textarea');
  isCampaignContext = computed(() => this.context() === 'campaign');
  showClearButton = computed(() => this.showClear() && this.value().length > 0 && !this.isTextarea());
  
  onValueChange(newValue: string) {
    this.value.set(newValue);
    this.onChange(newValue);
    this.valueChange.emit(newValue);
  }

  onClear(): void {
    this.value.set('');
    this.onChange('');
    this.valueChange.emit('');
  }
  
  writeValue(value: string): void {
    this.value.set(value || '');
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