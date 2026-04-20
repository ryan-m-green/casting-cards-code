import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Location } from '../../models/location.model';

@Component({
  selector: 'app-location-card',
  standalone: true,
  imports: [],
  templateUrl: './location-card.component.html',
  styleUrl: './location-card.component.scss'
})
export class LocationCardComponent {
  @Input({ required: true }) location!: Location;
  @Input() editable        = true;
  @Input() flippable       = true;
  @Input() queueable       = false;
  @Input() tilt            = 0;
  @Input() imageUpload     = false;
  @Input() secrets         = false;
  @Input() secretsRevealed = false;
  @Input() campaignMode    = false;

  @Output() editClick    = new EventEmitter<void>();
  @Output() deleteClick  = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() secretsClick = new EventEmitter<void>();
  @Output() cardClick    = new EventEmitter<void>();

  flipped = false;

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  get terrainType(): 'city' | 'mountain' | 'forest' | 'dungeon' {
    const cls = (this.location.classification || '').toLowerCase();
    if (cls.includes('city') || cls.includes('town') || cls.includes('village')) return 'city';
    if (cls.includes('mountain') || cls.includes('hill'))                        return 'mountain';
    if (cls.includes('forest') || cls.includes('wood') || cls.includes('jungle')) return 'forest';
    return 'dungeon';
  }

  get stats(): { k: string; v: string }[] {
    const l = this.location;
    return [
      { k: 'Type',         v: l.classification || '—' },
      { k: 'Size',         v: l.size           || '—' },
      { k: 'Condition',    v: l.condition       || '—' },
      { k: 'Geography',    v: l.geography       || '—' },
      { k: 'Architecture', v: l.architecture    || '—' },
      { k: 'Climate',      v: l.climate         || '—' },
      { k: 'Religion',     v: l.religion        || '—' },
      { k: 'Vibe',         v: l.vibe            || '—' },
    ];
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
