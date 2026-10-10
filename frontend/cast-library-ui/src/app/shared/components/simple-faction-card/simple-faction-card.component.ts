import { Component, computed, input } from '@angular/core';
import { Faction, CampaignFactionInstance } from '../../models/faction.model';
import { CcFactionIconComponent } from '../v2/cc-faction-icon/cc-faction-icon.component';

export type FactionAlignment = 'good' | 'neutral' | 'evil';

@Component({
  selector: 'app-simple-faction-card',
  standalone: true,
  imports: [CcFactionIconComponent],
  templateUrl: './simple-faction-card.component.html',
  styleUrl: './simple-faction-card.component.scss'
})
export class SimpleFactionCardComponent {
  faction = input.required<Faction | CampaignFactionInstance>();

  get alignment(): FactionAlignment {
    const p = this.faction().perception ?? 0;
    if (p > 0) return 'good';
    if (p < 0) return 'evil';
    return 'neutral';
  }

  get isGood(): boolean    { return this.alignment === 'good'; }
  get isNeutral(): boolean { return this.alignment === 'neutral'; }
  get isEvil(): boolean    { return this.alignment === 'evil'; }

  get alignLabel(): string {
    if (this.isGood)    return 'Friendly';
    if (this.isNeutral) return 'Unknown';
    return 'Hostile';
  }

  get imageUrl(): string | undefined {
    const f = this.faction();
    return 'imageUrl' in f ? f.imageUrl : undefined;
  }

  goodColor = computed(() => {
    const f = this.faction();
    const customColor = 'colors' in f ? f.colors?.goodColor : undefined;
    if (customColor && customColor !== '#000000') return customColor;
    return '#ff99bb';
  });

  evilColor = computed(() => {
    const f = this.faction();
    const customColor = 'colors' in f ? f.colors?.evilColor : undefined;
    if (customColor && customColor !== '#000000') return customColor;
    return '#004d1a';
  });
}
