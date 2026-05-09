import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type TitlePageType =
  | 'location'
  | 'sublocation'
  | 'cast'
  | 'cast-party'
  | 'gm-locations'
  | 'player-locations'
  | 'gm-party'
  | 'player-party'
  | 'gm-factions'
  | 'player-factions'
  | 'gm-faction-detail'
  | 'player-faction-detail'
  | 'gm-events'
  | 'player-events';

export interface VoidTitleContext {
  pageType: TitlePageType;
  campaignId: string;
  baseRoute: string;
  location: { instanceId: string; name: string } | null;
  sublocation?: { instanceId: string; name: string } | null;
  partyRoute?: string[];
}

interface TitleSegment {
  text: string;
  route?: string[];
  cssClass?: string;
}

@Component({
  selector: 'app-void-title-segments',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './void-title-segments.component.html',
  styleUrl: './void-title-segments.component.scss',
})
export class VoidTitleSegmentsComponent {
  context = input.required<VoidTitleContext>();

  protected segments = computed<TitleSegment[]>(() => {
    const ctx = this.context();

    switch (ctx.pageType) {
      case 'gm-locations':      return [{ text: 'Campaign Locations', cssClass: 'void-title__label' }];
      case 'player-locations':  return [{ text: 'Campaign Locations', cssClass: 'void-title__label' }];
      case 'gm-party':          return [{ text: 'The Party',          cssClass: 'void-title__label' }];
      case 'player-party':      return [{ text: 'The Party',          cssClass: 'void-title__label' }];
      case 'gm-factions':       return [{ text: 'Factions',           cssClass: 'void-title__label' }];
      case 'player-factions':   return [{ text: 'Factions',           cssClass: 'void-title__label' }];
      case 'gm-faction-detail':     return [{ text: 'Faction Details', cssClass: 'void-title__label' }];
      case 'player-faction-detail': return [{ text: 'Faction Details', cssClass: 'void-title__label' }];
      case 'gm-events':             return [{ text: 'Storyline',       cssClass: 'void-title__label' }];
      case 'player-events':          return [{ text: 'Storyline',       cssClass: 'void-title__label' }];

      case 'cast-party':
        return [
          { text: 'location:', cssClass: 'void-title__label' },
          ctx.partyRoute
            ? { text: 'The Party', route: ctx.partyRoute, cssClass: 'void-title__indented' }
            : { text: 'The Party', cssClass: 'void-title__indented' },
        ];

      case 'location':
        return [
          { text: ctx.location?.name ?? '\u2026', cssClass: 'void-title__label' },
        ];

      default: {
        const segs: TitleSegment[] = [
          { text: 'location:', cssClass: 'void-title__label' },
          ctx.location
            ? { text: ctx.location.name, route: [ctx.baseRoute, ctx.campaignId, 'locations', ctx.location.instanceId], cssClass: 'void-title__indented' }
            : { text: '\u2026', cssClass: 'void-title__indented' },
        ];
        if (ctx.pageType === 'cast') {
          segs.push({ text: 'sublocation:', cssClass: 'void-title__label' });
          segs.push(ctx.sublocation
            ? { text: ctx.sublocation.name, route: [ctx.baseRoute, ctx.campaignId, 'sublocations', ctx.sublocation.instanceId], cssClass: 'void-title__indented' }
            : { text: '\u2026', cssClass: 'void-title__indented' }
          );
        }
        return segs;
      }
    }
  });
}
