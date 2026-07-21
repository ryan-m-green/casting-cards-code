import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';

@Component({
  selector: 'app-travel-anchor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './travel-anchor.component.html',
  styleUrl: './travel-anchor.component.scss'
})
export class TravelAnchorComponent {
  @Input({ required: true }) drawerOpen!: boolean;
  @Input() selectedLocationId: string | null = null;

  @Input({ required: true }) campaignId!: string;
  @Input({ required: true }) castInstanceId!: string;
  @Input({ required: true }) sublocationInstanceId!: string;
  @Input({ required: true }) partyAnchor!: CampaignSublocationInstance | null;
  @Input({ required: true }) travelLocations!: CampaignLocationInstance[];
  @Input({ required: true }) sublocationsByLocation!: Record<string, CampaignSublocationInstance[]>;
  @Input({ required: true }) currentSublocationId!: string | null;
  @Input({ required: true }) currentLocationId!: string | null;

  @Output() toggleDrawer = new EventEmitter<void>();
  @Output() selectLocation = new EventEmitter<string | null>();
  @Output() travelCast = new EventEmitter<{ locationInstanceId: string; sublocationInstanceId: string }>();

  onToggleTravelDrawer() {
    this.toggleDrawer.emit();
  }

  onSelectLocation(locationId: string | null) {
    this.selectLocation.emit(locationId);
  }

  onTravelCast(locationInstanceId: string, sublocationInstanceId: string) {
    this.travelCast.emit({ locationInstanceId, sublocationInstanceId });
  }
}
