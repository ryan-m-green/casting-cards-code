import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-encounter-places',
  standalone: true,
  imports: [],
  templateUrl: './cc-encounter-places.component.html',
  styleUrl: './cc-encounter-places.component.scss'
})
export class CcEncounterPlacesComponent {
  readonly players = input.required<number>();
  readonly groups = input.required<number>();
  readonly total = input.required<number>();

  readonly used = computed(() => this.players() + this.groups());

  readonly left = computed(() => Math.max(0, this.total() - this.used()));

  readonly isFull = computed(() => this.left() === 0);
}
