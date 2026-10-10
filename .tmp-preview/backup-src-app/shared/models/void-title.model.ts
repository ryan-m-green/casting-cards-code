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
  | 'player-plot'
  | 'gm-chronicles'
  | 'player-chronicles';

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
