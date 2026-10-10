import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignFactionInstance, FactionRelationship } from '../../../models/faction.model';

export interface SaveRelationshipEvent {
  factionInstanceIdB: string;
  relationshipType: string;
  strength: number;
}

@Component({
  selector: 'cc-faction-associations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-faction-associations.component.html',
  styleUrl: './cc-faction-associations.component.scss',
})
export class CcFactionAssociationsComponent {
  relationships = input.required<FactionRelationship[]>();
  otherFactions = input<CampaignFactionInstance[]>([]);
  currentFactionInstanceId = input<string>('');
  isDm = input<boolean>(true);

  removeRelationship = output<FactionRelationship>();
  saveRelationship   = output<SaveRelationshipEvent>();

  drawerOpen     = signal(false);
  wizardStep     = signal<1 | 2 | 3>(1);
  wizardTarget   = signal<CampaignFactionInstance | null>(null);
  wizardRelType  = signal('allied');
  wizardStrength = signal(0);

  readonly relTypeOptions = ['allied', 'rival', 'enemy', 'neutral'];
  readonly strengthLabels = ['Indifferent', 'Slight', 'Moderate', 'Strong', 'Deep', 'Absolute'];

  relatedFactionIds = computed<Set<string>>(() => {
    const s = new Set<string>();
    for (const r of this.relationships()) s.add(r.factionInstanceIdB);
    return s;
  });

  associationRows = computed<{ factionInstanceId: string; type: string; name: string }[]>(() => {
    const namesById = new Map(this.otherFactions().map(f => [f.factionInstanceId, f.name]));
    return this.relationships().map(r => ({
      factionInstanceId: r.factionInstanceIdB,
      type: r.relationshipType,
      name: namesById.get(r.factionInstanceIdB) ?? 'Unknown faction',
    }));
  });

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
