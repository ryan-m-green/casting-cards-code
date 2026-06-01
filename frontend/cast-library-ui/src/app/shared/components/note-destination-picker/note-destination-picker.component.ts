import { Component, Input, Output, EventEmitter, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignFactionInstance } from '../../models/faction.model';
import { CampaignPlayer } from '../../models/campaign.model';
import { TimeOfDay, TimeOfDaySlice } from '../../models/time-of-day.model';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../campaign-dropdown/campaign-dropdown.component';

interface LinkedItem {
  entityType: string;
  entityId: string;
  entityName: string;
  todPositionPercent?: number | null;
}

@Component({
  selector: 'app-note-destination-picker',
  standalone: true,
  imports: [CommonModule, CampaignDropdownComponent],
  templateUrl: './note-destination-picker.component.html',
  styleUrl: './note-destination-picker.component.scss',
})
export class NoteDestinationPickerComponent {
  private _destType = 'queue';

  @Input()
  get destType(): string {
    return this._destType;
  }
  set destType(value: string) {
    if (this._destType !== value) {
      this._destType = value;
      if (value === 'cast' || value === 'faction' || value === 'sublocation' || value === 'location' || value === 'player') {
        this.visibleToPlayersChange.emit(true);
      }
    }
  }
  @Input() entityId = '';
  @Input() showQueue = true;
  @Input() showPlayer = true;
  @Input() showNone = false;
  @Input() showTimeOfDay = false;
  @Input() tod: TimeOfDay | null = null;
  @Input() todPositionPercent: number | null = null;
  @Input() locations: CampaignLocationInstance[] = [];
  @Input() sublocations: CampaignSublocationInstance[] = [];
  @Input() casts: CampaignCastInstance[] = [];
  @Input() factions: CampaignFactionInstance[] = [];
  @Input() players: CampaignPlayer[] = [];
  @Input() campaignId = '';
  @Input() tabIndexBase = 2;
  @Input() multiselect = false;
  @Input() linkedEntities: LinkedItem[] = [];
  private _visibleToPlayers = false;

  @Input()
  get visibleToPlayers(): boolean {
    return this._visibleToPlayers;
  }
  set visibleToPlayers(value: boolean) {
    this._visibleToPlayers = value;
  }
  @Input() showCampaign = false;

  @Output() destTypeChange = new EventEmitter<string>();
  @Output() entityIdChange = new EventEmitter<string>();
  @Output() todPositionPercentChange = new EventEmitter<number | null>();
  @Output() enterOnDestType = new EventEmitter<string>();
  @Output() linkedEntitiesChange = new EventEmitter<LinkedItem[]>();
  @Output() visibleToPlayersChange = new EventEmitter<boolean>();

  private elRef = inject(ElementRef);

  get showEntitySelect(): boolean {
    return this.destType === 'location' || this.destType === 'sublocation'
      || this.destType === 'cast' || this.destType === 'faction'
      || this.destType === 'player' || this.destType === 'time-of-day';
  }

  get showPills(): boolean {
    return this.multiselect && this.linkedEntities.length > 0;
  }

  get isToggleDisabled(): boolean {
    return this.destType === 'cast' || this.destType === 'faction'
      || this.destType === 'sublocation' || this.destType === 'location'
      || this.destType === 'player' || this.destType === 'time-of-day';
  }

  get hasTimeTrigger(): boolean {
    return this.linkedEntities.some(item => item.entityType === 'time-of-day');
  }

  getVisibilityText(): string {
    // If "none" or "time-of-day", it's not visible to players
    if (this.destType === 'none' || this.destType === 'time-of-day') {
      return 'Not Visible To Players';
    }
    // All other entity types are visible to players
    return 'Visible To Players';
  }

  get locationOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select location —' },
      ...this.locations.filter(l => !l.isVisibleToPlayers).map(l => ({ value: l.instanceId, label: l.name })),
    ];
  }

  get sublocationOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select sublocation —' },
      ...this.sublocations.filter(s => !s.isVisibleToPlayers).map(s => ({ value: s.instanceId, label: s.name })),
    ];
  }

  get castOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select cast member —' },
      ...this.casts.filter(c => !c.isVisibleToPlayers).map(c => ({ value: c.instanceId, label: c.name })),
    ];
  }

  get factionOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select faction —' },
      ...this.factions.filter(f => !f.isVisibleToPlayers).map(f => ({ value: f.factionInstanceId, label: f.name })),
    ];
  }

  get playerOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select player —' },
      ...this.players.map(p => ({ value: p.userId, label: p.displayName })),
    ];
  }

  onDestTypeChange(value: string): void {
    if (this.multiselect && value === 'none') {
      this.linkedEntitiesChange.emit([]);
    }
    if (this.destType === 'time-of-day' && value !== 'time-of-day') {
      this.todPositionPercentChange.emit(null);
    }
    if (value === 'time-of-day') {
      this._visibleToPlayers = false;
      this.visibleToPlayersChange.emit(false);
    }
    if (value === 'none') {
      this._visibleToPlayers = false;
      this.visibleToPlayersChange.emit(false);
    }
    if (value === 'cast' || value === 'faction' || value === 'sublocation' || value === 'location' || value === 'player') {
      this._visibleToPlayers = true;
      this.visibleToPlayersChange.emit(true);
    }
    this.destTypeChange.emit(value);
    this.entityIdChange.emit('');
  }

  onKeyEnter(type: string): void {
    this.onDestTypeChange(type);
    if (type === 'queue' || type === 'campaign' || type === 'none' || type === 'time-of-day') {
      this.enterOnDestType.emit(type);
    } else {
      setTimeout(() => {
        const trigger = this.elRef.nativeElement.querySelector('.campaign-dropdown-trigger') as HTMLElement | null;
        trigger?.focus();
      });
    }
  }

  onEntitySelect(entityId: string): void {
    if (!entityId) return;
    this.entityIdChange.emit(entityId);
  }

  addTrigger(): void {
    const entityId = this.entityId;

    let entityName = '';
    let finalEntityId = entityId;
    let todPositionPercent: number | null = null;

    switch (this.destType) {
      case 'location':
        if (!entityId) return;
        entityName = this.locations.find(l => l.instanceId === entityId)?.name ?? '';
        break;
      case 'sublocation':
        if (!entityId) return;
        entityName = this.sublocations.find(s => s.instanceId === entityId)?.name ?? '';
        break;
      case 'cast':
        if (!entityId) return;
        entityName = this.casts.find(c => c.instanceId === entityId)?.name ?? '';
        break;
      case 'faction':
        if (!entityId) return;
        entityName = this.factions.find(f => f.factionInstanceId === entityId)?.name ?? '';
        break;
      case 'player':
        if (!entityId) return;
        entityName = this.players.find(p => p.userId === entityId)?.displayName ?? '';
        break;
      case 'campaign':
        entityName = 'Campaign';
        finalEntityId = this.campaignId;
        break;
      case 'time-of-day':
        finalEntityId = this.campaignId;
        todPositionPercent = this.todPositionPercent;
        if (todPositionPercent !== null && this.tod) {
          const slice = this.tod.slices.find(s => todPositionPercent! >= s.startPercent && todPositionPercent! < s.endPercent);
          entityName = slice?.label ?? 'Time of Day';
        } else {
          entityName = 'Time of Day';
        }
        break;
      default:
        return;
    }

    const newItem: LinkedItem = {
      entityType: this.destType,
      entityId: finalEntityId,
      entityName,
      todPositionPercent
    };

    this.linkedEntitiesChange.emit([...this.linkedEntities, newItem]);
    this.entityIdChange.emit('');
  }

  removeLinkedItem(index: number): void {
    const updated = [...this.linkedEntities];
    updated.splice(index, 1);
    this.linkedEntitiesChange.emit(updated);
  }

  sliceMiniStyle(slice: TimeOfDaySlice, index: number): Record<string, string> {
    const slices = this.tod?.slices ?? [];
    const widthPct = slice.endPercent - slice.startPercent;
    const nextColor = slices[(index + 1) % slices.length]?.color ?? slice.color;
    const isLast = index === slices.length - 1;
    const gradient = isLast
      ? `linear-gradient(to right, ${slice.color}, ${slice.color} calc(100% - 12px), ${nextColor} 100%)`
      : `linear-gradient(to right, ${slice.color}, ${nextColor})`;
    return {
      'flex-basis': `${widthPct}%`,
      'background-image': gradient,
    };
  }

  onMiniBarClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    this.todPositionPercentChange.emit(pct);
  }

  onMiniBarClear(): void {
    this.todPositionPercentChange.emit(null);
  }

  onVisibleToPlayersToggle(): void {
    this.visibleToPlayersChange.emit(!this.visibleToPlayers);
  }
}
