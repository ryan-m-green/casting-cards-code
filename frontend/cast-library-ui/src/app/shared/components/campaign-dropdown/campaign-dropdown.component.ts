import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';
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
  @Output() valueChange = new EventEmitter<string>();

  isOpen = signal(false);

  get selected(): CampaignDropdownOption | undefined {
    return this.options.find(o => o.value === this.value);
  }

  toggle(e: MouseEvent) {
    e.stopPropagation();
    this.isOpen.update(v => !v);
  }

  select(option: CampaignDropdownOption) {
    this.valueChange.emit(option.value);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('app-campaign-dropdown')) {
      this.isOpen.set(false);
    }
  }
}
