import { Component, Input, Output, EventEmitter, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignFactionInstance } from '../../models/faction.model';
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
  @Input() locations: CampaignLocationInstance[] = [];
  @Input() sublocations: CampaignSublocationInstance[] = [];
  @Input() casts: CampaignCastInstance[] = [];
  @Input() factions: CampaignFactionInstance[] = [];
  @Input() tabIndexBase = 2;

  @Output() destTypeChange = new EventEmitter<string>();
  @Output() entityIdChange = new EventEmitter<string>();
  @Output() enterOnDestType = new EventEmitter<string>();

  private elRef = inject(ElementRef);

  get showEntitySelect(): boolean {
    return this.destType === 'location' || this.destType === 'sublocation'
      || this.destType === 'cast' || this.destType === 'faction';
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

  onDestTypeChange(value: string): void {
    this.destTypeChange.emit(value);
    this.entityIdChange.emit('');
  }

  onKeyEnter(type: string): void {
    this.onDestTypeChange(type);
    if (type === 'queue' || type === 'campaign') {
      this.enterOnDestType.emit(type);
    } else {
      setTimeout(() => {
        const trigger = this.elRef.nativeElement.querySelector('.campaign-dropdown-trigger') as HTMLElement | null;
        trigger?.focus();
      });
    }
  }
}
