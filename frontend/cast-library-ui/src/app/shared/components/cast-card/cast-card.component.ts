import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { Cast } from '../../models/cast.model';

@Component({
  selector: 'app-cast-card',
  standalone: true,
  imports: [],
  templateUrl: './cast-card.component.html',
  styleUrl: './cast-card.component.scss'
})
export class CastCardComponent {
  @Input({ required: true }) cast!: Cast;
  @Input() editable        = true;
  @Input() flippable       = true;
  @Input() queueable       = false;
  @Input() tilt            = 0;
  @Input() showStars       = false;
  @Input() imageUpload     = false;
  @Input() secrets         = false;
  @Input() secretsRevealed = false;
  @Input() campaignMode    = false;

  @Output() editClick    = new EventEmitter<void>();
  @Output() deleteClick  = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() secretsClick = new EventEmitter<void>();
  @Output() cardClick    = new EventEmitter<void>();

  flipped   = false;
  stars     = signal(0);
  starHover = signal<number | null>(null);

  readonly starNums = [1, 2, 3];

  get stats(): { k: string; v: string }[] {
    const c = this.cast;
    const rows: { k: string; v: string }[] = [
      { k: 'Pronouns',  v: c.pronouns  || '—' },
      { k: 'Age',       v: c.age       || '—' },
      { k: 'Race',      v: c.race      || '—' },
      { k: 'Alignment', v: c.alignment || '—' },
      { k: 'Posture',   v: c.posture   || '—' },
      { k: 'Speed',     v: c.speed     || '—' },
    ];
    if (c.voicePlacement?.length) {
      rows.push({ k: 'Voice', v: c.voicePlacement.join(', ') });
    }
    return rows;
  }

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
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

  onStarClick(e: Event, n: number): void {
    e.stopPropagation();
    this.stars.set(this.stars() === n ? 0 : n);
  }

  onFileInputChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  starFilled(n: number): boolean {
    return n <= (this.starHover() ?? this.stars());
  }
}
