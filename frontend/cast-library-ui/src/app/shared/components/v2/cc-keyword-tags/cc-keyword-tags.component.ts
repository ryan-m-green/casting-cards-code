import { Component, input, output, signal, computed, forwardRef, HostListener, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'cc-keyword-tags',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KeywordTagsComponent),
      multi: true
    }
  ],
  templateUrl: './cc-keyword-tags.component.html',
  styleUrl: './cc-keyword-tags.component.scss',
})
export class KeywordTagsComponent implements ControlValueAccessor {
  readonly options = input<string[]>([]);
  readonly label = input<string>('');
  readonly placeholder = input<string>('Add or select hashtags…');
  readonly disabled = input<boolean>(false);
  readonly keywordsChange = output<string[]>();

  keywords = signal<string[]>([]);
  inputValue = signal<string>('');
  isOpen = signal(false);
  activeIndex = signal(-1);

  @ViewChildren('optionItem') optionItems!: QueryList<ElementRef<HTMLLIElement>>;

  filteredOptions = computed(() => {
    const filter = this.inputValue().trim().toLowerCase();
    const selected = new Set(this.keywords().map(k => k.toLowerCase()));
    const opts = this.options().filter(o => !selected.has(o.toLowerCase()));
    if (!filter) return opts;
    return opts.filter(o => o.toLowerCase().includes(filter));
  });

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  addKeyword(raw: string): void {
    const value = (raw ?? '').trim().replace(/^#/, '');
    if (!value) return;

    const lower = value.toLowerCase();
    if (this.keywords().some(k => k.toLowerCase() === lower)) {
      this.inputValue.set('');
      return;
    }

    const next = [...this.keywords(), value];
    this.keywords.set(next);
    this.onChange(next);
    this.onTouched();
    this.keywordsChange.emit(next);
    this.inputValue.set('');
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  removeKeyword(value: string): void {
    const next = this.keywords().filter(k => k !== value);
    this.keywords.set(next);
    this.onChange(next);
    this.onTouched();
    this.keywordsChange.emit(next);
  }

  onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.inputValue.set(el.value);
    this.isOpen.set(true);
    this.activeIndex.set(-1);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addKeyword(this.inputValue());
    } else if (event.key === 'Backspace' && !this.inputValue() && this.keywords().length) {
      const last = this.keywords()[this.keywords().length - 1];
      this.removeKeyword(last);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const len = this.filteredOptions().length;
      if (!len) return;
      if (!this.isOpen()) this.isOpen.set(true);
      const next = event.key === 'ArrowDown'
        ? (this.activeIndex() + 1) % len
        : (this.activeIndex() - 1 + len) % len;
      this.activeIndex.set(next);
      this.scrollActiveIntoView();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.isOpen.set(false);
      this.activeIndex.set(-1);
    }
  }

  select(option: string): void {
    this.addKeyword(option);
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) return;
    this.isOpen.update(v => !v);
    if (this.isOpen()) this.activeIndex.set(-1);
  }

  onFocus(): void {
    this.isOpen.set(true);
  }

  onBlur(): void {
    setTimeout(() => this.isOpen.set(false), 200);
  }

  private scrollActiveIntoView(): void {
    const items = this.optionItems?.toArray();
    const idx = this.activeIndex();
    if (items && items[idx]) {
      items[idx].nativeElement.scrollIntoView({ block: 'nearest' });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('cc-keyword-tags')) {
      this.isOpen.set(false);
      this.activeIndex.set(-1);
    }
  }

  writeValue(value: string[]): void {
    this.keywords.set(value ?? []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handled via disabled input
  }
}
