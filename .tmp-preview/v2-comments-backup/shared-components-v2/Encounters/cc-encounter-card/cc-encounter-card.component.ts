import { Component, computed, input, output } from '@angular/core';
import { CampaignEncounter } from '../../../../../core/encounter.service';
import { castCardCountOf, castSpotsOf } from '../../../../../core/encounter-combatant.mapper';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';

/**
 * cc-encounter-card
 *
 * One encounter of the campaign, sized like the campaign's own cards (150 x 220)
 * so the row of them reads as the encounter pool of the bottom-left grid area.
 * The card carries what a DM needs at a glance — sequence, title, status and how
 * much the encounter holds — and the two things that can be done with it: edit
 * it, or fade it into its initiative circle.
 */
@Component({
  selector: 'cc-encounter-card',
  standalone: true,
  imports: [CcEditButtonComponent],
  templateUrl: './cc-encounter-card.component.html',
  styleUrl: './cc-encounter-card.component.scss'
})
export class CcEncounterCardComponent {
  readonly encounter = input.required<CampaignEncounter>();
  readonly portalColor = input<string>('#6e28d0');
  readonly busy = input(false);

  /** Opens the encounter in edit mode (add/subtract cards, rename things). */
  readonly editRequested = output<void>();
  /** Shows the encounter's initiative circle. */
  readonly circleRequested = output<void>();

  readonly statusLabel = computed(() => this.encounter().status || 'active');

  readonly title = computed(() =>
    this.encounter().name || `Encounter ${this.encounter().sequenceNumber}`);

  /**
   * The encounter's cast, counted off the encounter object itself: the spots that
   * hold cast cards, and every card in them. The party's own spots are excluded —
   * the builder never shows them, so counting them would not match what the DM
   * sees in the encounter.
   */
  readonly spotCount = computed(() =>
    castSpotsOf(this.encounter().spots ?? []).length);

  readonly cardCount = computed(() =>
    castCardCountOf(this.encounter().spots ?? []));
}
