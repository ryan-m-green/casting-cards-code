import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CastTravelTarget } from '../../../../models/cast-travel.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';

/**
 * cc-cast-travel
 *
 * The way off a cast card: the travel button, standing in the back face's action row beside the
 * card's own ✦ Details (see the card, which gives this control its place there — and hands the
 * details button the whole row when the caller says the card may not travel).
 *
 * The button opens the right drawer with the travel picker (see `cc-cast-travel-picker`): the
 * campaign's locations as simple location cards, then the sublocations of the one that is picked,
 * the party's own anchor among them. The picker makes the travel write itself
 * (`PATCH api/campaigns/{id}/casts/{id}/travel`), so this control has nothing left to do but ask
 * for the drawer: a card only has to say which campaign it is in and which card it is.
 *
 *   <cc-cast-travel
 *     [campaignId]="campaignId"
 *     [castInstanceId]="cast.instanceId"
 *     [castName]="cast.name"
 *     [sublocationInstanceId]="cast.sublocationInstanceId" />
 *
 * A card with nowhere to be — a library card, with no campaign instance behind it — draws nothing:
 * the control only stands when it is given a campaign and a card in it.
 */
@Component({
  selector: 'cc-cast-travel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-cast-travel.component.html',
  styleUrl: './cc-cast-travel.component.scss'
})
export class CcCastTravelComponent {
  private shell = inject(CampaignShellService);
  private v2Shell = inject(V2CampaignShellService);

  /** The campaign the card is in, and the card itself. */
  readonly campaignId = input('');
  readonly castInstanceId = input('');
  /** The sublocation the card stands in, as the card knows it; `''` when it knows of none. */
  readonly sublocationInstanceId = input('');
  /** What the card is called, for the drawer's title and its own line about the card. */
  readonly castName = input('');

  /** Whether the control has somewhere to go: a campaign, and a card in it. */
  readonly canTravel = computed(() => !!this.campaignId() && !!this.castInstanceId());

  /**
   * Asks the shell for the travel drawer, aimed at this card.
   *
   * Both shells are asked. A card cannot tell which one it is standing in — the two are told apart
   * by the campaign they hold, and both hold the same campaign when it is the same campaign (the
   * v2 shell keeps the last campaign it read) — while only one of them is ever on screen: the v2
   * shell, or the campaign and player shells. So the request goes out on both services and the
   * shell that is actually drawing this card opens the drawer; the other only remembers a card
   * nothing will ask it about.
   */
  openTravelDrawer() {
    if (!this.canTravel()) return;

    const target: CastTravelTarget = {
      campaignId: this.campaignId(),
      castInstanceId: this.castInstanceId(),
      castName: this.castName(),
      sublocationInstanceId: this.sublocationInstanceId(),
    };

    this.v2Shell.openCastTravelDrawer(target);
    this.shell.openCastTravelDrawer(target);
  }
}
