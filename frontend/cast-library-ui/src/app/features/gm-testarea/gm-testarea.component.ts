import { Component, inject } from '@angular/core';
import { JournalTitleComponent } from '../../shared/components/journal-title/journal-title.component';
import { CcTextboxComponent, CampaignDropdownComponent, CampaignDropdownOption, JournalDropdownComponent, JournalDropdownOption, CcShopInventoryComponent, ShopItemData, CcLangPickerComponent, CcPortraitInputComponent, CcFactionColorsComponent, CcColorPickerComponent, CcCounterBadgeComponent, CcPoliticalInfluenceComponent, CcSymbolPickerComponent, CcCastIconComponent, CcFactionIconComponent, CcLocationIconComponent, CcSublocationIconComponent, CcPlayerIconComponent, CcCampaignIconComponent, CcHandoutIconComponent } from '../../shared/components/v2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JournalRandomizeService } from '../../shared/services/journal-randomize.service';
import { PortalCardComponent } from '../../shared/components/portal-card/portal-card.component';
import { CurrencyCardComponent } from '../../shared/components/currency-card/currency-card.component';
import { WhisperCardComponent } from '../../shared/components/whisper-card/whisper-card.component';
import { LocationCardComponent } from '../../shared/components/location-card/location-card.component';
import { SublocationCardComponent } from '../../shared/components/sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../../shared/components/cast-card/cast-card.component';
import { FactionCardComponent } from '../../shared/components/faction-card/faction-card.component';
import { CastingCardPlayerComponent } from '../../shared/components/casting-card-player/casting-card-player.component';
import { Location } from '../../shared/models/location.model';
import { Sublocation, CampaignSublocationInstance } from '../../shared/models/sublocation.model';
import { Cast } from '../../shared/models/cast.model';
import { Faction, CampaignFactionInstance } from '../../shared/models/faction.model';
import { PlayerCardWithDetails } from '../../shared/models/player-card.model';

@Component({
  selector: 'app-gm-testarea',
  standalone: true,
  imports: [CommonModule, FormsModule, JournalTitleComponent, CcTextboxComponent, CampaignDropdownComponent, JournalDropdownComponent, CcShopInventoryComponent, CcLangPickerComponent, CcPortraitInputComponent, CcFactionColorsComponent, CcColorPickerComponent, CcCounterBadgeComponent, CcPoliticalInfluenceComponent, CcSymbolPickerComponent, CcCastIconComponent, CcFactionIconComponent, CcLocationIconComponent, CcSublocationIconComponent, CcPlayerIconComponent, CcCampaignIconComponent, CcHandoutIconComponent, PortalCardComponent, CurrencyCardComponent, WhisperCardComponent, LocationCardComponent, SublocationCardComponent, CastCardComponent, FactionCardComponent, CastingCardPlayerComponent],
  templateUrl: './gm-testarea.component.html',
  styleUrl: './gm-testarea.component.scss'
})
export class GmTestareaComponent {
  portalColor = '#6e28d0'; // Default purple color for the preview shell animation
  
  private randomizeService = inject(JournalRandomizeService);
  
  campaignOptions: CampaignDropdownOption[] = [
    { value: 'campaign1', label: 'Campaign 1', icon: '⚔️' },
    { value: 'campaign2', label: 'Campaign 2', icon: '🏰' },
    { value: 'campaign3', label: 'Campaign 3', icon: '🐉' },
  ];
  
  selectedCampaign = 'campaign1';
  disabledCampaign = 'campaign2';
  
  journalOptions: JournalDropdownOption[] = [
    { value: 'journal1', label: 'Journal 1', icon: '📜' },
    { value: 'journal2', label: 'Journal 2', icon: '📓' },
    { value: 'journal3', label: 'Journal 3', icon: '📔' },
    { value: 'journal4', label: 'Journal 4', icon: '📒' },
    { value: 'journal5', label: 'Journal 5', icon: '📕' },
    { value: 'journal6', label: 'Journal 6', icon: '📗' },
    { value: 'journal7', label: 'Journal 7', icon: '📘' },
    { value: 'journal8', label: 'Journal 8', icon: '📙' },
  ];
  
  selectedJournal = 'journal1';
  journalRandomizeGroupId = 'test-journal-group';
  
  randomizeJournal() {
    this.randomizeService.triggerRandomize(this.journalRandomizeGroupId);
  }

  shopItems: ShopItemData[] = [
    {
      name: 'Iron Sword',
      priceAmount: 15,
      priceCurrencyType: 'gp',
      description: 'Well-balanced blade'
    },
    {
      name: 'Health Potion',
      priceAmount: 50,
      priceCurrencyType: 'gp',
      description: 'Restores 10 HP'
    }
  ];

  shopItemsJournal: ShopItemData[] = [
    {
      name: 'Quill Pen',
      priceAmount: 5,
      priceCurrencyType: 'sp',
      description: 'Fancy writing instrument'
    },
    {
      name: 'Inkwell',
      priceAmount: 10,
      priceCurrencyType: 'sp',
      description: 'Contains black ink'
    }
  ];

  campaignLanguages = 'Common, Dwarvish, Elvish';
  journalLanguages = 'Common, Halfling';

  campaignPortrait: File | null = null;
  journalPortrait: File | null = null;

  campaignEvilColor = '#004d1a';
  campaignGoodColor = '#ff99bb';
  journalEvilColor = '#B8D820';
  journalGoodColor = '#FFC0DC';

  campaignPerception = 0;
  journalPerception = 0;

  campaignHideColorPickers = false;
  journalHideColorPickers = false;

  campaignPoliticalInfluence = 5;
  journalPoliticalInfluence = 3;

  campaignSymbol: string | null = null;
  journalSymbol: string | null = null;

  campaignSingleColor = '#6e28d0';
  journalSingleColor = '#B8D820';

  campaignCounter = 5;
  journalCounter = 3;

  // Mock data for cards
testLocation: Location = {
  id: 'test-loc-1',
  dmUserId: 'test-dm-1',
  name: 'Shadowfell Manor',
  classification: 'Dungeon',
  size: 'Large',
  condition: 'Ruined',
  geography: 'Mountains',
  architecture: 'Gothic',
  climate: 'Cold',
  religion: 'Forgotten',
  vibe: 'Haunted',
  languages: 'Common',
  description: 'A dark and mysterious manor',
  createdAt: '2024-01-01'
};

testSublocation: CampaignSublocationInstance = {
  instanceId: 'test-sub-1',
  campaignId: 'test-campaign-1',
  sourceSublocationId: 'source-sub-1',
  locationInstanceId: 'test-loc-1',
  name: 'The Great Hall',
  description: 'A grand hall with crumbling pillars',
  shopItems: [],
  isVisibleToPlayers: true,
  dmNotes: '',
  keywords: [],
  customItems: [],
  isPartyAnchor: false
};

testCast: Cast = {
  id: 'test-cast-1',
  dmUserId: 'test-dm-1',
  name: 'Sir Valerius',
  pronouns: 'he/him',
  race: 'Human',
  role: 'Paladin',
  age: '35',
  alignment: 'Lawful Good',
  posture: 'Upright',
  speed: 'Medium',
  voicePlacement: ['Deep'],
  voiceNotes: 'Noble tone',
  description: 'A noble paladin',
  publicDescription: 'A knight in shining armor',
  createdAt: '2024-01-01'
};

testFaction: Faction = {
  id: 'test-faction-1',
  dmUserId: 'test-dm-1',
  name: 'The Silver Hand',
  type: 'Religious',
  influence: 5,
  hidden: false,
  description: 'Noble order of knights',
  colors: {
    evilColor: '#004d1a',
    goodColor: '#ff99bb'
  },
  createdAt: '2024-01-01'
};

testPlayerCard: PlayerCardWithDetails = {
  id: 'test-player-1',
  campaignId: 'test-campaign-1',
  playerUserId: 'player-1',
  playerDisplayName: 'Player 1',
  name: 'Aldric the Brave',
  race: 'Human',
  class: 'Fighter',
  conditions: [],
  currencyBalances: [],
  traits: []
};

constructor() {}
}