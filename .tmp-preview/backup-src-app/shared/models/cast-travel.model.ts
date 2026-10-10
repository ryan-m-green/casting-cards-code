/**
 * What the right drawer's travel picker is for: the campaign whose card is being moved, the card
 * itself, what that card is called (the drawer's title), and the sublocation the card stands in
 * now — the place the picker marks as "here", and the "from" of the travel write.
 *
 * The campaign shell carries the shape a travel drawer is asked in (see
 * `CampaignShellService.openCastTravelDrawer`), so a card that asks for the drawer only has to
 * know these four things about itself.
 */
export interface CastTravelTarget {
  campaignId: string;
  castInstanceId: string;
  castName: string;
  sublocationInstanceId: string;
}

/**
 * Where a cast ended up, for the realm row to follow: named when the travel drawer shuts with the
 * card somewhere else (see `CampaignShellService.publishCastTraveledFromDrawer`), by the card's
 * own travel control's picker, and read by `cc-card-navigation` — which shows the place the cast
 * now stands in, so the DM closes the drawer looking at where they just sent it.
 */
export interface CastTraveledTo {
  campaignId: string;
  locationInstanceId: string;
  sublocationInstanceId: string;
}
