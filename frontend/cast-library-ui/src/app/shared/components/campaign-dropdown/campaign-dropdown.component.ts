import { Component, Input, Output, EventEmitter, signal, HostListener, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CampaignDropdownOption {
  value: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-campaign-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campaign-dropdown.component.html',
  styleUrl: './campaign-dropdown.component.scss',
})
export class CampaignDropdownComponent {
  @Input() options: CampaignDropdownOption[] = [];
  @Input() value = '';
  @Input() fontSize = '14px';
  @Input() triggerTabIndex = 0;
  @Output() valueChange = new EventEmitter<string>();

  @ViewChildren('optionItem') optionItems!: QueryList<ElementRef<HTMLLIElement>>;

  isOpen = signal(false);
  activeIndex = signal(-1);

  get selected(): CampaignDropdownOption | undefined {
    return this.options.find(o => o.value === this.value);
  }

  toggle(e: MouseEvent) {
    e.stopPropagation();
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.activeIndex.set(-1);
    } else {
      this.isOpen.set(true);
      const cur = this.options.findIndex(o => o.value === this.value);
      this.activeIndex.set(cur >= 0 ? cur : 0);
      setTimeout(() => this.scrollActiveIntoView());
    }
  }

  onTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.isOpen()) {
        this.isOpen.set(true);
        const cur = this.options.findIndex(o => o.value === this.value);
        this.activeIndex.set(cur >= 0 ? cur : 0);
        setTimeout(() => this.scrollActiveIntoView());
        return;
      }
      const len = this.options.length;
      if (len === 0) return;
      const next = event.key === 'ArrowDown'
        ? (this.activeIndex() + 1) % len
        : (this.activeIndex() - 1 + len) % len;
      this.activeIndex.set(next);
      this.scrollActiveIntoView();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.isOpen()) {
        this.isOpen.set(true);
        const cur = this.options.findIndex(o => o.value === this.value);
        this.activeIndex.set(cur >= 0 ? cur : 0);
        setTimeout(() => this.scrollActiveIntoView());
      } else {
        const idx = this.activeIndex();
        if (idx >= 0 && idx < this.options.length) {
          this.select(this.options[idx]);
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
    this.valueChange.emit(option.value);
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('app-campaign-dropdown')) {
      this.isOpen.set(false);
      this.activeIndex.set(-1);
    }
  }
}
