import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CardRevealOverlayData {
  cardType: 'city' | 'sublocation' | 'cast';
  name: string;
  descriptor: string;
  imageUrl?: string;
  secretContent?: string;
}

@Component({
  selector: 'app-card-reveal-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-reveal-overlay.component.html',
  styleUrl: './card-reveal-overlay.component.scss',
})
export class CardRevealOverlayComponent {
  @Input() data: CardRevealOverlayData | null = null;
  @Output() dismissed = new EventEmitter<void>();

  dismiss() {
    this.dismissed.emit();
  }

  initial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
