import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portal-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-card.component.html',
  styleUrl: './portal-card.component.scss',
})
export class PortalCardComponent {
  @Input() name: string = '';
  @Input() description: string = '';
  @Input() portalColor: string = '#6e28d0';
  @Input() showPortal: boolean = true;
  @Input() showSettings: boolean = true;
  @Input() sceneText: string = '';
  @Output() settingsClick = new EventEmitter<void>();

  safeColor(): string {
    const color = this.portalColor;
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  onSettingsClick(event: Event) {
    event.stopPropagation();
    this.settingsClick.emit();
  }
}
