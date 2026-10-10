import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, ViewChild } from '@angular/core';

import { Sublocation, CampaignSublocationInstance } from '../../../models/sublocation.model';

import { CcLockButtonComponent } from '../cc-lock-button/cc-lock-button.component';
import { CcSublocationIconComponent } from '../cc-sublocation-icon/cc-sublocation-icon.component';
import { CcDeleteButtonComponent } from '../cc-delete-button/cc-delete-button.component';
import { CampaignShellService } from '../../../../core/campaign-shell.service';
import { DrawerService } from '../../../../core/drawer.service';

@Component({

  selector: 'cc-sublocation-card',

  standalone: true,

  imports: [CcLockButtonComponent, CcSublocationIconComponent, CcDeleteButtonComponent],

  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './cc-sublocation-card.component.html',

  styleUrl: './cc-sublocation-card.component.scss'

})

export class CcSublocationCardComponent {

  private shellSvc = inject(CampaignShellService);
  private drawerService = inject(DrawerService);

  @Input({ required: true }) sublocation!: Sublocation | CampaignSublocationInstance;

  @Input() editable        = true;

  @Input() flippable       = true;

  @Input() queueable       = false;

  @Input() tilt            = 0;

  @Input() imageUpload     = false;

  @Input() secrets         = false;

  @Input() secretsRevealed = false;

  @Input() secretsDisabled = false;

  @Input() campaignMode    = false;

  @Input() isDm            = false;

  @Input() isPrimary        = false;

  @Input() canSetPrimary    = false;

  @Input() primaryLocked    = false;

  @Input() secretContent: string | null = null;

  @Input() symbolPath: string | null = null;

  @Input() cardSecrets: any[] = [];

  @Output() editClick      = new EventEmitter<void>();
  @Output() deleteClick    = new EventEmitter<void>();
  @Output() fileSelected   = new EventEmitter<File>();
  @Output() secretsClick   = new EventEmitter<void>();
  @Output() cardClick      = new EventEmitter<void>();
  @Output() primaryToggled = new EventEmitter<void>();
  @Output() detailsClick   = new EventEmitter<void>();

  @Input() campaignId: string | null = null;
  @Input() sublocationInstanceId: string | null = null;

  @Input() deletable  = false;
  @Input() deleting   = false;
  @Input() titleSearch = true;

  flipped = false;

  get tiltTransform(): string {

    return this.tilt ? `rotate(${this.tilt}deg)` : '';

  }

  get shopItemCount(): number {

    return this.sublocation.shopItems?.length ?? 0;

  }

  toggleFlip(e: Event): void {
    if (this.flippable) this.flipped = !this.flipped;
    if (!this.flipped) this.deleteButton?.reset();
  }

  @ViewChild(CcDeleteButtonComponent) deleteButton?: CcDeleteButtonComponent;

  onConfirmDelete(): void {
    this.deleteClick.emit();
  }

  onSecretsClick(e: Event): void {

    e.stopPropagation();

    if (!this.isDm) return;

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

  onFileInputChange(e: Event): void {

    const file = (e.target as HTMLInputElement).files?.[0];

    if (file) this.fileSelected.emit(file);

  }

  onDetailsClick(e: Event): void {
    e.stopPropagation();
    this.drawerService.openSublocationDetail({
      sublocation: this.sublocation,
      secrets: this.cardSecrets,
      campaignId: this.campaignId,
      sublocationInstanceId: this.sublocationInstanceId
    });
  }

  onNameClick(e: Event): void {

    e.stopPropagation();

    if (!this.titleSearch) return;

    this.shellSvc.openChronicleDrawerWithSearch(this.sublocation.name);

  }

}

