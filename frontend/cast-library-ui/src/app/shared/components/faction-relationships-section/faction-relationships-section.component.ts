import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignFactionInstance, FactionRelationship } from '../../models/faction.model';
import { FactionCardComponent } from '../faction-card/faction-card.component';

export interface SaveRelationshipEvent {
  factionInstanceIdB: string;
  relationshipType: string;
  strength: number;
}

@Component({
  selector: 'app-faction-relationships-section',
  standalone: true,
  imports: [CommonModule, FactionCardComponent],
  templateUrl: './faction-relationships-section.component.html',
  styleUrl: './faction-relationships-section.component.scss',
})
export class FactionRelationshipsSectionComponent {
  relationships = input.required<FactionRelationship[]>();
  otherFactions = input<CampaignFactionInstance[]>([]);
  currentFactionInstanceId = input<string>('');
  isDm          = input(false);

  removeRelationship = output<FactionRelationship>();
  saveRelationship   = output<SaveRelationshipEvent>();

  private tiltMap = new Map<string, number>();

  tiltFor(id: string): number {
    if (!this.tiltMap.has(id)) {
      this.tiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.tiltMap.get(id)!;
  }

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

  selectableFactions = computed<CampaignFactionInstance[]>(() => {
    return this.otherFactions().filter(f => f.factionInstanceId !== this.currentFactionInstanceId());
  });

  relTargetFaction(rel: FactionRelationship): CampaignFactionInstance | null {
    return this.otherFactions().find(f => f.factionInstanceId === rel.factionInstanceIdB) ?? null;
  }

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
