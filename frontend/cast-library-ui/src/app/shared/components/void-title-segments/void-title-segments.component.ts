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
  | 'player-events'
  | 'player-plot';

export interface VoidTitleContext {
  pageType: TitlePageType;
  campaignId: string;
  campaignName?: string;
  baseRoute: string;
  location: { instanceId: string; name: string } | null;
  sublocation?: { instanceId: string; name: string } | null;
  partyRoute?: string[];
  faction?: { instanceId: string; name: string } | null;
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
      case 'gm-faction-detail':
        const gmFactionSegs: TitleSegment[] = [];
        if (ctx.campaignName) {
          gmFactionSegs.push({ text: ctx.campaignName, route: [ctx.baseRoute, ctx.campaignId], cssClass: 'void-title__link void-title__campaign-link' });
        }
        gmFactionSegs.push({ text: 'Factions', route: [ctx.baseRoute, ctx.campaignId, 'factions'], cssClass: 'void-title__link' });
        gmFactionSegs.push(ctx.faction
          ? { text: ctx.faction.name, cssClass: 'void-title__indented' }
          : { text: '\u2026', cssClass: 'void-title__indented' }
        );
        return gmFactionSegs;
      case 'player-faction-detail':
        const playerFactionSegs: TitleSegment[] = [];
        if (ctx.campaignName) {
          playerFactionSegs.push({ text: ctx.campaignName, route: [ctx.baseRoute, ctx.campaignId], cssClass: 'void-title__link void-title__campaign-link' });
        }
        playerFactionSegs.push({ text: 'Factions', route: [ctx.baseRoute, ctx.campaignId, 'campaign-insight'], cssClass: 'void-title__link' });
        playerFactionSegs.push(ctx.faction
          ? { text: ctx.faction.name, cssClass: 'void-title__indented' }
          : { text: '\u2026', cssClass: 'void-title__indented' }
        );
        return playerFactionSegs;
      case 'gm-events':             return [{ text: 'Storyline',       cssClass: 'void-title__label' }];
      case 'player-events':          return [{ text: 'Storyline',       cssClass: 'void-title__label' }];
      case 'player-plot':            return [{ text: 'Storyline',       cssClass: 'void-title__label' }];

      case 'cast-party':
        return [
          { text: 'location:', cssClass: 'void-title__label' },
          ctx.partyRoute
            ? { text: 'The Party', route: ctx.partyRoute, cssClass: 'void-title__indented' }
            : { text: 'The Party', cssClass: 'void-title__indented' },
        ];

      case 'location':
        const segs: TitleSegment[] = [];
        if (ctx.campaignName) {
          segs.push({ text: ctx.campaignName, route: [ctx.baseRoute, ctx.campaignId], cssClass: 'void-title__link void-title__campaign-link' });
        }
        segs.push({ text: 'location:', cssClass: 'void-title__label' });
        segs.push(ctx.location
          ? { text: ctx.location.name, route: [ctx.baseRoute, ctx.campaignId, 'locations', ctx.location.instanceId], cssClass: 'void-title__indented' }
          : { text: '\u2026', cssClass: 'void-title__indented' }
        );
        return segs;

      default: {
        const segs: TitleSegment[] = [];
        if (ctx.campaignName) {
          segs.push({ text: ctx.campaignName, route: [ctx.baseRoute, ctx.campaignId], cssClass: 'void-title__link void-title__campaign-link' });
        }
        segs.push({ text: 'location:', cssClass: 'void-title__label' });
        segs.push(ctx.location
          ? { text: ctx.location.name, route: [ctx.baseRoute, ctx.campaignId, 'locations', ctx.location.instanceId], cssClass: 'void-title__indented' }
          : { text: '\u2026', cssClass: 'void-title__indented' }
        );
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
