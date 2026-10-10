import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Location, CampaignLocationInstance } from '../../../../models/location.model';
import { CcLocationIconComponent } from '../../Shared/cc-location-icon/cc-location-icon.component';

/**
 * cc-simple-location-card
 *
 * The deck's back-less location card — the one the rows and the pickers draw wherever
 * there is no room for the full card. It lives with the campaign's card deck (see
 * cc-location-card) rather than with the shared cards.
 */
@Component({
  selector: 'cc-simple-location-card',
  standalone: true,
  imports: [CcLocationIconComponent],
  /** OnPush: nothing but its signal input draws this card, so it is redrawn only when that changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-simple-location-card.component.html',
  styleUrl: './cc-simple-location-card.component.scss'
})
export class CcSimpleLocationCardComponent {
  location = input.required<Location | CampaignLocationInstance>();
}