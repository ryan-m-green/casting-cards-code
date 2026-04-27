import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Sublocation, CampaignSublocationInstance } from '../../models/sublocation.model';
import { LockIconComponent } from '../lock-icon/lock-icon.component';

@Component({
  selector: 'app-sublocation-card',
  standalone: true,
  imports: [LockIconComponent],
  templateUrl: './sublocation-card.component.html',
  styleUrl: './sublocation-card.component.scss'
})
export class SublocationCardComponent {
  @Input({ required: true }) sublocation!: Sublocation | CampaignSublocationInstance;
  @Input() editable        = true;
  @Input() flippable       = true;
  @Input() queueable       = false;
  @Input() tilt            = 0;
  @Input() imageUpload     = false;
  @Input() secrets         = false;
  @Input() secretsRevealed = false;
  @Input() campaignMode    = false;
  @Input() secretContent: string | null = null;

  @Output() editClick    = new EventEmitter<void>();
  @Output() deleteClick  = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() secretsClick = new EventEmitter<void>();
  @Output() cardClick    = new EventEmitter<void>();

  flipped = false;

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  get shopItemCount(): number {
    return this.sublocation.shopItems?.length ?? 0;
  }

  toggleFlip(e: Event): void {
    if (this.campaignMode) { this.cardClick.emit(); return; }
    if (this.flippable) this.flipped = !this.flipped;
  }

  onSecretsClick(e: Event): void {
    e.stopPropagation();
    this.secretsClick.emit();
  }

  onEditClick(e: Event): void {
    e.stopPropagation();
    if (this.editable) this.editClick.emit();
  }

  onDeleteClick(e: Event): void {
    e.stopPropagation();
    this.deleteClick.emit();
  }

  onFileInputChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.fileSelected.emit(file);
  }
}
