import { Component, effect, input, output, signal, forwardRef, HostListener, ElementRef, QueryList, ViewChildren, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

export interface CampaignDropdownOption {
  value: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'cc-campaign-dropdown',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CampaignDropdownComponent),
      multi: true
    }
  ],
  templateUrl: './cc-campaign-dropdown.component.html',
  styleUrl: './cc-campaign-dropdown.component.scss',
})
export class CampaignDropdownComponent implements ControlValueAccessor, OnInit {
  readonly options = input<CampaignDropdownOption[]>([]);
  readonly label = input<string>('');
  readonly fontSize = input<string>('14px');
  readonly triggerTabIndex = input<number>(0);
  readonly disabled = input<boolean>(false);
  readonly placeholder = input<string>('Select or type...');
  readonly matchOnly = input<boolean>(false);
  readonly valueChange = output<string>();

  value = signal<string>('');
  inputValue = signal<string>('');
  filteredOptions = signal<CampaignDropdownOption[]>([]);
  
  @ViewChildren('optionItem') optionItems!: QueryList<ElementRef<HTMLLIElement>>;

  isOpen = signal(false);
  activeIndex = signal(-1);

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const opts = this.options();
      this.filteredOptions.set(opts);
      const selectedOption = opts.find(o => o.value === this.value());
      if (selectedOption) {
        this.inputValue.set(selectedOption.label);
      }
    });
  }

  get selected(): CampaignDropdownOption | undefined {
    return this.options().find(o => o.value === this.value());
  }

  ngOnInit(): void {
    this.filteredOptions.set(this.options());
    const selectedOption = this.options().find(o => o.value === this.value());
    this.inputValue.set(selectedOption?.label || this.value());
  }

  toggle(e: MouseEvent) {
    e.stopPropagation();
    if (this.disabled() || this.isOpen() || !this.canOpenFor(this.inputValue())) {
      this.isOpen.set(false);
      this.activeIndex.set(-1);
    } else {
      this.isOpen.set(true);
      this.filterOptions(this.inputValue());
      const cur = this.filteredOptions().findIndex(o => o.value === this.value());
      this.activeIndex.set(cur >= 0 ? cur : 0);
      setTimeout(() => this.scrollActiveIntoView());
    }
  }

  onInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newValue = inputElement.value;
    this.inputValue.set(newValue);
    this.filterOptions(newValue);
    this.isOpen.set(this.canOpenFor(newValue));
  }

  onFocus(): void {
    this.filterOptions(this.inputValue());
    this.isOpen.set(this.canOpenFor(this.inputValue()));
  }

  onBlur(): void {
    setTimeout(() => {
      this.isOpen.set(false);
    }, 200);
  }

  clearValue(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.value.set('');
    this.inputValue.set('');
    this.onChange('');
    this.valueChange.emit('');
    this.filterOptions('');
    if (!this.canOpenFor('')) this.isOpen.set(false);
  }

  onTriggerKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;
    
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen()) {
        if (!this.canOpenFor(this.inputValue())) return;
        this.isOpen.set(true);
        this.filterOptions(this.inputValue());
        const cur = this.filteredOptions().findIndex(o => o.value === this.value());
        this.activeIndex.set(cur >= 0 ? cur : 0);
        setTimeout(() => this.scrollActiveIntoView());
        return;
      }
      const len = this.filteredOptions().length;
      if (len === 0) return;
      const next = event.key === 'ArrowDown'
        ? (this.activeIndex() + 1) % len
        : (this.activeIndex() - 1 + len) % len;
      this.activeIndex.set(next);
      this.scrollActiveIntoView();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.isOpen()) {
        if (!this.canOpenFor(this.inputValue())) return;
        this.isOpen.set(true);
        this.filterOptions(this.inputValue());
        const cur = this.filteredOptions().findIndex(o => o.value === this.value());
        this.activeIndex.set(cur >= 0 ? cur : 0);
        setTimeout(() => this.scrollActiveIntoView());
      } else {
        const idx = this.activeIndex();
        if (idx >= 0 && idx < this.filteredOptions().length) {
          this.select(this.filteredOptions()[idx]);
        }
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.isOpen.set(false);
      this.activeIndex.set(-1);
    }
  }

  private scrollActiveIntoView() {
    const items = this.optionItems?.toArray();
    const idx = this.activeIndex();
    if (items && items[idx]) {
      items[idx].nativeElement.scrollIntoView({ block: 'nearest' });
    }
  }

  select(option: CampaignDropdownOption) {
    this.value.set(option.value);
    this.inputValue.set(option.label);
    this.onChange(option.value);
    this.onTouched();
    this.valueChange.emit(option.value);
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  private filterOptions(filterText: string): void {
    if (!filterText) {
      this.filteredOptions.set(this.matchOnly() ? [] : this.options());
      return;
    }

    const lowerFilter = filterText.toLowerCase();
    this.filteredOptions.set(
      this.options().filter(option =>
        option.label.toLowerCase().includes(lowerFilter) ||
        option.value.toLowerCase().includes(lowerFilter)
      )
    );
  }

  private canOpenFor(filterText: string): boolean {
    return !this.matchOnly() || !!filterText.trim();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('cc-campaign-dropdown')) {
      this.isOpen.set(false);
      this.activeIndex.set(-1);
    }
  }

  writeValue(value: string): void {
    this.value.set(value || '');
    const selectedOption = this.options().find(o => o.value === value);
    this.inputValue.set(selectedOption?.label || value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
  }
}