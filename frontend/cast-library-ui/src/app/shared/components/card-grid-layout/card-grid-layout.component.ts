import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortalImportCardComponent } from '../portal-import-card/portal-import-card.component';
import { SectionLabelComponent } from '../section-label/section-label.component';
import { LockIconComponent } from '../lock-icon/lock-icon.component';

@Component({
  selector: 'app-card-grid-layout',
  standalone: true,
  imports: [
    CommonModule,
    PortalImportCardComponent,
    SectionLabelComponent,
    LockIconComponent
  ],
  templateUrl: './card-grid-layout.component.html',
  styleUrls: ['./card-grid-layout.component.scss']
})
export class CardGridLayoutComponent {
  @Input() sectionTitle: string = '';
  @Input() sectionColor: string = '';
  @Input() items: any[] = [];
  @Input() cardType: 'location' | 'sublocation' | 'cast' | 'faction' = 'location';
  @Input() isDm: boolean = false;
  @Input() showImportCard: boolean = false;
  @Input() trackBy: string = 'instanceId';
  @Input() gridClass: string = 'cl-grid';
  @Input() paddingClass: string = 'dm-padding';
  @Input() showSectionLabel: boolean = true;
  
  @Input() campaign: any;
  @Input() importCardRef: any;
  @Input() targetGridEl: any;
  @Input() initialInstances: any[] = [];
  @Input() locationInstanceId: string = '';
  @Input() sublocationInstanceId: string = '';
  @Input() drawerOpen: boolean = false;
  @Input() removableInstanceIds: Set<string> = new Set();
  @Input() pendingInstanceIds: Set<string> = new Set();
  @Input() allVisible: boolean = false;
  @Input() showRevealAll: boolean = false;
  @Input() getTiltFn: (instanceId: string) => number = () => 0;
  
  @Output() cardClick = new EventEmitter<string>();
  @Output() removeClick = new EventEmitter<{ instanceId: string; event: Event }>();
  @Output() secretsClick = new EventEmitter<any>();
  @Output() importAdded = new EventEmitter<any>();
  @Output() importRemoved = new EventEmitter<any>();
  @Output() revealAllClick = new EventEmitter<void>();
  @Output() drawerOpenChange = new EventEmitter<boolean>();

  @ViewChild('gridElement') gridElement!: ElementRef;

  private cardTilts = new Map<string, number>();

  getTilt(instanceId: string): number {
    if (this.getTiltFn) {
      return this.getTiltFn(instanceId);
    }
    if (!this.cardTilts.has(instanceId)) {
      const magnitude = 2;
      this.cardTilts.set(instanceId, Math.random() < 0.5 ? -magnitude : magnitude);
    }
    return this.cardTilts.get(instanceId)!;
  }

  trackByFn(item: any): string {
    return item[this.trackBy];
  }

  onCardClick(instanceId: string): void {
    this.cardClick.emit(instanceId);
  }

  onRemoveClick(instanceId: string, event: Event): void {
    this.removeClick.emit({ instanceId, event });
  }

  onSecretsClick(item: any): void {
    this.secretsClick.emit(item);
  }

  onRevealAllClick(): void {
    this.revealAllClick.emit();
  }

  onDrawerToggle(): void {
    this.drawerOpenChange.emit(!this.drawerOpen);
  }

  shouldShowRemoveButton(instanceId: string): boolean {
    return this.isDm && this.drawerOpen && this.removableInstanceIds.has(instanceId);
  }

  isItemPending(instanceId: string): boolean {
    return this.pendingInstanceIds.has(instanceId);
  }
}
