import { Component, computed, input, output } from '@angular/core';
import { CampaignEncounter } from '../../../../../core/encounter.service';
import { castCardCountOf, castSpotsOf } from '../../../../../core/encounter-combatant.mapper';
import { CcEditButtonComponent } from '../../../Shared/cc-edit-button/cc-edit-button.component';

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

  readonly editable = input(true);

  readonly showFight = input(true);

  readonly editRequested = output<void>();
  readonly circleRequested = output<void>();

  readonly startRequested = output<void>();

  readonly statusLabel = computed(() => this.encounter().status || 'active');

  readonly isPlanned = computed(() => this.encounter().status === 'planned');

  readonly title = computed(() =>
    this.encounter().name || `Encounter ${this.encounter().sequenceNumber}`);

  readonly spotCount = computed(() =>
    castSpotsOf(this.encounter().spots ?? []).length);

  readonly cardCount = computed(() =>
    castCardCountOf(this.encounter().spots ?? []));
}
