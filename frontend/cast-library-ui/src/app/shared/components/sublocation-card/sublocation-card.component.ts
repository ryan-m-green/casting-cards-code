import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Sublocation } from '../../models/sublocation.model';

@Component({
  selector: 'app-sublocation-card',
  standalone: true,
  imports: [],
  templateUrl: './sublocation-card.component.html',
  styleUrl: './sublocation-card.component.scss'
})
export class SublocationCardComponent {
  @Input({ required: true }) sublocation!: Sublocation;
  @Input() editable  = true;
  @Input() flippable = true;
  @Input() tilt      = 0;

  @Output() editClick   = new EventEmitter<void>();
  @Output() deleteClick = new EventEmitter<void>();

  flipped = false;

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  get shopItemCount(): number {
    return this.sublocation.shopItems?.length ?? 0;
  }

  toggleFlip(e: Event): void {
    if (this.flippable) this.flipped = !this.flipped;
  }

  onEditClick(e: Event): void {
    e.stopPropagation();
    if (this.editable) this.editClick.emit();
  }

  onDeleteClick(e: Event): void {
    e.stopPropagation();
    this.deleteClick.emit();
  }
}
