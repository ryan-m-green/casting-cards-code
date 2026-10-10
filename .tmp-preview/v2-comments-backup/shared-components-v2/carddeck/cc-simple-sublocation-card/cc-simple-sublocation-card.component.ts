import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Sublocation, CampaignSublocationInstance } from '../../../../models/sublocation.model';
import { CcSublocationIconComponent } from '../../Shared/cc-sublocation-icon/cc-sublocation-icon.component';

/**
 * cc-simple-sublocation-card
 *
 * The deck's back-less sublocation card — the one the rows and the pickers draw wherever
 * there is no room for the full card. It lives with the campaign's card deck (see
 * cc-sublocation-card) rather than with the shared cards.
 */
@Component({
  selector: 'cc-simple-sublocation-card',
  standalone: true,
  imports: [CcSublocationIconComponent],
  /** OnPush: nothing but its signal input draws this card, so it is redrawn only when that changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-simple-sublocation-card.component.html',
  styleUrl: './cc-simple-sublocation-card.component.scss'
})
export class CcSimpleSublocationCardComponent {
  sublocation = input.required<Sublocation | CampaignSublocationInstance>();

  get shopItemCount(): number {
    return this.sublocation().shopItems?.length ?? 0;
  }
}