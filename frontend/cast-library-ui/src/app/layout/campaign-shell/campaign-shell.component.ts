import { Component, OnInit, OnDestroy, signal, computed, effect, inject, HostBinding, viewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { CampaignDetail } from '../../shared/models/campaign.model';
import { AuthService } from '../../core/auth/auth.service';
import { CampaignHubService, CastInstanceUpdatedEvent, FactionPartyCastChangedEvent } from '../../core/hub/campaign-hub.service';
import { PortalAnimationService } from '../../core/portal-animation.service';
import { CardVisibilityChangedEvent, BulkCardVisibilityChangedEvent, CampaignSecret, SecretRevealedEvent, SecretResealedEvent, SecretCreatedEvent, SecretDeletedEvent } from '../../shared/models/secret.model';
import { moveCastTo, setCardsVisibility, replaceCard } from '../../shared/models/campaign-card-state';
import { CampaignShellService, GoldAwardNotice } from '../../core/campaign-shell.service';
import { CampaignGridLoadService, GridArea } from '../../core/campaign-grid-load.service';
import { GridAreaChangeService } from '../../core/grid-area-change.service';
import { CcStorylineComponent } from '../../shared/components/Campaign/Storyline/cc-storyline/cc-storyline.component';
import { CcStorylineViewComponent, StorylineViewItem } from '../../shared/components/Campaign/Storyline/cc-storyline-view/cc-storyline-view.component';
import { CcStorylineContentComponent, StorylineContentEdit } from '../../shared/components/Campaign/Storyline/cc-storyline-content/cc-storyline-content.component';
import { CcCardNavigationComponent } from '../../shared/components/Campaign/CardNavigation/cc-card-navigation/cc-card-navigation.component';
import { CcCardFactionNavigationComponent } from '../../shared/components/Campaign/FactionNavigation/cc-card-faction-navigation/cc-card-faction-navigation.component';
import { CcDayCounterComponent } from '../../shared/components/Shared/cc-day-counter/cc-day-counter.component';
import { CcRadialNavComponent } from '../../shared/components/Campaign/Shell/cc-radial-nav/cc-radial-nav.component';
import { CcPartyPanelComponent } from '../../shared/components/Campaign/TheParty/cc-party-panel/cc-party-panel.component';
import { CcContentDrawerComponent } from '../../shared/components/Campaign/Shell/cc-content-drawer/cc-content-drawer.component';
import { CcPlayerSecretsContentComponent } from '../../shared/components/Campaign/TheParty/cc-player-secrets-content/cc-player-secrets-content.component';
import { CcPartyGoldContentComponent } from '../../shared/components/Campaign/TheParty/cc-party-gold-content/cc-party-gold-content.component';
import { CcMyCharacterComponent } from '../../shared/components/Campaign/TheParty/cc-my-character/cc-my-character.component';
import { CcMyCharacterInfoContentComponent } from '../../shared/components/Campaign/TheParty/cc-my-character/cc-my-character-info-content.component';
import { CcMotivationsContentComponent } from '../../shared/components/Campaign/TheParty/cc-my-character/cc-motivations-content.component';
import { CcSecretDetailContentComponent } from '../../shared/components/Campaign/TheParty/cc-secret-detail-content/cc-secret-detail-content.component';
import { CcPlayerSecretCreateContentComponent } from '../../shared/components/Campaign/TheParty/cc-player-secret-create-content/cc-player-secret-create-content.component';
import { CcGridAreaTitleComponent } from '../../shared/components/Campaign/Shared/cc-grid-area-title/cc-grid-area-title.component';
import { CcRolodexFrameComponent } from '../../shared/components/Campaign/Shared/cc-rolodex-frame/cc-rolodex-frame.component';
import { CcSignalrInspectorComponent, InspectorConnection, InspectorRow } from '../../shared/components/Campaign/Diagnostics/cc-signalr-inspector/cc-signalr-inspector.component';
import { CcSignalrEventDetailComponent } from '../../shared/components/Campaign/Diagnostics/cc-signalr-event-detail/cc-signalr-event-detail.component';
import { CcEncounterBuilderComponent } from '../../shared/components/Campaign/Encounters/cc-encounter-builder/cc-encounter-builder.component';
import { CcEncounterGroupPickerComponent } from '../../shared/components/Campaign/Encounters/cc-encounter-group-picker/cc-encounter-group-picker.component';
import { CcFactionPickerComponent } from '../../shared/components/Campaign/FactionNavigation/cc-faction-picker/cc-faction-picker.component';
import { CcFactionCastPickerComponent } from '../../shared/components/Campaign/FactionNavigation/cc-faction-cast-picker/cc-faction-cast-picker.component';
import { CcSublocationPickerComponent } from '../../shared/components/Campaign/CardNavigation/cc-sublocation-picker/cc-sublocation-picker.component';
import { CcLocationPickerComponent } from '../../shared/components/Campaign/CardNavigation/cc-location-picker/cc-location-picker.component';
import { CcCastPickerComponent } from '../../shared/components/Campaign/CardNavigation/cc-cast-picker/cc-cast-picker.component';
import { CcCastTravelPickerComponent } from '../../shared/components/Campaign/Shared/cc-cast-travel-picker/cc-cast-travel-picker.component';
import { CcCombatantDetailsComponent } from '../../shared/components/Campaign/Encounters/cc-combatant-details/cc-combatant-details.component';
import { CcPlayerInventoryComponent } from '../../shared/components/Campaign/Inventory/cc-player-inventory/cc-player-inventory.component';
import { CcPlayerInventoryContentComponent } from '../../shared/components/Campaign/Inventory/cc-player-inventory-content/cc-player-inventory-content.component';
import { CcPlayerEncountersComponent } from '../../shared/components/Campaign/Encounters/cc-player-encounters/cc-player-encounters.component';
import { CcFieldJournalEntryContentComponent } from '../../shared/components/Campaign/FieldJournal/cc-field-journal-entry-content/cc-field-journal-entry-content.component';
import { CcPlayerFieldJournalComponent } from '../../shared/components/Campaign/FieldJournal/cc-player-field-journal/cc-player-field-journal.component';
import { CcEncounterCelebrationComponent } from '../../shared/components/Campaign/Encounters/cc-encounter-celebration/cc-encounter-celebration.component';
import { EncounterCelebrationService } from '../../core/encounter-celebration.service';
import { CcGridLoadOverlayComponent } from '../../shared/components/Campaign/Shell/cc-grid-load-overlay/cc-grid-load-overlay.component';
import { CcQuicknotesComponent } from '../../shared/components/Campaign/Quicknotes/cc-quicknotes/cc-quicknotes.component';
import { CcCardLinkPickerComponent } from '../../shared/components/Campaign/Shared/cc-card-link-picker/cc-card-link-picker.component';
import { CcPurchaseReceiptComponent } from '../../shared/components/Campaign/Shared/cc-purchase-receipt/cc-purchase-receipt.component';
import { CcGrantReceiptComponent } from '../../shared/components/Campaign/Shared/cc-grant-receipt/cc-grant-receipt.component';
import type { PurchaseResult } from '../../shared/models/shop-purchase.model';
import { EncounterGroupPicked } from '../../core/encounter.service';
import { CcWorldMapComponent } from '../../shared/components/Campaign/WorldView/cc-world-map/cc-world-map.component';
import { CcWorldmapContentComponent } from '../../shared/components/Campaign/WorldView/cc-worldmap-content/cc-worldmap-content.component';
import { CcCampaignChronicleContentComponent } from '../../shared/components/Campaign/Shell/cc-campaign-chronicle-content/cc-campaign-chronicle-content.component';
import { CcSoundtracksComponent } from '../../shared/components/Campaign/Soundtracks/cc-soundtracks/cc-soundtracks.component';
import { CcSoundtrackContentComponent } from '../../shared/components/Campaign/Soundtracks/cc-soundtrack-content/cc-soundtrack-content.component';
import { CcRulesComponent } from '../../shared/components/Campaign/Rules/cc-rules/cc-rules.component';
import { CcRuleDetailContentComponent } from '../../shared/components/Campaign/Rules/cc-rule-detail-content/cc-rule-detail-content.component';
import { CcRuleAddComponent } from '../../shared/components/Campaign/Rules/cc-rule-add/cc-rule-add.component';
import { CcConditionAddComponent } from '../../shared/components/Campaign/Conditions/cc-condition-add/cc-condition-add.component';
import { CcConditionDetailComponent } from '../../shared/components/Campaign/Conditions/cc-condition-detail/cc-condition-detail.component';
import type { Rule } from '../../shared/models/rule.model';

@Component({
  selector: 'app-campaign-shell',
  standalone: true,
  imports: [CommonModule, CcStorylineComponent, CcStorylineViewComponent, CcStorylineContentComponent, CcCardNavigationComponent, CcCardFactionNavigationComponent, CcDayCounterComponent, CcRadialNavComponent, CcPartyPanelComponent, CcContentDrawerComponent, CcPlayerSecretsContentComponent, CcPartyGoldContentComponent, CcMyCharacterComponent, CcMyCharacterInfoContentComponent, CcMotivationsContentComponent, CcSecretDetailContentComponent, CcPlayerSecretCreateContentComponent, CcGridAreaTitleComponent, CcWorldMapComponent, CcWorldmapContentComponent, CcCampaignChronicleContentComponent, CcSoundtracksComponent, CcSoundtrackContentComponent, CcEncounterBuilderComponent, CcEncounterGroupPickerComponent, CcFactionPickerComponent, CcFactionCastPickerComponent, CcLocationPickerComponent, CcSublocationPickerComponent, CcCastPickerComponent, CcCastTravelPickerComponent, CcCombatantDetailsComponent, CcGridLoadOverlayComponent,
    CcQuicknotesComponent,
    CcSignalrInspectorComponent,
    CcSignalrEventDetailComponent,
    CcCardLinkPickerComponent,
    CcPurchaseReceiptComponent,
    CcGrantReceiptComponent,
    CcPlayerInventoryComponent,
    CcPlayerInventoryContentComponent,
    CcPlayerEncountersComponent,
    CcFieldJournalEntryContentComponent,
    CcPlayerFieldJournalComponent,
    CcEncounterCelebrationComponent,
    CcRolodexFrameComponent,
    CcRulesComponent,
    CcRuleDetailContentComponent,
    CcRuleAddComponent,
    CcConditionAddComponent,
    CcConditionDetailComponent],
  templateUrl: './campaign-shell.component.html',
  styleUrl: './campaign-shell.component.scss',
})
export class CampaignShellComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private animationService = inject(PortalAnimationService);
  auth = inject(AuthService);
  shellSvc = inject(CampaignShellService);
  private celebration = inject(EncounterCelebrationService);
  private gridLoad = inject(CampaignGridLoadService);
  private areaChange = inject(GridAreaChangeService);
  
  @HostBinding('style.--portal-color') get portalColor() { return this.safeColor(this.campaign()?.spineColor); }
  
  campaignId = signal('');
  campaign = signal<CampaignDetail | null>(null);
  
  get campaignIdValue(): string {
    return this.campaignId();
  }
  
  viewportPosition = signal({ x: -100, y: -100 });
  currentArea = signal('middle-middle');
  isViewportMoved = signal(false);
  
  isDm = computed(() => {
    const camp = this.campaign();
    if (!camp) return false;
    return camp.dmUserId === this.auth.currentUser()?.id;
  });

  private campaignDetailUrl(id: string): string {
    return this.isDm()
      ? `${environment.apiUrl}/api/campaigns/${id}`
      : `${environment.apiUrl}/api/campaigns/${id}/player`;
  }
  
  private hubSubscriptions: Subscription[] = [];

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
  cardLinkContentTemplate = viewChild.required<TemplateRef<any>>('cardLinkContentTemplate');
  myCharacterInfoContentTemplate = viewChild.required<TemplateRef<any>>('myCharacterInfoContentTemplate');
  myCharacterMotivationsContentTemplate = viewChild.required<TemplateRef<any>>('myCharacterMotivationsContentTemplate');
  secretDetailContentTemplate = viewChild.required<TemplateRef<any>>('secretDetailContentTemplate');
  playerSecretCreateContentTemplate = viewChild.required<TemplateRef<any>>('playerSecretCreateContentTemplate');
  playerInventoryContentTemplate = viewChild.required<TemplateRef<any>>('playerInventoryContentTemplate');
  fieldJournalEntryContentTemplate = viewChild.required<TemplateRef<any>>('fieldJournalEntryContentTemplate');
  ruleDetailContentTemplate = viewChild.required<TemplateRef<any>>('ruleDetailContentTemplate');
  ruleAddContentTemplate = viewChild.required<TemplateRef<any>>('ruleAddContentTemplate');
  conditionLibraryContentTemplate = viewChild.required<TemplateRef<any>>('conditionLibraryContentTemplate');
  conditionDetailContentTemplate = viewChild.required<TemplateRef<any>>('conditionDetailContentTemplate');

  inspectorDrawer = viewChild.required<CcContentDrawerComponent>('inspectorDrawer');

  eventDrawer = viewChild.required<CcContentDrawerComponent>('eventDrawer');

  storylineRefreshTick = signal(0);
  storylineEditItem = signal<StorylineContentEdit | null>(null);
  storylineViewItem = signal<StorylineViewItem | null>(null);
  selectedRule = signal<Rule | null>(null);

  drawerTitle = signal('');
  currentContentTemplate = signal<TemplateRef<any> | null>(null);
  currentContentContext = signal<any>(null);

  selectedEvent = signal<InspectorRow | null>(null);

  liveConnections = signal<readonly InspectorConnection[]>([]);

  purchaseReceipt = signal<PurchaseResult | null>(null);

  dismissPurchaseReceipt() {
    this.purchaseReceipt.set(null);
  }

  grantReceipt = signal<GoldAwardNotice | null>(null);

  dismissGrantReceipt() {
    this.grantReceipt.set(null);
  }

  openSignalrInspector(): void {
    this.inspectorDrawer().open();
  }

  openEventDetail(row: InspectorRow): void {
    this.selectedEvent.set(row);
    this.eventDrawer().open();
  }

  closeEventDetail(): void {
    this.eventDrawer().close();
  }

  onConnections(connections: readonly InspectorConnection[]): void {
    this.liveConnections.set(connections);
  }

  constructor() {
    this.hubSubscriptions.push(
      this.hub.on('CampaignNavChanged', 'campaign-shell', ev => {
        if (!ev || ev.campaignId !== this.campaignId()) return;
        this.http.get<CampaignDetail>(this.campaignDetailUrl(ev.campaignId))
          .subscribe(c => { 
            this.campaign.set(c); 
            this.shellSvc.setCampaign(c);
            this.shellSvc.setIsDm(this.isDm());
          });
      })
    );
    
    this.hubSubscriptions.push(
      this.shellSvc.openPlayerSecrets.subscribe(request => {
        this.drawerTitle.set('Player');
        this.currentContentTemplate.set(this.playerSecretsContentTemplate());
        this.currentContentContext.set({
          member: request.member,
          campaignId: request.campaignId,
          mode: this.isDm() ? 'dm' : 'player',
          portalColor: request.portalColor,
        });
        this.rightDrawer().open();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openPartyGold.subscribe(() => {
        if (!this.isDm()) return;
        this.openPartyGoldDrawer();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openPlayerInventory.subscribe(request => {
        this.drawerTitle.set('Your Bag');
        this.currentContentTemplate.set(this.playerInventoryContentTemplate());
        this.currentContentContext.set({
          campaignId: request.campaignId,
          portalColor: request.portalColor,
          item: request.item,
        });
        this.rightDrawer().open();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openFieldJournalEntry.subscribe(request => {
        const card = request.cards[request.index] ?? request.cards[0];
        this.drawerTitle.set(card?.cast.name || 'Field Journal');
        this.currentContentTemplate.set(this.fieldJournalEntryContentTemplate());
        this.currentContentContext.set(request);
        this.rightDrawer().open();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('EncounterEnded', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignIdValue) return;
        this.celebration.start();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openMyCharacterInfo.subscribe(request => {
        this.drawerTitle.set('My Character');
        this.currentContentTemplate.set(this.myCharacterInfoContentTemplate());
        this.currentContentContext.set({
          campaignId: request.campaignId,
          portalColor: request.portalColor,
        });
        this.rightDrawer().open();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openMyCharacterMotivations.subscribe(request => {
        this.drawerTitle.set('Motivations');
        this.currentContentTemplate.set(this.myCharacterMotivationsContentTemplate());
        this.currentContentContext.set({
          campaignId: request.campaignId,
          portalColor: request.portalColor,
        });
        this.rightDrawer().open();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openSecretDetail.subscribe(request => {
        this.drawerTitle.set(request.secret.isShared ? 'Shared Secret' : 'Secret');
        this.currentContentTemplate.set(this.secretDetailContentTemplate());
        this.currentContentContext.set({
          secret: request.secret,
          campaignId: request.campaignId,
          playerCardId: request.playerCardId,
          mode: request.mode,
          portalColor: request.portalColor,
        });
        this.rightDrawer().open();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openPlayerSecretCreate.subscribe(request => {
        this.drawerTitle.set('New Secret');
        this.currentContentTemplate.set(this.playerSecretCreateContentTemplate());
        this.currentContentContext.set({
          campaignId: request.campaignId,
          playerCardId: request.playerCardId,
          portalColor: request.portalColor,
        });
        this.rightDrawer().open();
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.openEncounterGroupPicker.subscribe(() => this.openEncounterGroupPickerDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openConditionLibrary.subscribe(() => this.openConditionLibraryDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openConditionDetail.subscribe(target => this.openConditionDetailDrawer(target))
    );

    this.hubSubscriptions.push(
      this.shellSvc.openFactionPicker.subscribe(() => this.openFactionPickerDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openFactionCastPicker.subscribe(() => this.openFactionCastPickerDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openSublocationPicker.subscribe(() => this.openSublocationPickerDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openLocationPicker.subscribe(() => this.openLocationPickerDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openCastPicker.subscribe(() => this.openCastPickerDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openCastTravelPicker.subscribe(() => this.openCastTravelPickerDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openCardLinkPicker.subscribe(() => this.openCardLinkDrawer())
    );

    this.hubSubscriptions.push(
      this.shellSvc.openChronicleWithSearch.subscribe(query => this.openChroniclesDrawer(query ?? ''))
    );

    this.hubSubscriptions.push(
      this.shellSvc.shopPurchaseComplete.subscribe(result => {
        if (result) this.purchaseReceipt.set(result);
      })
    );

    this.hubSubscriptions.push(
      this.shellSvc.goldAwardNotice.subscribe(notice => {
        if (notice) this.grantReceipt.set(notice);
      })
    );

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

    this.hubSubscriptions.push(
      this.shellSvc.openCombatantDetails.subscribe(() => this.openCombatantDetailsDrawer())
    );

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

    this.hubSubscriptions.push(
      this.hub.on('CastInstanceUpdated', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeCastUpdated(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CastTraveled', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        const sublocationInstanceId = event.isVisible
          ? event.toSublocationInstanceId
          : event.fromSublocationInstanceId;

        const held = this.campaign()?.casts.some(c => c.instanceId === event.castInstanceId) ?? false;

        this.writeCampaign(c => {
          const casts = moveCastTo(c.casts, x => x.instanceId === event.castInstanceId,
            sublocationInstanceId, event.toLocationInstanceId);
          return casts === c.casts ? c : { ...c, casts };
        });

        if (event.traveledToTheParty && !held) this.refreshCampaign();
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('CardVisibilityChanged', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeCardVisibility(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('BulkCardVisibilityChanged', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeChildrenVisibility(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('FactionPartyCastChanged', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writePartyCastChanged(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('PlayerSecretRevealed', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeSecretRevealed(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('SecretResealed', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeSecretResealed(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('SecretCreated', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeSecretCreated(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('SecretDeleted', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.writeSecretDeleted(event);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('GridAreaNotice', 'campaign-shell', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.areaChange.notify(event.gridArea as GridArea, event.userId);
      })
    );

    effect(() => {
      if (!this.campaign() || this.isDm()) return;
      this.gridLoad.report('middle-right', 'soundtracks');
      this.gridLoad.report('middle-right', 'ambiances');
    });

    effect(() => this.areaChange.standing(this.currentArea() as GridArea));
  }
  
  private writeCampaign(write: (campaign: CampaignDetail) => CampaignDetail) {
    const update = (c: CampaignDetail | null): CampaignDetail | null => (c ? write(c) : c);

    this.campaign.update(update);
    this.shellSvc.updateCampaign(update);
  }

  private refreshCampaign() {
    this.http.get<CampaignDetail>(this.campaignDetailUrl(this.campaignId()))
      .subscribe(c => {
        this.campaign.set(c);
        this.shellSvc.setCampaign(c);
      });
  }

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

  private writeCastUpdated(event: CastInstanceUpdatedEvent) {
    const cast = event.cast;
    if (!cast) return;

    // The card's own row as the campaign now holds it — the stars the party put on it included.
    // The deck keeps its own copies (see cc-card-navigation); this is the shell's, which the party
    // panel's traveling companions are drawn from.
    this.writeCampaign(c => {
      const casts = replaceCard(c.casts, x => x.instanceId === cast.instanceId, cast);
      return casts === c.casts ? c : { ...c, casts };
    });
  }

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

    if (event.isVisible && !this.isDm()) this.refreshCampaign();
  }

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

  private writeSecretDeleted(event: SecretDeletedEvent) {
    this.writeCampaign(c => {
      if (!c.secrets.some(s => s.id === event.secretId)) return c;
      return { ...c, secrets: c.secrets.filter(s => s.id !== event.secretId) };
    });
  }

  private holdsSecretCard(
    campaign: CampaignDetail,
    event: { castInstanceId?: string | null; locationInstanceId?: string | null; sublocationInstanceId?: string | null },
  ): boolean {
    if (event.locationInstanceId) return campaign.locations.some(l => l.instanceId === event.locationInstanceId);
    if (event.sublocationInstanceId) return campaign.sublocations.some(s => s.instanceId === event.sublocationInstanceId);
    if (event.castInstanceId) return campaign.casts.some(x => x.instanceId === event.castInstanceId);

    return false;
  }

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

  openRuleDrawer(rule: Rule) {
    this.selectedRule.set(rule);
    this.drawerTitle.set(`Entry: ${rule.name}`);
    this.currentContentTemplate.set(this.ruleDetailContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openRuleAddDrawer() {
    this.drawerTitle.set('Add entries');
    this.currentContentTemplate.set(this.ruleAddContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onPartyGoldAwarded(response: { currency: string; note?: string | null; playerAwards: { playerUserId: string; amount: number }[] }) {
    this.shellSvc.partyGoldAwarded.next(response);
  }

  openEncounterGroupPickerDrawer() {
    const target = this.shellSvc.encounterPickerTarget();
    this.drawerTitle.set(target.mode === 'new' ? 'New Encounter Group' : `Add to ${target.spotName}`);
    this.currentContentTemplate.set(this.encounterGroupPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openConditionLibraryDrawer() {
    this.drawerTitle.set('Conditions');
    this.currentContentTemplate.set(this.conditionLibraryContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openConditionDetailDrawer(target: { campaignId: string; conditionId: string; portalColor: string }) {
    this.shellSvc.conditionDetailTarget.set(target);
    this.drawerTitle.set('Condition');
    this.currentContentTemplate.set(this.conditionDetailContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openCombatantDetailsDrawer() {
    const target = this.shellSvc.combatantDetailsTarget();
    if (!target) return;

    this.drawerTitle.set(target.spotName);
    this.currentContentTemplate.set(this.combatantDetailsContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onEncounterGroupPicked(group: EncounterGroupPicked) {
    this.shellSvc.publishEncounterGroupPicked(group);
    this.rightDrawer().close();
  }

  openFactionPickerDrawer() {
    this.drawerTitle.set('Factions');
    this.currentContentTemplate.set(this.factionPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openFactionCastPickerDrawer() {
    const target = this.shellSvc.factionCastPickerTarget();
    if (!target) return;

    this.drawerTitle.set(target.factionName ? `Add to ${target.factionName}` : 'Add cast');
    this.currentContentTemplate.set(this.factionCastPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openLocationPickerDrawer() {
    const target = this.shellSvc.locationPickerTarget();
    if (!target) return;

    this.drawerTitle.set('Add locations');
    this.currentContentTemplate.set(this.locationPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openSublocationPickerDrawer() {
    const target = this.shellSvc.sublocationPickerTarget();
    if (!target) return;

    this.drawerTitle.set(target.locationName ? `Add to ${target.locationName}` : 'Add sublocation');
    this.currentContentTemplate.set(this.sublocationPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openCastPickerDrawer() {
    const target = this.shellSvc.castPickerTarget();
    if (!target) return;

    this.drawerTitle.set(target.sublocationName ? `Add to ${target.sublocationName}` : 'Add cast');
    this.currentContentTemplate.set(this.castPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openCastTravelPickerDrawer() {
    const target = this.shellSvc.castTravelTarget();
    if (!target) return;

    this.drawerTitle.set(target.castName ? `Travel ${target.castName}` : 'Travel');
    this.currentContentTemplate.set(this.castTravelPickerContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  openCardLinkDrawer() {
    const target = this.shellSvc.cardLinkTarget();
    if (!target) return;

    this.drawerTitle.set('Link cards');
    this.currentContentTemplate.set(this.cardLinkContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onDrawerClosed() {
    this.shellSvc.clearCardLinkTarget();
  }

  openChroniclesDrawer(query = '') {
    this.drawerTitle.set('Campaign Chronicles');
    this.currentContentTemplate.set(this.chroniclesContentTemplate());
    this.currentContentContext.set({ initialSearchQuery: query });
    this.rightDrawer().open();
  }

  openWorldMapDrawer() {
    this.drawerTitle.set('World Map');
    this.currentContentTemplate.set(this.worldMapContentTemplate());
    this.currentContentContext.set(null);
    this.rightDrawer().open();
  }

  onPlayerCharacterChanged() {
    this.shellSvc.publishPlayerCharacterUpdated();
  }

  onSecretsChanged() {
    this.shellSvc.publishSecretsChanged();
  }

  onWorldMapUploaded(url: string) {
    const update = (c: CampaignDetail | null): CampaignDetail | null =>
      c ? { ...c, worldMapImageUrl: url } : c;
    this.campaign.update(update);
    this.shellSvc.updateCampaign(update);
  }
  
  ngOnInit() {
    this.animationService.hideNow();

    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
    
    this.loadCampaign(id);
    
    const connectAndJoin = !this.hub.isConnected()
      ? this.hub.connect().then(() => this.hub.joinCampaign(id))
      : this.hub.joinCampaign(id);
    connectAndJoin.catch(() => {});
  }

  private loadCampaign(id: string) {
    const playerUrl = `${environment.apiUrl}/api/campaigns/${id}/player`;
    const ownerUrl = `${environment.apiUrl}/api/campaigns/${id}`;

    this.http.get<CampaignDetail>(playerUrl).subscribe({
      next: c => {
        if (c.dmUserId !== this.auth.currentUser()?.id) {
          this.applyCampaign(c);
          return;
        }

        this.http.get<CampaignDetail>(ownerUrl).subscribe({
          next: owner => this.applyCampaign(owner),
          error: () => this.applyCampaign(c),
        });
      },
    });
  }

  private applyCampaign(c: CampaignDetail) {
    this.campaign.set(c);
    this.shellSvc.setCampaign(c);
    this.shellSvc.setIsDm(this.isDm());
    this.animationService.spineColor = c.spineColor;
  }

  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(() => {});
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }
  
  moveToTopRight() {
    this.viewportPosition.set({ x: -200, y: 0 });
    this.currentArea.set('top-right');
    this.isViewportMoved.set(true);
  }
  
  moveToCenter() {
    this.viewportPosition.set({ x: -100, y: -100 });
    this.currentArea.set('middle-middle');
    this.isViewportMoved.set(false);
  }
  
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

  onRadialNav(area: string) {
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

  onLeave() {
    const destination = this.auth.isDm() ? '/gm/campaigns' : '/player/campaigns';
    this.hub.leaveCampaign(this.campaignId()).catch(() => {});
    this.animationService.exit(() =>
      this.router.navigate([destination], { state: { noFlip: true } })
    );
  }
}