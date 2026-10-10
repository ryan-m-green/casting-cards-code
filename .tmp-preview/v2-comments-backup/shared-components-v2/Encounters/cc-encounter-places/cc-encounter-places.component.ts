import { Component, computed, input } from '@angular/core';

/**
 * cc-encounter-places
 *
 * How one encounter's ring stands, read at a glance. The headline is the number that
 * matters — how many spots are still free to fill, i.e. what the DM can still add —
 * and the line under it is the working that produced it: the party's spots plus the
 * DM's groups, out of the total a ring holds.
 *
 * Every spot is one turn, whoever stands on it: the party's spots are created with
 * the encounter, so the count starts at the party and what is left of it is what the
 * DM has to fill with groups. The numbers are the encounter's own, so they move as
 * groups are added, renamed or removed. Shown in the editor, where the groups are
 * made, and in the picker, where the cards for one are chosen.
 */
@Component({
  selector: 'cc-encounter-places',
  standalone: true,
  imports: [],
  templateUrl: './cc-encounter-places.component.html',
  styleUrl: './cc-encounter-places.component.scss'
})
export class CcEncounterPlacesComponent {
  /** Places the party holds: one per player card, added with the encounter. */
  readonly players = input.required<number>();
  /** Places the DM's groups hold (a group of several cards is still one place). */
  readonly groups = input.required<number>();
  /** Places the ring holds in total. */
  readonly total = input.required<number>();

  /** The places spoken for: the two counts the line adds up. */
  readonly used = computed(() => this.players() + this.groups());

  /** What is left to fill, never negative (a party larger than the ring reads as none). */
  readonly left = computed(() => Math.max(0, this.total() - this.used()));

  /** True when the ring has nowhere left to put a group. */
  readonly isFull = computed(() => this.left() === 0);
}
