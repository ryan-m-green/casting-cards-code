import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, forwardRef, inject, input, output, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CONDITION_COLOR_CHOICES, ConditionColorChoice } from '../../../models/condition.model';

/**
 * A colour picker shaped like `cc-campaign-dropdown`: a trigger showing the colour in hand, and a
 * panel of swatches to choose from. It is a `ControlValueAccessor`, so it drops into a form with
 * `[ngModel]` and asks for nothing else.
 */
@Component({
  selector: 'cc-color-dropdown',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CcColorDropdownComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-color-dropdown.component.html',
  styleUrl: './cc-color-dropdown.component.scss',
})
export class CcColorDropdownComponent implements ControlValueAccessor {
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly options = input<readonly ConditionColorChoice[]>(CONDITION_COLOR_CHOICES);
  readonly label = input('');
  readonly placeholder = input('Choose a color');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  readonly value = signal('');
  readonly isOpen = signal(false);
  readonly activeIndex = signal(-1);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selected = computed<ConditionColorChoice | null>(() => {
    const chosen = this.value().trim().toLowerCase();

    return this.options().find(choice => choice.hex.toLowerCase() === chosen) ?? null;
  });

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) return;

    if (this.isOpen()) {
      this.close();
      return;
    }

    this.open();
  }

  select(choice: ConditionColorChoice): void {
    if (this.disabled()) return;

    this.value.set(choice.hex);
    this.onChange(choice.hex);
    this.onTouched();
    this.valueChange.emit(choice.hex);
    this.close();
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    const options = this.options();

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!this.isOpen()) {
        this.open();
        return;
      }

      if (!options.length) return;

      const next = event.key === 'ArrowDown'
        ? (this.activeIndex() + 1) % options.length
        : (this.activeIndex() - 1 + options.length) % options.length;
      this.activeIndex.set(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      if (!this.isOpen()) {
        this.open();
        return;
      }

      const choice = options[this.activeIndex()];
      if (choice) this.select(choice);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) this.close();
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(): void {
  }

  private open(): void {
    this.isOpen.set(true);

    const current = this.options().findIndex(
      choice => choice.hex.toLowerCase() === this.value().trim().toLowerCase());
    this.activeIndex.set(current >= 0 ? current : 0);
  }

  private close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }
}
