import { Component, Input, Output, EventEmitter, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignFactionInstance } from '../../models/faction.model';
import { CampaignPlayer } from '../../models/campaign.model';
import { TimeOfDay, TimeOfDaySlice } from '../../models/time-of-day.model';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../campaign-dropdown/campaign-dropdown.component';

@Component({
  selector: 'app-note-destination-picker',
  standalone: true,
  imports: [CommonModule, CampaignDropdownComponent],
  templateUrl: './note-destination-picker.component.html',
  styleUrl: './note-destination-picker.component.scss',
})
export class NoteDestinationPickerComponent {
  @Input() destType = 'queue';
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
  @Input() tabIndexBase = 2;

  @Output() destTypeChange = new EventEmitter<string>();
  @Output() entityIdChange = new EventEmitter<string>();
  @Output() todPositionPercentChange = new EventEmitter<number | null>();
  @Output() enterOnDestType = new EventEmitter<string>();

  private elRef = inject(ElementRef);

  get showEntitySelect(): boolean {
    return this.destType === 'location' || this.destType === 'sublocation'
      || this.destType === 'cast' || this.destType === 'faction'
      || this.destType === 'player' || this.destType === 'time-of-day';
  }

  get locationOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select location —' },
      ...this.locations.map(l => ({ value: l.instanceId, label: l.name })),
    ];
  }

  get sublocationOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select sublocation —' },
      ...this.sublocations.map(s => ({ value: s.instanceId, label: s.name })),
    ];
  }

  get castOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select cast member —' },
      ...this.casts.map(c => ({ value: c.instanceId, label: c.name })),
    ];
  }

  get factionOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select faction —' },
      ...this.factions.map(f => ({ value: f.factionInstanceId, label: f.name })),
    ];
  }

  get playerOptions(): CampaignDropdownOption[] {
    return [
      { value: '', label: '— select player —' },
      ...this.players.map(p => ({ value: p.userId, label: p.displayName })),
    ];
  }

  onDestTypeChange(value: string): void {
    if (this.destType === 'time-of-day' && value !== 'time-of-day') {
      this.todPositionPercentChange.emit(null);
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
}
