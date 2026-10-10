
export interface CardCondition {
  id: string;
  conditionName: string;
  assignedAt: string;
}

export const D5E_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

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

const CUSTOM_CONDITION_COLOR = '#00d5a0';

export function conditionRingColor(name: string): string {
  return CONDITION_COLORS[name.trim().toLowerCase()] ?? CUSTOM_CONDITION_COLOR;
}

/** One colour a condition's ring may be made of. */
export interface ConditionColorChoice {
  readonly name: string;
  readonly hex: string;
}

/**
 * The thirty colours a condition's ring may wear. The first sixteen are the standard conditions'
 * colours plus the generic one, so a condition whose colour was never chosen still resolves to a
 * colour that is on the list; the rest widen the palette across the spectrum.
 */
export const CONDITION_COLOR_CHOICES: readonly ConditionColorChoice[] = [
  { name: 'Gold',     hex: '#f0cf4a' },
  { name: 'Rose',     hex: '#ff7bd1' },
  { name: 'Sky',      hex: '#8fd3ff' },
  { name: 'Bronze',   hex: '#c98b4b' },
  { name: 'Lavender', hex: '#b39ddb' },
  { name: 'Mint',     hex: '#66d19e' },
  { name: 'Crimson',  hex: '#e8555c' },
  { name: 'Frost',    hex: '#d7ecff' },
  { name: 'Amber',    hex: '#f2a03d' },
  { name: 'Stone',    hex: '#9aa0a6' },
  { name: 'Leaf',     hex: '#8bc34a' },
  { name: 'Sand',     hex: '#d8a75f' },
  { name: 'Azure',    hex: '#4fa8d8' },
  { name: 'Lemon',    hex: '#ffd23f' },
  { name: 'Violet',   hex: '#7b6ae0' },
  { name: 'Teal',     hex: '#00d5a0' },
  { name: 'Scarlet',  hex: '#e0392b' },
  { name: 'Coral',    hex: '#ff7f50' },
  { name: 'Peach',    hex: '#ffb07c' },
  { name: 'Marigold', hex: '#f5a623' },
  { name: 'Olive',    hex: '#7f8c1f' },
  { name: 'Lime',     hex: '#b6e13d' },
  { name: 'Emerald',  hex: '#2ecc71' },
  { name: 'Pine',     hex: '#1f7a5a' },
  { name: 'Cyan',     hex: '#00bcd4' },
  { name: 'Sapphire', hex: '#2f6fed' },
  { name: 'Indigo',   hex: '#5c6bc0' },
  { name: 'Plum',     hex: '#8e44ad' },
  { name: 'Magenta',  hex: '#d500f9' },
  { name: 'Sable',    hex: '#3b2f2f' },
];

/**
 * The colour a condition's ring is drawn in: the one chosen for it, or the standard colour for its
 * name when it carries none (rows written before colours existed keep the colour they had).
 */
export function conditionRingColorOf(name: string, color?: string | null): string {
  const chosen = (color ?? '').trim();

  return chosen !== '' ? chosen : conditionRingColor(name);
}
