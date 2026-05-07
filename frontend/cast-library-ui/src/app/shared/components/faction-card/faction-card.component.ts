import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Faction } from '../../models/faction.model';
import { LockIconComponent } from '../lock-icon/lock-icon.component';

export type FactionAlignment = 'good' | 'neutral' | 'evil';

@Component({
  selector: 'app-faction-card',
  standalone: true,
  imports: [CommonModule, LockIconComponent],
  templateUrl: './faction-card.component.html',
  styleUrl: './faction-card.component.scss'
})
export class FactionCardComponent {
  @Input({ required: true }) faction!: Faction;
  @Input() tilt            = 0;
  @Input() flippable       = true;
  @Input() editable        = true;
  @Input() imageUpload     = false;
  @Input() campaignMode    = false;
  @Input() secrets         = false;
  @Input() secretsRevealed = false;
  @Input() influenceGlow: number | null | undefined = undefined;
  @Input() relationshipType: string | null = null;
  @Input() relationshipStrength: number | null = null;

  @Output() editClick    = new EventEmitter<void>();
  @Output() deleteClick  = new EventEmitter<void>();
  @Output() cardClick    = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() secretsClick = new EventEmitter<void>();

  flipped = false;

  get alignment(): FactionAlignment {
    const p = this.faction.perception ?? 0;
    if (p > 0) return 'good';
    if (p < 0) return 'evil';
    return 'neutral';
  }

  get isGood(): boolean    { return this.alignment === 'good'; }
  get isNeutral(): boolean { return this.alignment === 'neutral'; }
  get isEvil(): boolean    { return this.alignment === 'evil'; }

  get alignLabel(): string {
    if (this.isGood)    return 'Benevolent Faction';
    if (this.isNeutral) return 'Unknown Alignment';
    return 'Malevolent Faction';
  }

  get alignStat(): string {
    if (this.isGood)    return 'Benevolent';
    if (this.isNeutral) return 'Unknown';
    return 'Malevolent';
  }

  get portraitHint(): string {
    if (this.isGood)    return 'Banner of the Alliance';
    if (this.isNeutral) return 'Allegiance Unrevealed';
    return 'Mark of the Dark Order';
  }

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  get glowBoxShadow(): string {
    if (this.influenceGlow == null || this.influenceGlow <= 0) return '';
    const val    = Math.min(10, Math.max(1, this.influenceGlow));
    const t      = val / 10;
    // Floor alpha so level 1 is clearly visible; scale up to full intensity at 10
    const alpha1 = (0.35 + t * 0.65).toFixed(2);
    const alpha2 = (0.20 + t * 0.40).toFixed(2);
    const blur1  = Math.round(12 + t * 20);
    const blur2  = Math.round(20 + t * 30);
    const spread = Math.round(4  + t * 10);
    return `0 0 ${blur1}px ${spread}px rgba(255,220,80,${alpha1}), 0 0 ${blur2}px ${spread}px rgba(255,140,20,${alpha2})`;
  }

  get stats(): { k: string; v: string }[] {
    return [
      { k: 'Type',      v: this.faction.type },
      { k: 'Influence', v: this.faction.influence ? String(this.faction.influence) : '' },
    ];
  }

  toggleFlip(e: Event): void {
    if (this.campaignMode) { this.cardClick.emit(); return; }
    if (this.flippable) this.flipped = !this.flipped;
    else this.cardClick.emit();
  }

  onSecretsClick(e: Event): void {
    e.stopPropagation();
    this.secretsClick.emit();
  }

  onEditClick(e: Event): void {
    e.stopPropagation();
    this.editClick.emit();
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
