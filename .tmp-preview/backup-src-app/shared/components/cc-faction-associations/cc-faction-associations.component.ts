import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignFactionInstance, FactionRelationship } from '../../models/faction.model';

/**
 * The payload a relationship the DM has just woven is saved with.
 */
export interface SaveRelationshipEvent {
  factionInstanceIdB: string;
  relationshipType: string;
  strength: number;
}

/**
 * The viewer's web of alliances and enmities for one faction. Below the button that opens the
 * slide-down wizard, the ties this faction already holds are listed at a glance — the association's
 * type, then the name of the faction it is woven to (see `associationRows`). The wizard itself picks
 * another faction, names the tie (`allied`, `rival`, `enemy`, `neutral`) and sets how strong it runs.
 * The GM is offered the whole realm — locked factions and all — while a player is offered only the
 * ones the GM has unlocked for the party. Clicking a faction the current one is already tied to takes
 * the tie back.
 *
 * This is the v1 faction detail's relationships section, carried into the v2 right drawer, with the
 * related-faction card grid left off — the cards are already drawn in the drawer, so only the picker
 * is wanted here.
 */
@Component({
  selector: 'cc-faction-associations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-faction-associations.component.html',
  styleUrl: './cc-faction-associations.component.scss',
})
export class CcFactionAssociationsComponent {
  /** The relationships the current faction already holds (its own side, A → B). */
  relationships = input.required<FactionRelationship[]>();
  /** The campaign's other factions, the ones the wizard picks from. */
  otherFactions = input<CampaignFactionInstance[]>([]);
  /** The faction the panel is drawn for, so it is not offered as its own relation. */
  currentFactionInstanceId = input<string>('');
  /**
   * Whether the panel is the GM's own. The GM weaves across the whole realm, so every other faction
   * in the campaign is offered, locked ones included; a player is narrowed to the ones the GM has
   * unlocked for the party. Calls that say nothing get the GM's own, as the panel always did.
   */
  isDm = input<boolean>(true);

  removeRelationship = output<FactionRelationship>();
  saveRelationship   = output<SaveRelationshipEvent>();

  // ── Wizard state ───────────────────────────────────────────────────────────
  drawerOpen     = signal(false);
  wizardStep     = signal<1 | 2 | 3>(1);
  wizardTarget   = signal<CampaignFactionInstance | null>(null);
  wizardRelType  = signal('allied');
  wizardStrength = signal(0);

  readonly relTypeOptions = ['allied', 'rival', 'enemy', 'neutral'];
  readonly strengthLabels = ['Indifferent', 'Slight', 'Moderate', 'Strong', 'Deep', 'Absolute'];

  // ── Derived ────────────────────────────────────────────────────────────────
  relatedFactionIds = computed<Set<string>>(() => {
    const s = new Set<string>();
    for (const r of this.relationships()) s.add(r.factionInstanceIdB);
    return s;
  });

  /**
   * The ties this faction already holds, as rows to read at a glance: the association's type, then
   * the name of the faction it is woven to. The name is looked up on the campaign's factions (the
   * same set the wizard offers from), so a tie to a faction this viewer cannot see shows a
   * placeholder rather than a blank.
   */
  associationRows = computed<{ factionInstanceId: string; type: string; name: string }[]>(() => {
    const namesById = new Map(this.otherFactions().map(f => [f.factionInstanceId, f.name]));
    return this.relationships().map(r => ({
      factionInstanceId: r.factionInstanceIdB,
      type: r.relationshipType,
      name: namesById.get(r.factionInstanceIdB) ?? 'Unknown faction',
    }));
  });

  /**
   * The factions the wizard offers: the campaign's other factions, less the faction the panel is
   * drawn for — a faction cannot be tied to itself. A player is narrowed to the ones the GM has
   * unlocked for the party (see the faction's lock); the GM is offered the locked ones too.
   */
  selectableFactions = computed<CampaignFactionInstance[]>(() => {
    const forGm = this.isDm();
    return this.otherFactions().filter(f =>
      f.factionInstanceId !== this.currentFactionInstanceId() &&
      (forGm || f.isVisibleToPlayers));
  });

  relForFaction(factionInstanceId: string): FactionRelationship | null {
    return this.relationships().find(r => r.factionInstanceIdB === factionInstanceId) ?? null;
  }

  strengthLabel(strength: number): string {
    return this.strengthLabels[Math.min(strength, this.strengthLabels.length - 1)] ?? '';
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleDrawer() {
    if (this.drawerOpen()) {
      this.drawerOpen.set(false);
      return;
    }
    this.wizardStep.set(1);
    this.wizardTarget.set(null);
    this.wizardRelType.set('allied');
    this.wizardStrength.set(0);
    this.drawerOpen.set(true);
  }

  selectTarget(f: CampaignFactionInstance) {
    this.wizardTarget.set(f);
    this.wizardStep.set(2);
  }

  confirmRelType(type: string) {
    this.wizardRelType.set(type);
    this.wizardStep.set(3);
  }

  onStrengthInput(event: Event) {
    this.wizardStrength.set(+(event.target as HTMLInputElement).value);
  }

  save() {
    const target = this.wizardTarget();
    if (!target) return;
    this.saveRelationship.emit({
      factionInstanceIdB: target.factionInstanceId,
      relationshipType: this.wizardRelType(),
      strength: this.wizardStrength(),
    });
    this.drawerOpen.set(false);
    this.wizardStep.set(1);
  }
}
