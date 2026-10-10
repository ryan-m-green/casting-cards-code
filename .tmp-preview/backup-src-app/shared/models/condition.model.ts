/**
 * Card conditions, for everything that gives them out or draws them.
 *
 * A condition hangs off the card that carries it — a party member's off their player
 * card, a cast card's off the encounter's own row for it — so the panel that hands
 * them out and the rings that show them both work from what is here.
 */

/** A condition as any card's own conditions look: what it carries and when it got it. */
export interface CardCondition {
  id: string;
  conditionName: string;
  assignedAt: string;
}

/** The standard conditions, in the order the buttons offer them. */
export const D5E_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

/**
 * The colour each condition's ring is made of, so the rings on a card are told
 * apart at a glance — the way a table's set of condition rings is colour coded.
 * Keyed by the condition's name in lower case.
 */
const CONDITION_COLORS: Record<string, string> = {
  blinded: '#f0cf4a',
  charmed: '#ff7bd1',
  deafened: '#8fd3ff',
  exhaustion: '#c98b4b',
  frightened: '#b39ddb',
  grappled: '#66d19e',
  incapacitated: '#e8555c',
  invisible: '#d7ecff',
  paralyzed: '#f2a03d',
  petrified: '#9aa0a6',
  poisoned: '#8bc34a',
  prone: '#d8a75f',
  restrained: '#4fa8d8',
  stunned: '#ffd23f',
  unconscious: '#7b6ae0',
};

/** One colour for anything the DM types in themselves. */
const CUSTOM_CONDITION_COLOR = '#00d5a0';

/** The colour a condition's ring is made of: its own, or the custom ones' colour. */
export function conditionRingColor(name: string): string {
  return CONDITION_COLORS[name.trim().toLowerCase()] ?? CUSTOM_CONDITION_COLOR;
}
