import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
import { SimpleLocationCardComponent } from '../../shared/components/simple-location-card/simple-location-card.component';
import { SimpleSublocationCardComponent } from '../../shared/components/simple-sublocation-card/simple-sublocation-card.component';
import { SimpleCastCardComponent } from '../../shared/components/simple-cast-card/simple-cast-card.component';
import { Location } from '../../shared/models/location.model';
import { Sublocation, CampaignSublocationInstance } from '../../shared/models/sublocation.model';
import { Cast } from '../../shared/models/cast.model';
import { Faction, CampaignFactionInstance } from '../../shared/models/faction.model';
import { PlayerCardWithDetails } from '../../shared/models/player-card.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gm-testarea',
  standalone: true,
  imports: [CommonModule, FormsModule, JournalTitleComponent, CcTextboxComponent, CampaignDropdownComponent, JournalDropdownComponent, CcShopInventoryComponent, CcLangPickerComponent, CcPortraitInputComponent, CcFactionColorsComponent, CcColorPickerComponent, CcCounterBadgeComponent, CcPoliticalInfluenceComponent, CcSymbolPickerComponent, CcCastIconComponent, CcFactionIconComponent, CcLocationIconComponent, CcSublocationIconComponent, CcPlayerIconComponent, CcCampaignIconComponent, CcHandoutIconComponent, PortalCardComponent, CurrencyCardComponent, WhisperCardComponent, LocationCardComponent, SublocationCardComponent, CastCardComponent, FactionCardComponent, CastingCardPlayerComponent, SimpleLocationCardComponent, SimpleSublocationCardComponent, SimpleCastCardComponent],
  
  templateUrl: './gm-testarea.component.html',
  styleUrl: './gm-testarea.component.scss'
})
export class GmTestareaComponent {
  portalColor = '#6e28d0'; // Default purple color for the preview shell animation
  
  private randomizeService = inject(JournalRandomizeService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  // Tab state
  activeTab: string = 'new-component';

  // SignalR test data
  signalrEvents: SignalrEvent[] = [];
  isLoadingSignalrEvents = false;
  signalrError: string | null = null;

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // Collapsible state for component collection tab
  isCampaignCollapsed = true;
  isJournalCollapsed = true;

  toggleCampaign() {
    this.isCampaignCollapsed = !this.isCampaignCollapsed;
    this.cdr.detectChanges();
  }

  toggleJournal() {
    this.isJournalCollapsed = !this.isJournalCollapsed;
    this.cdr.detectChanges();
  }

  // Group collapse state
  collapsedGroups: Set<string> = new Set<string>();

  toggleGroup(eventType: string) {
    if (this.collapsedGroups.has(eventType)) {
      this.collapsedGroups.delete(eventType);
    } else {
      this.collapsedGroups.add(eventType);
    }
    this.cdr.detectChanges();
  }

  isGroupCollapsed(eventType: string): boolean {
    return this.collapsedGroups.has(eventType);
  }

  getUniqueEventTypes(): string[] {
    const types = this.signalrEvents.map(e => e.eventType || 'Other Events');
    return Array.from(new Set(types)).sort((a, b) => {
      return this.getEventTypeOrder(a) - this.getEventTypeOrder(b);
    });
  }

  getEventsByType(eventType: string): SignalrEvent[] {
    return this.signalrEvents.filter(e => (e.eventType || 'Other Events') === eventType);
  }

  // Event type categorization
  getEventType(eventName: string): string {
    const name = eventName.toLowerCase();
    if (name.includes('secret')) return 'Secret Events';
    if (name.includes('visibility') || name.includes('card')) return 'Visibility Events';
    if (name.includes('cast') || name.includes('location') || name.includes('sublocation') || name.includes('faction')) return 'Campaign Entity Events';
    if (name.includes('player') || name.includes('condition') || name.includes('gold')) return 'Player Events';
    if (name.includes('time') || name.includes('day') || name.includes('session')) return 'Time & Session Events';
    if (name.includes('note')) return 'Notes Events';
    if (name.includes('shop')) return 'Shop Events';
    if (name.includes('inventory') || name.includes('soundtrack') || name.includes('subscription') || name.includes('nav') || name.includes('storyline')) return 'System Events';
    return 'Other Events';
  }

  getEventTypeOrder(eventType: string): number {
    const order: Record<string, number> = {
      'Secret Events': 1,
      'Visibility Events': 2,
      'Campaign Entity Events': 3,
      'Player Events': 4,
      'Time & Session Events': 5,
      'Notes Events': 6,
      'Shop Events': 7,
      'System Events': 8,
      'Other Events': 9
    };
    return order[eventType] ?? 99;
  }

  getSortedEvents(): SignalrEvent[] {
    try {
      const eventsWithTypes = this.signalrEvents.map(event => ({
        ...event,
        eventType: this.getEventType(event.eventName),
        typeOrder: this.getEventTypeOrder(this.getEventType(event.eventName))
      }));

      return eventsWithTypes.sort((a, b) => {
        if (a.typeOrder !== b.typeOrder) {
          return a.typeOrder - b.typeOrder;
        }
        return (a.index || 0) - (b.index || 0);
      });
    } catch (e) {
      console.error('Error in getSortedEvents:', e);
      return this.signalrEvents; // Return unsorted if sorting fails
    }
  }

  campaignOptions: CampaignDropdownOption[] = [
    { value: 'campaign1', label: 'Campaign 1', icon: '⚔️' },
    { value: 'campaign2', label: 'Campaign 2', icon: '🏰' },
    { value: 'campaign3', label: 'Campaign 3', icon: '🐉' },
  ];
  
  selectedCampaign = 'campaign1';
  disabledCampaign = 'campaign2';
  campaignRandomizeGroupId = 'test-campaign-group';
  
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

  randomizeCampaign() {
    this.randomizeService.triggerRandomize(this.campaignRandomizeGroupId);
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

simpleTestLocation: Location = {
  id: 'test-loc-2',
  dmUserId: 'test-dm-1',
  name: 'Crystal Cave',
  classification: 'Cave',
  size: 'Small',
  condition: 'Pristine',
  geography: 'Underground',
  architecture: 'Natural',
  climate: 'Temperate',
  religion: 'Druidic',
  vibe: 'Magical',
  languages: 'Common, Sylvan',
  description: 'A glowing underground cavern',
  createdAt: '2024-01-02'
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

simpleTestSublocation: CampaignSublocationInstance = {
  instanceId: 'test-sub-2',
  campaignId: 'test-campaign-1',
  sourceSublocationId: 'source-sub-2',
  locationInstanceId: 'test-loc-2',
  name: 'Armory',
  description: 'Weapons and armor storage',
  shopItems: [
    {
      id: 'item-1',
      name: 'Steel Sword',
      priceAmount: 25,
      priceCurrencyType: 'gp',
      description: 'Well-crafted blade',
      isScratchedOff: false
    },
    {
      id: 'item-2',
      name: 'Leather Armor',
      priceAmount: 10,
      priceCurrencyType: 'gp',
      description: 'Basic protection',
      isScratchedOff: false
    }
  ],
  isVisibleToPlayers: true,
  dmNotes: '',
  keywords: [],
  customItems: [],
  isPartyAnchor: false
};

simpleTestCast: Cast = {
  id: 'test-cast-2',
  dmUserId: 'test-dm-1',
  name: 'Elara Moonwhisper',
  pronouns: 'she/her',
  race: 'Elf',
  role: 'Wizard',
  age: '125',
  alignment: 'Neutral Good',
  posture: 'Graceful',
  speed: 'Medium',
  voicePlacement: ['Medium'],
  voiceNotes: 'Soft and melodic',
  description: 'An ancient elven wizard seeking forgotten knowledge',
  publicDescription: 'A wise elven scholar',
  createdAt: '2024-01-03'
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

constructor() {
    console.log('GmTestareaComponent constructor - activeTab:', this.activeTab);
  }

  // SignalR test methods
  loadSignalrEvents() {
    const url = `${environment.apiUrl}/signalrtest/events`;
    console.log('=== Starting loadSignalrEvents ===');
    console.log('URL:', url);
    this.isLoadingSignalrEvents = true;
    this.signalrError = null;
    this.signalrEvents = [];
    const startTime = performance.now();

    console.log('Setting isLoadingSignalrEvents to true');

    this.http.get<SignalrTestResponse>(`${environment.apiUrl}/signalrtest/events`)
      .subscribe({
        next: (response: SignalrTestResponse) => {
          console.log('=== HTTP Response received ===');
          console.log('Full response:', response);
          console.log('Response events:', response.events);
          console.log('Response events length:', response.events?.length);
          console.log('Response events type:', typeof response.events);

          const endTime = performance.now();
          const responseTime = Math.round(endTime - startTime);

          try {
            if (!response.events || !Array.isArray(response.events)) {
              throw new Error('Response.events is not an array');
            }

            this.signalrEvents = response.events.map((event: any, index: number) => ({
              eventName: event.eventName,
              mockPayload: event.mockPayload,
              responseTime: responseTime,
              index: index + 1,
              eventType: this.getEventType(event.eventName),
              typeOrder: this.getEventTypeOrder(this.getEventType(event.eventName))
            }));
            console.log('Mapped signalrEvents:', this.signalrEvents);
            console.log('signalrEvents.length after mapping:', this.signalrEvents.length);
            console.log('About to set isLoadingSignalrEvents to false');
          } catch (e) {
            console.error('Error mapping events:', e);
            this.signalrError = 'Error processing events: ' + (e as Error).message;
          }

          console.log('Setting isLoadingSignalrEvents to false (success path)');
          this.isLoadingSignalrEvents = false;
          console.log('isLoadingSignalrEvents is now:', this.isLoadingSignalrEvents);
          this.cdr.detectChanges(); // Trigger change detection
          console.log('Change detection triggered');
        },
        error: (err: any) => {
          console.error('=== HTTP Error ===');
          console.error('Error loading SignalR events:', err);
          this.signalrError = 'Failed to load SignalR events: ' + (err.message || 'Unknown error');
          console.log('Setting isLoadingSignalrEvents to false (error path)');
          this.isLoadingSignalrEvents = false;
          this.cdr.detectChanges(); // Trigger change detection
        },
        complete: () => {
          console.log('=== Observable completed ===');
        }
      });
  }

  clearSignalrEvents() {
    this.signalrEvents = [];
    this.signalrError = null;
    this.cdr.detectChanges();
  }
}

// Interfaces for SignalR test data
interface SignalrTestResponse {
  totalEvents: number;
  testCampaignId: string;
  timestamp: string;
  events: SignalrEvent[];
}

interface SignalrEvent {
  eventName: string;
  mockPayload: any;
  responseTime?: number;
  index?: number;
  eventType?: string;
  typeOrder?: number;
}
