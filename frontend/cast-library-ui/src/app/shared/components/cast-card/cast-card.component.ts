import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { Cast } from '../../models/cast.model';
import { LockIconComponent } from '../lock-icon/lock-icon.component';

@Component({
  selector: 'app-cast-card',
  standalone: true,
  imports: [LockIconComponent],
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
  @Input() rating          = 0;
  @Input() readonlyStars   = false;
  @Input() setStars: number | null = null;
  @Input() secretContent: string | null = null;
  @Input() dmMode          = false;
  @Input() isPrimary        = false;
  @Input() canSetPrimary    = false;
  @Input() primaryLocked    = false;
  @Input() factionSymbols: { factionInstanceId: string; symbolPath: string }[] = [];
  @Input() isTraveling: boolean | null = null;

  @Output() editClick      = new EventEmitter<void>();
  @Output() deleteClick    = new EventEmitter<void>();
  @Output() fileSelected   = new EventEmitter<File>();
  @Output() secretsClick   = new EventEmitter<void>();
  @Output() cardClick      = new EventEmitter<void>();
  @Output() primaryToggled = new EventEmitter<void>();

  flipped   = false;
  stars     = signal(0);
  starHover = signal<number | null>(null);

  readonly starNums = [1, 2, 3];

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

  onCrownClick(e: Event): void {
    e.stopPropagation();
    if (!this.canSetPrimary || this.primaryLocked) return;
    this.primaryToggled.emit();
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
    if (this.readonlyStars || this.setStars !== null) return;
    this.stars.set(this.stars() === n ? 0 : n);
  }

  onFileInputChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  starFilled(n: number): boolean {
    if (this.setStars !== null) return n <= this.setStars;
    if (this.readonlyStars) return n <= this.rating;
    return n <= (this.starHover() ?? this.stars());
  }

  readonly symbolCorners = [
    { top: '15%',  left: '80%', translateX: '-50%', translateY: '-50%' }, // TR
    { top: '85%',  left: '20%', translateX: '-50%', translateY: '-50%' }, // BL
    { top: '15%',  left: '20%', translateX: '-50%', translateY: '-50%' }, // TL
    { top: '85%',  left: '80%', translateX: '-50%', translateY: '-50%' }, // BR
  ];

  symbolStyle(index: number): Record<string, string> {
    const c = this.symbolCorners[index];
    return {
      top: c.top,
      left: c.left,
      transform: `translate(${c.translateX}, ${c.translateY})`,
    };
  }
}
