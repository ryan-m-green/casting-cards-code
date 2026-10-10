import { Component, ChangeDetectionStrategy, inject, input, Output, EventEmitter, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Faction, CampaignFactionInstance } from '../../../models/faction.model';
import { CcLockButtonComponent } from '../cc-lock-button/cc-lock-button.component';
import { CcFactionIconComponent } from '../cc-faction-icon/cc-faction-icon.component';
import { CcDeleteButtonComponent } from '../cc-delete-button/cc-delete-button.component';
import { CampaignShellService } from '../../../../core/campaign-shell.service';
import { DrawerService } from '../../../../core/drawer.service';
import { AuthService } from '../../../../core/auth/auth.service';

export type FactionAlignment = 'good' | 'neutral' | 'evil';

@Component({
  selector: 'cc-faction-card',
  standalone: true,
  imports: [CommonModule, CcLockButtonComponent, CcFactionIconComponent, CcDeleteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-faction-card.component.html',
  styleUrl: './cc-faction-card.component.scss'
})
export class CcFactionCardComponent {
  private shellSvc = inject(CampaignShellService);
  private drawerService = inject(DrawerService);
  private auth = inject(AuthService);

  faction = input.required<Faction | CampaignFactionInstance>();
  tilt = input(0);
  flippable = input(true);
  editable = input(true);
  deletable = input(false);
  deleting = input(false);
  imageUpload = input(false);
  campaignMode = input(false);
  details = input(false);
  secrets = input(false);
  secretsRevealed = input(false);
  relationshipType = input<string | null>(null);
  relationshipStrength = input<number | null>(null);
  titleSearch = input(true);

  @Output() editClick    = new EventEmitter<void>();
  @Output() deleteClick  = new EventEmitter<void>();
  @Output() cardClick    = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() secretsClick = new EventEmitter<void>();

  flipped = false;

  get alignment(): FactionAlignment {
    const p = this.faction().perception ?? 0;
    if (p > 0) return 'good';
    if (p < 0) return 'evil';
    return 'neutral';
  }

  get isGood(): boolean    { return this.alignment === 'good'; }
  get isNeutral(): boolean { return this.alignment === 'neutral'; }
  get isEvil(): boolean    { return this.alignment === 'evil'; }

  get alignLabel(): string {
    if (this.isGood)    return 'Friendly Faction';
    if (this.isNeutral) return 'Unknown Alignment';
    return 'Hostile Faction';
  }

  get alignStat(): string {
    if (this.isGood)    return 'Friendly';
    if (this.isNeutral) return 'Unknown';
    return 'Hostile';
  }

  get portraitHint(): string {
    if (this.isGood)    return 'Banner of the Alliance';
    if (this.isNeutral) return 'Allegiance Unrevealed';
    return 'Mark of the Dark Order';
  }

  get imageUrl(): string | undefined {
    const f = this.faction();
    return 'imageUrl' in f ? f.imageUrl : undefined;
  }

  goodColor = computed(() => {
    const customColor = this.faction().colors?.goodColor;
    if (customColor && customColor !== '#000000') return customColor;
    return '#ff99bb';
  });

  evilColor = computed(() => {
    const customColor = this.faction().colors?.evilColor;
    if (customColor && customColor !== '#000000') return customColor;
    return '#004d1a';
  });

  get tiltTransform(): string {
    return this.tilt() ? `rotate(${this.tilt()}deg)` : '';
  }

  readonly influence = computed(() => {
    const value = this.faction().influence ?? 0;
    return Math.min(10, Math.max(0, Math.round(value)));
  });

  get stats(): { k: string; v: string }[] {
    return [
      { k: 'Type',      v: this.faction().type },
      { k: 'Influence', v: this.faction().influence ? String(this.faction().influence) : '' },
    ];
  }

  @ViewChild(CcDeleteButtonComponent) deleteButton?: CcDeleteButtonComponent;

  toggleFlip(e: Event): void {
    if (this.campaignMode()) { this.cardClick.emit(); return; }
    if (this.flippable()) {
      this.flipped = !this.flipped;
      if (!this.flipped) this.deleteButton?.reset();
    } else {
      this.cardClick.emit();
    }
  }

  onConfirmDelete(): void {
    this.deleteClick.emit();
  }

  onSecretsClick(e: Event): void {
    e.stopPropagation();
    this.secretsClick.emit();
  }

  onDetailsClick(e: Event): void {
    e.stopPropagation();
    const f = this.faction();
    if (!('factionInstanceId' in f)) return;
    this.drawerService.openFactionDetail({
      faction: f,
      campaignId: f.campaignId,
      isDm: this.auth.isDm()
    });
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

  onNameClick(e: Event): void {
    e.stopPropagation();
    if (!this.titleSearch()) return;
    this.shellSvc.openChronicleDrawerWithSearch(this.faction().name);
  }
}
