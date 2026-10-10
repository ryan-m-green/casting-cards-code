import { Component, OnInit, OnDestroy, signal, computed, effect, inject, HostBinding, viewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { CampaignDetail } from '../../shared/models/campaign.model';
import { AuthService } from '../../core/auth/auth.service';
import { CampaignHubService, FactionPartyCastChangedEvent } from '../../core/hub/campaign-hub.service';
import { PortalAnimationService } from '../../core/portal-animation.service';
import { CardVisibilityChangedEvent, BulkCardVisibilityChangedEvent, CampaignSecret, SecretRevealedEvent, SecretResealedEvent, SecretCreatedEvent, SecretDeletedEvent } from '../../shared/models/secret.model';
import { moveCastTo, setCardsVisibility, replaceCard } from '../../shared/models/campaign-card-state';
import { V2CampaignShellService } from '../../core/v2-campaign-shell.service';
import { V2GridLoadService, GridArea } from '../../core/v2-grid-load.service';
import { V2AreaChangeService } from '../../core/v2-area-change.service';
import { CcV2PlaceholderComponent } from '../../shared/components/v2/Shared/cc-v2-placeholder/cc-v2-placeholder.component';
import { CcStorylineComponent } from '../../shared/components/v2/Storyline/cc-storyline/cc-storyline.component';
import { CcStorylineViewComponent, StorylineViewItem } from '../../shared/components/v2/Storyline/cc-storyline-view/cc-storyline-view.component';
import { CcStorylineContentComponent, StorylineContentEdit } from '../../shared/components/v2/Storyline/cc-storyline-content/cc-storyline-content.component';
import { CcCardNavigationComponent } from '../../shared/components/v2/CardNavigation/cc-card-navigation/cc-card-navigation.component';
import { CcCardFactionNavigationComponent } from '../../shared/components/v2/FactionNavigation/cc-card-faction-navigation/cc-card-faction-navigation.component';
import { CcDayCounterComponent } from '../../shared/components/v2/WorldView/cc-day-counter/cc-day-counter.component';
import { CcRadialNavComponent } from '../../shared/components/v2/Shell/cc-radial-nav/cc-radial-nav.component';
import { CcPartyPanelComponent } from '../../shared/components/v2/TheParty/cc-party-panel/cc-party-panel.component';
import { CcContentDrawerComponent } from '../../shared/components/v2/Shell/cc-content-drawer/cc-content-drawer.component';
import { CcPlayerSecretsContentComponent } from '../../shared/components/v2/TheParty/cc-player-secrets-content/cc-player-secrets-content.component';
import { CcPartyGoldContentComponent } from '../../shared/components/v2/TheParty/cc-party-gold-content/cc-party-gold-content.component';
import { CcGridAreaTitleComponent } from '../../shared/components/v2/Shared/cc-grid-area-title/cc-grid-area-title.component';
import { CcSignalrInspectorComponent } from '../../shared/components/v2/Diagnostics/cc-signalr-inspector/cc-signalr-inspector.component';
import { CcEncounterBuilderComponent } from '../../shared/components/v2/Encounters/cc-encounter-builder/cc-encounter-builder.component';
import { CcEncounterGroupPickerComponent } from '../../shared/components/v2/Encounters/cc-encounter-group-picker/cc-encounter-group-picker.component';
import { CcFactionPickerComponent } from '../../shared/components/v2/FactionNavigation/cc-faction-picker/cc-faction-picker.component';
import { CcFactionCastPickerComponent } from '../../shared/components/v2/FactionNavigation/cc-faction-cast-picker/cc-faction-cast-picker.component';
import { CcSublocationPickerComponent } from '../../shared/components/v2/CardNavigation/cc-sublocation-picker/cc-sublocation-picker.component';
import { CcLocationPickerComponent } from '../../shared/components/v2/CardNavigation/cc-location-picker/cc-location-picker.component';
import { CcCastPickerComponent } from '../../shared/components/v2/CardNavigation/cc-cast-picker/cc-cast-picker.component';
import { CcCastTravelPickerComponent } from '../../shared/components/v2/Shared/cc-cast-travel-picker/cc-cast-travel-picker.component';
import { CcCombatantDetailsComponent } from '../../shared/components/v2/Encounters/cc-combatant-details/cc-combatant-details.component';
import { CcGridLoadOverlayComponent } from '../../shared/components/v2/Shell/cc-grid-load-overlay/cc-grid-load-overlay.component';
import { CcQuicknotesComponent } from '../../shared/components/v2/Quicknotes/cc-quicknotes/cc-quicknotes.component';
import { CcNoteAssociationPickerComponent } from '../../shared/components/v2/Quicknotes/cc-note-association-picker/cc-note-association-picker.component';
import { CcPurchaseReceiptComponent } from '../../shared/components/v2/Shared/cc-purchase-receipt/cc-purchase-receipt.component';
import type { PurchaseResult } from '../../shared/models/shop-purchase.model';
import { EncounterGroupPicked } from '../../core/encounter.service';
import { CcWorldMapComponent } from '../../shared/components/v2/WorldView/cc-world-map/cc-world-map.component';
import { CcWorldmapContentComponent } from '../../shared/components/v2/WorldView/cc-worldmap-content/cc-worldmap-content.component';
import { CcCampaignChronicleContentComponent } from '../../shared/components/v2/Shell/cc-campaign-chronicle-content/cc-campaign-chronicle-content.component';
import { CcSoundtracksComponent } from '../../shared/components/v2/Soundtracks/cc-soundtracks/cc-soundtracks.component';
import { CcSoundtrackContentComponent } from '../../shared/components/v2/Soundtracks/cc-soundtrack-content/cc-soundtrack-content.component';

@Component({
  selector: 'app-v2-campaign-shell',
  standalone: true,
  imports: [CommonModule, CcV2PlaceholderComponent, CcStorylineComponent, CcStorylineViewComponent, CcStorylineContentComponent, CcCardNavigationComponent, CcCardFactionNavigationComponent, CcDayCounterComponent, CcRadialNavComponent, CcPartyPanelComponent, CcContentDrawerComponent, CcPlayerSecretsContentComponent, CcPartyGoldContentComponent, CcGridAreaTitleComponent, CcWorldMapComponent, CcWorldmapContentComponent, CcCampaignChronicleContentComponent, CcSoundtracksComponent, CcSoundtrackContentComponent, CcEncounterBuilderComponent, CcEncounterGroupPickerComponent, CcFactionPickerComponent, CcFactionCastPickerComponent, CcLocationPickerComponent, CcSublocationPickerComponent, CcCastPickerComponent, CcCastTravelPickerComponent, CcCombatantDetailsComponent, CcGridLoadOverlayComponent,
    CcQuicknotesComponent,
    CcSignalrInspectorComponent,
    CcNoteAssociationPickerComponent,
    CcPurchaseReceiptComponent],
  templateUrl: './v2-campaign-shell.component.html',
  styleUrl: './v2-campaign-shell.component.scss',
})
export class V2CampaignShellComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private animationService = inject(PortalAnimationService);
  auth = inject(AuthService);
  shellSvc = inject(V2CampaignShellService);
  private gridLoad = inject(V2GridLoadService);
  private areaChange = inject(V2AreaChangeService);
  
  @HostBinding('style.--portal-color') get portalColor() { return this.safeColor(this.campaign()?.spineColor); }
  
  campaignId = signal('');
  campaign = signal<CampaignDetail | null>(null);
  
  // Getter for campaign ID to pass to child component
  get campaignIdValue(): string {
    return this.campaignId();
  }
  
  // Viewport positioning state
  viewportPosition = signal({ x: -100, y: -100 }); // Current viewport offset (start in middle middle)
  currentArea = signal('middle-middle'); // Track current area name
  isViewportMoved = signal(false); // Track if viewport has moved from center
  
  /**
   * The black bars that flank a rolodex (see .rolodex-box-blocker-*): drawn only while the
   * viewport is over a column a rolodex belongs to, so they are never left standing over another
   * area's cards. Both the realm's card navigation (middle-middle) and the factions' faction
   * navigation (middle-left) are drawn with them.
   */
  showRolodexBlockers = computed(() => {
    const area = this.currentArea();
    return area === 'middle-middle' || area === 'middle-left';
  });

  // Role detection - computed based on campaign data and auth service
  isDm = computed(() => {
    const camp = this.campaign();
    if (!camp) return false;
    return camp.dmUserId === this.auth.currentUser()?.id;
  });

  /**
   * The campaign detail this viewer is allowed to read, at the URL their own role has for it: the
   * campaign's own detail is its owner's alone (the API asks CallerOwns for it), so anyone else —
   * a player — reads the player's view of the campaign instead, which is the same read the v1
   * player shell opens with.
   */
  private campaignDetailUrl(id: string): string {
    return this.auth.isDm()
      ? `${environment.apiUrl}/api/campaigns/${id}`
      : `${environment.apiUrl}/api/campaigns/${id}/player`;
  }
  
  private hubSubscriptions: Subscription[] = [];

  // ── Right drawer state ─────────────────────────────────────────────────────
  rightDrawer = viewChild.required<CcContentDrawerComponent>('rightDrawer');
  playerSecretsContentTemplate = viewChild.required<TemplateRef<any>>('playerSecretsContentTemplate');
  partyGoldContentTemplate = viewChild.required<TemplateRef<any>>('partyGoldContentTemplate');
  ambianceEditorContentTemplate = viewChild.required<TemplateRef<any>>('ambianceEditorContentTemplate');
  storylineCreateContentTemplate = viewChild.required<TemplateRef<any>>('storylineCreateContentTemplate');
  storylineEditContentTemplate = viewChild.required<TemplateRef<any>>('storylineEditContentTemplate');
  storylineViewContentTemplate = viewChild.required<TemplateRef<any>>('storylineViewContentTemplate');
  worldMapContentTemplate = viewChild.required<TemplateRef<any>>('worldMapContentTemplate');
  chroniclesContentTemplate = viewChild.required<TemplateRef<any>>('chroniclesContentTemplate');
  encounterGroupPickerContentTemplate = viewChild.required<TemplateRef<any>>('encounterGroupPickerContentTemplate');
  factionPickerContentTemplate = viewChild.required<TemplateRef<any>>('factionPickerContentTemplate');
  factionCastPickerContentTemplate = viewChild.required<TemplateRef<any>>('factionCastPickerContentTemplate');
  sublocationPickerContentTemplate = viewChild.required<TemplateRef<any>>('sublocationPickerContentTemplate');
  locationPickerContentTemplate = viewChild.required<TemplateRef<any>>('locationPickerContentTemplate');
  castPickerContentTemplate = viewChild.required<TemplateRef<any>>('castPickerContentTemplate');
  castTravelPickerContentTemplate = viewChild.required<TemplateRef<any>>('castTravelPickerContentTemplate');
  combatantDetailsContentTemplate = viewChild.required<TemplateRef<any>>('combatantDetailsContentTemplate');
  quicknoteAssociationsContentTemplate = viewChild.required<TemplateRef<any>>('quicknoteAssociationsContentTemplate');

  // ── The Admin's own left-hand drawer ───────────────────────────────────────
  /**
   * The SignalR inspector's drawer: the same panel as the right-hand one, drawn on the left (see
   * the drawer's `side` input, which allows the left edge only for an Admin), and opened from the
   * board's own title rather than from a card. See `openSignalrInspector`.
   *
   * Its content template is a plain `#inspectorContentTemplate` reference handed straight to the
   * drawer, rather than a signal like the right-hand drawer's: that drawer's template changes with
   * every request, this one never does.
   */
  inspectorDrawer = viewChild.required<CcContentDrawerComponent>('inspectorDrawer');

  storylineRefreshTick = signal(0);
  storylineEditItem = signal<StorylineContentEdit | null>(null);
  storylineViewItem = signal<StorylineViewItem | null>(null);

  drawerTitle = signal('');
  currentContentTemplate = signal<TemplateRef<any> | null>(null);
  currentContentContext = signal<any>(null);

  /**
   * The shop's own answer to a purchase, while its receipt stands over the board: a Bill of Sale
   * when the purchase went through, a Notice of Denial when it did not (see cc-purchase-receipt).
   *
   * It is raised by the App's own drawer *after* the purchase panel has shut (see its
   * `onDrawerClosed`), so the player steps out of the shop into the paper rather than being handed
   * it while the drawer is still sliding away. The player dismisses it; nothing else clears it.
   */
  purchaseReceipt = signal<PurchaseResult | null>(null);

  dismissPurchaseReceipt() {
    this.purchaseReceipt.set(null);
  }

  /**
   * Opens the Admin's own window on the hub's traffic, from the left. Reached by the board's
   * title icon (see the middle-middle cc-grid-area-title), which only an Admin is handed.
   */
  openSignalrInspector(): void {
    this.inspectorDrawer().open();
  }

  constructor() {
    // Set up campaign data updates from hub
    this.hubSubscriptions.push(
      this.hub.campaignNavChanged$.subscribe(ev => {
        if (!ev || ev.campaignId !== this.campaignId()) return;
        this.http.get<CampaignDetail>(this.campaignDetailUrl(ev.campaignId))
          .subscribe(c => { 
            this.campaign.set(c); 
            this.shellSvc.setCampaign(c);
            // Update role in service
            this.shellSvc.setIsDm(this.isDm());
          });
      })
    );
    
    // Listen for player secrets drawer requests from child components
    this.hubSubscriptions.push(
      this.shellSvc.openPlayerSecrets.subscribe(request => {
        this.drawerTitle.set('Player');
        this.currentContentTemplate.set(this.playerSecretsContentTemplate());
        this.currentContentContext.set({
          member: request.member,
          campaignId: request.campaignId,
          mode: 'dm',
          portalColor: request.portalColor,
        });
        this.rightDrawer().open();
      })
    );

    // Listen for party gold drawer requests
    this.hubSubscriptions.push(
      this.shellSvc.openPartyGold.subscribe(() => {
        this.openPartyGoldDrawer();
      })
    );

    // Listen for encounter group picker requests from the encounter builder
    this.hubSubscriptions.push(
      this.shellSvc.openEncounterGroupPicker.subscribe(() => this.openEncounterGroupPickerDrawer())
    );

    // Listen for faction picker requests from the faction row
    this.hubSubscriptions.push(
      this.shellSvc.openFactionPicker.subscribe(() => this.openFactionPickerDrawer())
    );

    // Listen for cast picker requests from a faction's own ＋ in the faction row
    this.hubSubscriptions.push(
      this.shellSvc.openFactionCastPicker.subscribe(() => this.openFactionCastPickerDrawer())
    );

    // Listen for sublocation picker requests from a location card's own ＋ in the realm row
    this.hubSubscriptions.push(
      this.shellSvc.openSublocationPicker.subscribe(() => this.openSublocationPickerDrawer())
    );

    // Listen for location picker requests from the ＋ at the end of the realm row
    this.hubSubscriptions.push(
      this.shellSvc.openLocationPicker.subscribe(() => this.openLocationPickerDrawer())
    );

    // Listen for cast picker requests from a sublocation card's own ＋ in the realm row
    this.hubSubscriptions.push(
      this.shellSvc.openCastPicker.subscribe(() => this.openCastPickerDrawer())
    );

    // Listen for travel drawer requests from a cast card's own travel button (see cc-cast-travel)
    this.hubSubscriptions.push(
      this.shellSvc.openCastTravelPicker.subscribe(() => this.openCastTravelPickerDrawer())
    );

    // Listen for association drawer requests from a queued quicknote's own link button (see cc-quicknotes)
    this.hubSubscriptions.push(
      this.shellSvc.openQuicknoteAssociations.subscribe(() => this.openQuicknoteAssociationsDrawer())
    );

    // The shop's own answer to a purchase, raised once the purchase panel has shut (see the App's
    // own drawer): the receipt is stood over the board for the player (see cc-purchase-receipt).
    this.hubSubscriptions.push(
      this.shellSvc.shopPurchaseComplete.subscribe(result => {
        if (result) this.purchaseReceipt.set(result);
      })
    );

    // Cards were added to the campaign from the realm row's pickers (their library tab or
    // their form): re-read the campaign so everything behind the drawer sees them.
    this.hubSubscriptions.push(
      this.shellSvc.cardsChanged.subscribe(campaignId => {
        if (!campaignId || campaignId !== this.campaignId()) return;
        this.http.get<CampaignDetail>(this.campaignDetailUrl(campaignId))
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Factions were added to the campaign (the picker's library tab or its form):
    // re-read the campaign so everything behind the drawer sees them.
    this.hubSubscriptions.push(
      this.shellSvc.factionsChanged.subscribe(campaignId => {
        if (!campaignId || campaignId !== this.campaignId()) return;
        this.http.get<CampaignDetail>(this.campaignDetailUrl(campaignId))
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Listen for combatant detail requests from the encounter circle (a card clicked)
    this.hubSubscriptions.push(
      this.shellSvc.openCombatantDetails.subscribe(() => this.openCombatantDetailsDrawer())
    );

    // Listen for ambiance editor drawer requests: an existing card to edit, or a brand new one the
    // library panel has ticked its tracks for (see AmbianceDrawerRequest).
    this.hubSubscriptions.push(
      this.shellSvc.openAmbianceEditor.subscribe(request => {
        this.drawerTitle.set(request.ambiance ? request.ambiance.title : 'New Ambiance');
        this.currentContentTemplate.set(this.ambianceEditorContentTemplate());
        this.currentContentContext.set({
          ambiance: request.ambiance,
          campaignId: request.campaignId,
          portalColor: request.portalColor,
          seedTrackIds: request.seedTrackIds ?? [],
          suggestedTitle: request.suggestedTitle ?? ''
        });
        this.rightDrawer().open();
      })
    );

    // A cast card was sent somewhere else in the campaign — by the travel drawer, or by any other
    // screen the DM is working from: the campaign this shell holds takes the new place on, so every
    // area that reads it rather than its own collections shows the card where it now stands (the
    // party panel's companions above all).
    //
    // A write only reaches the cards a copy holds — a player is handed the cards the campaign has
    // shown them, and one that has just travelled into their party may be a card their copy has never
    // carried, which is no write at all. So a cast that landed with the party, and is missing from
    // this copy, is answered with a read of the campaign instead: the party panel's companions, which
    // are built off this copy, show the card that has just been sent to them as the event lands,
    // rather than at the next read of the campaign. (The same answer a reveal gets — see
    // `refreshCampaign` and the visibility handlers.)
    this.hubSubscriptions.push(
      this.hub.castTravel$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        const sublocationInstanceId = event.isVisible
          ? event.toSublocationInstanceId
          : event.fromSublocationInstanceId;

        // Whether this copy carries the card at all, read before the write moves it.
        const held = this.campaign()?.casts.some(c => c.instanceId === event.castInstanceId) ?? false;

        this.writeCampaign(c => {
          const casts = moveCastTo(c.casts, x => x.instanceId === event.castInstanceId,
            sublocationInstanceId, event.toLocationInstanceId);
          return casts === c.casts ? c : { ...c, casts };
        });

        if (event.traveledToTheParty && !held) this.refreshCampaign();
      })
    );

    // A card's own lock was worked, or a card went into (or came out of) the lock with the whole
    // ring of cards under it: the campaign takes the new state on, which is what the areas that
    // read it rather than their own collections see — the party panel, the note associations, the
    // pickers. The rows that keep their own copies write the same event into them (see
    // cc-card-navigation); this is the campaign itself, the one the whole page reads.
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeCardVisibility(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.bulkCardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeChildrenVisibility(event);
      })
    );

    // The party's own cast cards in a faction moved — a player crowned one, added one, or took one
    // off: the campaign this shell holds takes the faction on as the party's read now has it, which
    // is what every area drawn from the campaign sees. The faction's cast picker above all: its list
    // of members comes off this copy, so a cast a player has just taken off a faction is offered to
    // be put back the moment the drawer is opened, and a drawer already open drops it from its
    // members as the event lands (see cc-faction-cast-picker).
    this.hubSubscriptions.push(
      this.hub.factionPartyCastChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writePartyCastChanged(event);
      })
    );

    // A secret was opened, sealed again, written or dropped: the campaign this shell holds takes the
    // change on, so every area that reads it rather than its own collection shows the card's secrets
    // as the campaign now holds them — the note associations' own counts above all, and, for a
    // player, the secret the GM has just revealed to them. This is how a reveal reaches a player
    // who is working from this shell: the API broadcasts the write, and the secret is written into
    // the copy of the campaign standing on their screen.
    this.hubSubscriptions.push(
      this.hub.secretRevealed$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeSecretRevealed(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.secretResealed$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeSecretResealed(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.secretCreated$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeSecretCreated(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.secretDeleted$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeSecretDeleted(event);
      })
    );

    // The soundtracks area is the DM's own and is not drawn for anyone else (see the middle-right
    // of the template), so its two pieces are reported from here instead: nothing standing in that
    // area would report, and the curtain over the page would otherwise sit out its whole fail-safe
    // before lifting. Reported as soon as the campaign is in hand, which is when the role is known.
    effect(() => {
      if (!this.campaign() || this.isDm()) return;
      this.gridLoad.report('middle-right', 'soundtracks');
      this.gridLoad.report('middle-right', 'ambiances');
    });

    // The notice-board is kept told which area the viewer is standing on, so a change raised for
    // the area they are already looking at stops glowing on its own after a few seconds rather
    // than waiting to be walked to (see V2AreaChangeService.standing).
    effect(() => this.areaChange.standing(this.currentArea() as GridArea));
  }
  
  /**
   * Writes what a card event made of the campaign into the campaign this shell holds — both its own
   * copy of it and the one the rest of the page reads through `shellSvc.campaign()`. A write that
   * comes to nothing hands the campaign back as it stands, so neither signal is rung and nothing is
   * redrawn for an event that changed nothing here.
   */
  private writeCampaign(write: (campaign: CampaignDetail) => CampaignDetail) {
    const update = (c: CampaignDetail | null): CampaignDetail | null => (c ? write(c) : c);

    this.campaign.update(update);
    this.shellSvc.updateCampaign(update);
  }

  /**
   * Reads the campaign again — for the changes that cannot be written from an event alone. A
   * player's copy of the campaign holds only the cards the DM has revealed to them, so a card being
   * revealed is one their copy does not have to write the flag into (see the visibility handlers).
   * The read brings the campaign as the API holds it for this viewer: both the copy this shell keeps
   * and the one the rest of the page reads through `shellSvc.campaign()`.
   */
  private refreshCampaign() {
    this.http.get<CampaignDetail>(this.campaignDetailUrl(this.campaignId()))
      .subscribe(c => {
        this.campaign.set(c);
        this.shellSvc.setCampaign(c);
      });
  }

  /**
   * The party's own cast cards in a faction, written into the campaign this shell holds: the faction
   * the event names takes the party's membership and the party's crown, and everything drawn from
   * this copy of the campaign — the faction's cast picker, its panel — reads them from there.
   *
   * A GM's copy of the campaign is left alone. It stands on the GM's own memberships, which the
   * party's writes never touched (see the API); the GM's look at the party's row is the row's own
   * business (see cc-card-faction-navigation, which takes the same event).
   */
  private writePartyCastChanged(event: FactionPartyCastChangedEvent) {
    if (this.isDm()) return;

    const faction = event.faction;
    if (!faction) return;

    this.writeCampaign(c => {
      const factions = replaceCard(
        c.factions, f => f.factionInstanceId === faction.factionInstanceId, faction);

      return factions === c.factions ? c : { ...c, factions };
    });
  }

  /**
   * One card's lock, written into the campaign: the card the event names takes the state, in the
   * list of the campaign's that holds it. The card types that are not the campaign's own lists
   * (events, handouts, players, secrets) are left to the panels that draw them.
   */
  private writeCardVisibility(event: CardVisibilityChangedEvent) {
    const { instanceId, isVisible } = event;

    switch (event.cardType) {
      case 'location':
        this.writeCampaign(c => {
          const locations = setCardsVisibility(c.locations, l => l.instanceId === instanceId, isVisible);
          return locations === c.locations ? c : { ...c, locations };
        });
        return;

      case 'sublocation':
        this.writeCampaign(c => {
          const sublocations = setCardsVisibility(c.sublocations, s => s.instanceId === instanceId, isVisible);
          return sublocations === c.sublocations ? c : { ...c, sublocations };
        });
        return;

      case 'cast':
        this.writeCampaign(c => {
          const casts = setCardsVisibility(c.casts, x => x.instanceId === instanceId, isVisible);
          return casts === c.casts ? c : { ...c, casts };
        });

        // A player's copy of the campaign holds only the cards revealed to them, so a card being
        // revealed is one it does not have to write the flag into: the campaign is read again, which
        // is what puts the card on the board for them — in the party's faction picker above all (see
        // cc-faction-cast-picker). A GM's copy holds the card already and is written above.
        if (isVisible && !this.isDm()) this.refreshCampaign();
        return;

      case 'faction':
        this.writeCampaign(c => {
          const factions = setCardsVisibility(c.factions, f => f.factionInstanceId === instanceId, isVisible);
          return factions === c.factions ? c : { ...c, factions };
        });
        return;
    }
  }

  /** The same for a whole ring of cards going into, or coming out of, the lock with their parent. */
  private writeChildrenVisibility(event: BulkCardVisibilityChangedEvent) {
    if (event.cardType === 'sublocation') {
      this.writeCampaign(c => {
        const sublocations = setCardsVisibility(
          c.sublocations, s => s.locationInstanceId === event.parentInstanceId, event.isVisible);
        return sublocations === c.sublocations ? c : { ...c, sublocations };
      });
      return;
    }

    this.writeCampaign(c => {
      const casts = setCardsVisibility(
        c.casts, x => x.sublocationInstanceId === event.parentInstanceId, event.isVisible);
      return casts === c.casts ? c : { ...c, casts };
    });

    // As above: a ring of cards going into the lock is a ring a player's copy may not hold at all,
    // so it is read again for them rather than only patched.
    if (event.isVisible && !this.isDm()) this.refreshCampaign();
  }

  /**
   * A secret the GM opened, written into the campaign this viewer holds.
   *
   * A copy that already carries the secret — the GM's own read holds sealed secrets too — has it
   * marked revealed. A copy that does not carry it is a player's, whose read only ever holds the
   * secrets revealed to them: the reveal is written in as a new secret, so long as the card it
   * hangs on is one this viewer holds. Neither a player's card nor their secret is ever written
   * into another viewer's copy: a card they cannot see is no business of theirs, and the API would
   * not have handed them the secret either.
   */
  private writeSecretRevealed(event: SecretRevealedEvent) {
    this.writeCampaign(c => {
      if (c.secrets.some(s => s.id === event.secretId)) {
        return {
          ...c,
          secrets: c.secrets.map(s => s.id === event.secretId
            ? { ...s, isRevealed: true, revealedAt: s.revealedAt ?? new Date().toISOString() }
            : s),
        };
      }

      if (!this.holdsSecretCard(c, event)) return c;

      return {
        ...c,
        secrets: [...c.secrets, this.secretEntry(event, event.secretContent, new Date().toISOString(), c.secrets.length)],
      };
    });
  }

  /**
   * A secret sealed again. The GM's copy keeps it, marked sealed — it is the GM's to open again —
   * while a player's copy drops it: once sealed, the API would no longer hand it to them either.
   */
  private writeSecretResealed(event: SecretResealedEvent) {
    this.writeCampaign(c => {
      if (!c.secrets.some(s => s.id === event.secretId)) return c;

      if (this.isDm()) {
        return {
          ...c,
          secrets: c.secrets.map(s => s.id === event.secretId
            ? { ...s, isRevealed: false, revealedAt: null }
            : s),
        };
      }

      return { ...c, secrets: c.secrets.filter(s => s.id !== event.secretId) };
    });
  }

  /**
   * A secret written. A sealed secret is the GM's own until it is opened, so only the GM's copy of
   * the campaign takes it on — which is what the note associations count. A player's copy never
   * holds it: the reveal that opens it is what will put it there (see `writeSecretRevealed`).
   */
  private writeSecretCreated(event: SecretCreatedEvent) {
    if (!this.isDm()) return;

    this.writeCampaign(c => {
      if (c.secrets.some(s => s.id === event.secretId)) return c;
      if (!this.holdsSecretCard(c, event)) return c;

      return {
        ...c,
        secrets: [...c.secrets, this.secretEntry(event, event.content, null, event.sortOrder)],
      };
    });
  }

  /** A secret dropped: it leaves the campaign this viewer holds, whoever they are. */
  private writeSecretDeleted(event: SecretDeletedEvent) {
    this.writeCampaign(c => {
      if (!c.secrets.some(s => s.id === event.secretId)) return c;
      return { ...c, secrets: c.secrets.filter(s => s.id !== event.secretId) };
    });
  }

  /** Whether the campaign this viewer holds carries the card a secret event hangs on. */
  private holdsSecretCard(
    campaign: CampaignDetail,
    event: { castInstanceId?: string | null; locationInstanceId?: string | null; sublocationInstanceId?: string | null },
  ): boolean {
    if (event.locationInstanceId) return campaign.locations.some(l => l.instanceId === event.locationInstanceId);
    if (event.sublocationInstanceId) return campaign.sublocations.some(s => s.instanceId === event.sublocationInstanceId);
    if (event.castInstanceId) return campaign.casts.some(x => x.instanceId === event.castInstanceId);

    return false;
  }

  /** A secret in the shape the campaign holds its secrets, for one a copy does not hold yet. */
  private secretEntry(
    event: {
      secretId: string;
      campaignId: string;
      castInstanceId: string | null;
      locationInstanceId: string | null;
      sublocationInstanceId: string | null;
    },
    content: string,
    revealedAt: string | null,
    sortOrder: number,
  ): CampaignSecret {
    return {
      id: event.secretId,
      campaignId: event.campaignId,
      castInstanceId: event.castInstanceId,
      locationInstanceId: event.locationInstanceId,
      sublocationInstanceId: event.sublocationInstanceId,
      content,
      sortOrder,
      isRevealed: revealedAt !== null,
      revealedAt,
    };
  }

  safeColor(color: string | undefined): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  openPartyGoldDrawer() {
    this.drawerTitle.set('Award Treasure to Party');
    this.currentContentTemplate.set(this.partyGoldContentTemplate());
    this.currentContentContext.set({
      campaignId: this.campaignId(),
      portalColor: this.safeColor(this.campaign()?.spineColor)
    });
    this.rightDrawer().open();
  }

  openStorylineCreate() {
    this.drawerTitle.set('New Storyline Content');
    this.currentContentTemplate.set(this.storylineCreateContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onStorylineCreated() {
    this.storylineRefreshTick.update(tick => tick + 1);
  }

  openStorylineEdit(item: StorylineContentEdit) {
    this.storylineEditItem.set(item);
    this.drawerTitle.set('Edit Storyline Content');
    this.currentContentTemplate.set(this.storylineEditContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openStorylineView(item: StorylineViewItem) {
    this.storylineViewItem.set(item);
    this.drawerTitle.set('Storyline Content');
    this.currentContentTemplate.set(this.storylineViewContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onPartyGoldAwarded(response: { currency: string; playerAwards: { playerUserId: string; amount: number }[] }) {
    this.shellSvc.partyGoldAwarded.next(response);
  }

  /** Opens the right drawer with the cast picker for an encounter group. */
  openEncounterGroupPickerDrawer() {
    const target = this.shellSvc.encounterPickerTarget();
    this.drawerTitle.set(target.mode === 'new' ? 'New Encounter Group' : `Add to ${target.spotName}`);
    this.currentContentTemplate.set(this.encounterGroupPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /**
   * Opens the right drawer with the cards of one place on the initiative ring: the
   * card clicked on is the panel it opens on, and the arrows walk the place's cards.
   */
  openCombatantDetailsDrawer() {
    const target = this.shellSvc.combatantDetailsTarget();
    if (!target) return;

    this.drawerTitle.set(target.spotName);
    this.currentContentTemplate.set(this.combatantDetailsContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /** The picker finished a group: hand it to the builder and close the drawer. */
  onEncounterGroupPicked(group: EncounterGroupPicked) {
    this.shellSvc.publishEncounterGroupPicked(group);
    this.rightDrawer().close();
  }

  /** Opens the right drawer with the faction picker (library picks, or a new faction). */
  openFactionPickerDrawer() {
    this.drawerTitle.set('Factions');
    this.currentContentTemplate.set(this.factionPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /** Opens the right drawer with one faction's cast picker (the campaign's own cast cards). */
  openFactionCastPickerDrawer() {
    const target = this.shellSvc.factionCastPickerTarget();
    if (!target) return;

    this.drawerTitle.set(target.factionName ? `Add to ${target.factionName}` : 'Add cast');
    this.currentContentTemplate.set(this.factionCastPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /** Opens the right drawer with the location picker (the library's own cards). */
  openLocationPickerDrawer() {
    const target = this.shellSvc.locationPickerTarget();
    if (!target) return;

    this.drawerTitle.set('Add locations');
    this.currentContentTemplate.set(this.locationPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /** Opens the right drawer with a location's sublocation picker (the library's own cards). */
  openSublocationPickerDrawer() {
    const target = this.shellSvc.sublocationPickerTarget();
    if (!target) return;

    this.drawerTitle.set(target.locationName ? `Add to ${target.locationName}` : 'Add sublocation');
    this.currentContentTemplate.set(this.sublocationPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /** Opens the right drawer with one sublocation's cast picker (the library's own cards). */
  openCastPickerDrawer() {
    const target = this.shellSvc.castPickerTarget();
    if (!target) return;

    this.drawerTitle.set(target.sublocationName ? `Add to ${target.sublocationName}` : 'Add cast');
    this.currentContentTemplate.set(this.castPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /**
   * Opens the right drawer with the travel picker for a cast card: the campaign's locations as
   * simple cards, then the sublocations of the one that is picked (see the picker). The drawer is
   * named for the card it is moving.
   */
  openCastTravelPickerDrawer() {
    const target = this.shellSvc.castTravelTarget();
    if (!target) return;

    this.drawerTitle.set(target.castName ? `Travel ${target.castName}` : 'Travel');
    this.currentContentTemplate.set(this.castTravelPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /**
   * Opens the right drawer with the card association picker for one queued quicknote: this
   * campaign's own locations, sublocations, casts and factions, to hang off the note as the
   * hashtags it wears (see cc-note-association-picker).
   */
  openQuicknoteAssociationsDrawer() {
    const target = this.shellSvc.quicknoteAssociationTarget();
    if (!target) return;

    this.drawerTitle.set('Link cards');
    this.currentContentTemplate.set(this.quicknoteAssociationsContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  /** The drawer has gone: whatever note it was linking for is no longer being worked on. */
  onDrawerClosed() {
    this.shellSvc.clearQuicknoteAssociationTarget();
  }

  openChroniclesDrawer() {
    this.drawerTitle.set('Campaign Chronicles');
    this.currentContentTemplate.set(this.chroniclesContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openWorldMapDrawer() {
    this.drawerTitle.set('World Map');
    this.currentContentTemplate.set(this.worldMapContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onWorldMapUploaded(url: string) {
    const update = (c: CampaignDetail | null): CampaignDetail | null =>
      c ? { ...c, worldMapImageUrl: url } : c;
    this.campaign.update(update);
    this.shellSvc.updateCampaign(update);
  }
  
  ngOnInit() {
    // The curtain over the grid (cc-grid-load-overlay) is this page's arrival now, so the
    // app's portal cover is taken off at once rather than fading: its own fade is three
    // seconds long, and a page revealed underneath it would go on brightening for all of
    // them. The shell has no entry fade of its own either, for the same reason — that fade
    // would leave the curtain itself semi-transparent while it played, and the curtain is
    // the only thing that should be fading in here.
    this.animationService.hideNow();

    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    
    this.http.get<CampaignDetail>(this.campaignDetailUrl(id))
      .subscribe(c => {
        this.campaign.set(c);
        this.shellSvc.setCampaign(c);
        this.shellSvc.setIsDm(this.isDm());
        this.animationService.spineColor = c.spineColor;
      });
    
    // Connect to hub for real-time updates
    const connectAndJoin = !this.hub.isConnected()
      ? this.hub.connect().then(() => this.hub.joinCampaign(id))
      : this.hub.joinCampaign(id);
    connectAndJoin.catch(() => {});
  }
  
  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(() => {});
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Move viewport to top-right area (diagonal movement)
  moveToTopRight() {
    this.viewportPosition.set({ x: -200, y: 0 });
    this.currentArea.set('top-right');
    this.isViewportMoved.set(true);
  }
  
  // Return viewport to center
  moveToCenter() {
    this.viewportPosition.set({ x: -100, y: -100 });
    this.currentArea.set('middle-middle');
    this.isViewportMoved.set(false);
  }
  
  // Navigation methods for each area
  moveToTopLeft() {
    this.viewportPosition.set({ x: 0, y: 0 });
    this.currentArea.set('top-left');
    this.isViewportMoved.set(true);
  }
  
  moveToTopMiddle() {
    this.viewportPosition.set({ x: -100, y: 0 });
    this.currentArea.set('top-middle');
    this.isViewportMoved.set(true);
  }
  
  moveToMiddleLeft() {
    this.viewportPosition.set({ x: 0, y: -100 });
    this.currentArea.set('middle-left');
    this.isViewportMoved.set(true);
  }
  
  moveToMiddleRight() {
    this.viewportPosition.set({ x: -200, y: -100 });
    this.currentArea.set('middle-right');
    this.isViewportMoved.set(true);
  }
  
  moveToBottomLeft() {
    this.viewportPosition.set({ x: 0, y: -200 });
    this.currentArea.set('bottom-left');
    this.isViewportMoved.set(true);
  }
  
  moveToBottomMiddle() {
    this.viewportPosition.set({ x: -100, y: -200 });
    this.currentArea.set('bottom-middle');
    this.isViewportMoved.set(true);
  }
  
  moveToBottomRight() {
    this.viewportPosition.set({ x: -200, y: -200 });
    this.currentArea.set('bottom-right');
    this.isViewportMoved.set(true);
  }

  // ── Radial grid navigation dispatcher ───────────────────────────────────────
  onRadialNav(area: string) {
    // The viewer has looked at this area: its button can stop glowing.
    this.areaChange.clear(area as GridArea);

    switch (area) {
      case 'top-left':      this.moveToTopLeft();      break;
      case 'top-middle':    this.moveToTopMiddle();    break;
      case 'top-right':     this.moveToTopRight();     break;
      case 'middle-left':   this.moveToMiddleLeft();   break;
      case 'middle-middle': this.moveToCenter();       break;
      case 'middle-right':  this.moveToMiddleRight();  break;
      case 'bottom-left':   this.moveToBottomLeft();   break;
      case 'bottom-middle': this.moveToBottomMiddle(); break;
      case 'bottom-right':  this.moveToBottomRight();  break;
    }
  }
}