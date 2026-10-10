import { Component, computed, input, output } from '@angular/core';
import { CampaignEncounter } from '../../../../../core/encounter.service';
import { castCardCountOf, castSpotsOf } from '../../../../../core/encounter-combatant.mapper';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';

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

  /**
   * Whether the card draws its edit button. The DM's builder keeps it; a viewer who
   * cannot edit the encounter reads the card without it.
   */
  readonly editable = input(true);

  /**
   * Whether the card draws its fight button, which opens the encounter's initiative
   * circle. A player keeps this one: opening a fight that has ended is how they read
   * back what stood in it.
   */
  readonly showFight = input(true);

  readonly editRequested = output<void>();
  readonly circleRequested = output<void>();

  /** Raised by the round Start button a fight wears while it is still only planned. */
  readonly startRequested = output<void>();

  readonly statusLabel = computed(() => this.encounter().status || 'active');

  /**
   * A fight that has been made but not started. It is started from its own card, which
   * is why that card wears a Start button where a running fight wears the way in.
   */
  readonly isPlanned = computed(() => this.encounter().status === 'planned');

  readonly title = computed(() =>
    this.encounter().name || `Encounter ${this.encounter().sequenceNumber}`);

  readonly spotCount = computed(() =>
    castSpotsOf(this.encounter().spots ?? []).length);

  readonly cardCount = computed(() =>
    castCardCountOf(this.encounter().spots ?? []));
}
