import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upgrade-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upgrade-badge.component.html',
  styleUrl: './upgrade-badge.component.scss'
})
export class UpgradeBadgeComponent {
  @Input() visible = true;
  @Output() badgeClick = new EventEmitter<void>();

  onClick() {
    this.badgeClick.emit();
  }
}
