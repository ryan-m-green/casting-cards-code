import { Component, Input, Output, EventEmitter, computed, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cast } from '../../models/cast.model';
import { Location } from '../../models/location.model';
import { Sublocation } from '../../models/sublocation.model';
import { Faction } from '../../models/faction.model';
import { PlayerCardWithDetails } from '../../models/player-card.model';
import { CastCardComponent } from '../cast-card/cast-card.component';
import { LocationCardComponent } from '../location-card/location-card.component';
import { SublocationCardComponent } from '../sublocation-card/sublocation-card.component';
import { FactionCardComponent } from '../faction-card/faction-card.component';
import { CurrencyCardComponent } from '../currency-card/currency-card.component';
import { WhisperCardComponent } from '../whisper-card/whisper-card.component';
import { PortalCardComponent } from '../portal-card/portal-card.component';
import { CastingCardPlayerComponent } from '../casting-card-player/casting-card-player.component';

export interface CardRevealOverlayData {
  cardType: 'location' | 'sublocation' | 'cast' | 'player' | 'faction' | 'currency' | 'whisper' | 'campaign-event' | 'campaign-handout';
  name: string;
  descriptor: string;
  imageUrl?: string;
  secretContent?: string;
  symbolPath?: string;
  amount?: number;
  currency?: string;
  note?: string;
  portalColor?: string;
  content?: string;
  eventId?: string;
  recipient?: string;
  instanceId?: string;
  sceneText?: string;
  showPortal?: boolean;
  showSettings?: boolean;
  isTraveling?: boolean;
  // Player card specific fields
  playerUserId?: string;
  playerDisplayName?: string;
  playerRace?: string;
  playerClass?: string;
  playerDescription?: string;
}

const EMPTY_CAST_BASE: Omit<Cast, 'name' | 'imageUrl'> = {
  id: '', dmUserId: '', pronouns: '', race: '', role: '', age: '',
  alignment: '', posture: '', speed: '', voicePlacement: [],
  voiceNotes: '', description: '', publicDescription: '', createdAt: '',
};

const EMPTY_LOCATION_BASE: Omit<Location, 'name' | 'imageUrl'> = {
  id: '', dmUserId: '', classification: '', size: '', condition: '',
  geography: '', architecture: '', climate: '', religion: '', vibe: '',
  languages: '', description: '', createdAt: '',
};

const EMPTY_SUBLOCATION_BASE: Omit<Sublocation, 'name' | 'imageUrl'> = {
  id: '', locationId: '', dmUserId: '', description: '',
  shopItems: [], createdAt: '',
};

const EMPTY_FACTION_BASE: Omit<Faction, 'name' | 'imageUrl'> = {
  id: '', dmUserId: '', type: '', influence: 0, perception: 0,
  hidden: false, description: '', dmNotes: '', symbolPath: '', createdAt: '',
  colors: { evilColor: '#000000', goodColor: '#000000' },
};

@Component({
  selector: 'app-card-reveal-overlay',
  standalone: true,
  imports: [CommonModule, CastCardComponent, LocationCardComponent, SublocationCardComponent, FactionCardComponent, CurrencyCardComponent, WhisperCardComponent, PortalCardComponent, CastingCardPlayerComponent],
  templateUrl: './card-reveal-overlay.component.html',
  styleUrl: './card-reveal-overlay.component.scss',
})
export class CardRevealOverlayComponent implements OnInit, OnDestroy {
  @Input() data: CardRevealOverlayData | null = null;
  @Input() cards: CardRevealOverlayData[] = [];
  @Output() dismissed = new EventEmitter<void>();
  @Output() goToSecrets = new EventEmitter<void>();

  currentIndex = signal(0);
  private autoAdvanceInterval?: ReturnType<typeof setInterval>;
  private readonly AUTO_ADVANCE_DELAY = 4000; // 4 seconds per card

  // Computed styles for rolodex fan effect
  readonly cardStyles = computed(() => {
    const cards = this.cards;
    const current = this.currentIndex();
    return cards.map((_, index) => {
      const distance = index - current;
      if (distance === 0) {
        return {
          opacity: 1,
          scale: 1,
          translateY: '0px',
          translateX: '0px',
          translateZ: '0px',
          rotate: '0deg',
          zIndex: 10,
          pointerEvents: 'auto' as const,
        };
      }
      const absDistance = Math.abs(distance);
      const opacity = Math.max(0.3, 1 - (absDistance * 0.25));
      const scale = Math.max(0.75, 1 - (absDistance * 0.1));
      const translateY = `${distance * 35}px`;
      const translateX = `${distance * 30}px`;
      const translateZ = `${-absDistance * 60}px`;
      const rotate = `${distance * 10}deg`;
      const zIndex = 10 - absDistance;
      return {
        opacity,
        scale,
        translateY,
        translateX,
        translateZ,
        rotate,
        zIndex,
        pointerEvents: 'auto' as const,
      };
    });
  });

  ngOnInit() {
    if (this.cards.length > 1) {
      this.startAutoAdvance();
    }
  }

  ngOnDestroy() {
    this.stopAutoAdvance();
  }

  get currentData(): CardRevealOverlayData | null {
    if (this.cards.length > 0) {
      return this.cards[this.currentIndex()] ?? null;
    }
    return this.data;
  }

  get totalCards(): number {
    return this.cards.length > 0 ? this.cards.length : (this.data ? 1 : 0);
  }

  get currentCardNumber(): number {
    return this.currentIndex() + 1;
  }

  get castModel(): Cast | null {
    const d = this.currentData;
    if (!d) return null;
    return { ...EMPTY_CAST_BASE, name: d.name, role: d.descriptor, imageUrl: d.imageUrl };
  }

  get locationModel(): Location | null {
    const d = this.currentData;
    if (!d) return null;
    return { ...EMPTY_LOCATION_BASE, name: d.name, classification: d.descriptor, imageUrl: d.imageUrl };
  }

  get sublocationModel(): Sublocation | null {
    const d = this.currentData;
    if (!d) return null;
    return { ...EMPTY_SUBLOCATION_BASE, name: d.name, imageUrl: d.imageUrl };
  }

  get factionModel(): Faction | null {
    const d = this.currentData;
    if (!d) return null;
    return { ...EMPTY_FACTION_BASE, name: d.name, symbolPath: d.symbolPath ?? '' };
  }

  get playerModel(): PlayerCardWithDetails | null {
    const d = this.currentData;
    if (!d) return null;
    return {
      id: d.instanceId ?? '',
      campaignId: '',
      playerUserId: d.playerUserId ?? d.instanceId ?? '',
      playerDisplayName: d.playerDisplayName ?? d.name,
      name: d.name,
      race: d.playerRace ?? '',
      class: d.playerClass ?? '',
      imageUrl: d.imageUrl,
      description: d.playerDescription,
      conditions: [],
      currencyBalances: [],
      traits: [],
    };
  }

  getCastModel(card: CardRevealOverlayData): Cast {
    return { ...EMPTY_CAST_BASE, name: card.name, role: card.descriptor, imageUrl: card.imageUrl };
  }

  getLocationModel(card: CardRevealOverlayData): Location {
    return { ...EMPTY_LOCATION_BASE, name: card.name, classification: card.descriptor, imageUrl: card.imageUrl };
  }

  getSublocationModel(card: CardRevealOverlayData): Sublocation {
    return { ...EMPTY_SUBLOCATION_BASE, name: card.name, imageUrl: card.imageUrl };
  }

  getFactionModel(card: CardRevealOverlayData): Faction {
    return { ...EMPTY_FACTION_BASE, name: card.name, symbolPath: card.symbolPath ?? '' };
  }

  getPlayerModel(card: CardRevealOverlayData): PlayerCardWithDetails {
    return {
      id: card.instanceId ?? '',
      campaignId: '',
      playerUserId: card.playerUserId ?? card.instanceId ?? '',
      playerDisplayName: card.playerDisplayName ?? card.name,
      name: card.name,
      race: card.playerRace ?? '',
      class: card.playerClass ?? '',
      imageUrl: card.imageUrl,
      description: card.playerDescription,
      conditions: [],
      currencyBalances: [],
      traits: [],
    };
  }

  nextCard() {
    this.stopAutoAdvance();
    const next = (this.currentIndex() + 1) % this.totalCards;
    this.currentIndex.set(next);
    this.startAutoAdvance();
  }

  previousCard() {
    this.stopAutoAdvance();
    const prev = (this.currentIndex() - 1 + this.totalCards) % this.totalCards;
    this.currentIndex.set(prev);
    this.startAutoAdvance();
  }

  private startAutoAdvance() {
    if (this.totalCards <= 1) return;
    this.stopAutoAdvance();
    this.autoAdvanceInterval = setInterval(() => {
      this.nextCard();
    }, this.AUTO_ADVANCE_DELAY);
  }

  private stopAutoAdvance() {
    if (this.autoAdvanceInterval) {
      clearInterval(this.autoAdvanceInterval);
      this.autoAdvanceInterval = undefined;
    }
  }

  dismiss() {
    this.stopAutoAdvance();
    this.dismissed.emit();
  }

  handleWhisperGoToSecrets() {
    this.goToSecrets.emit();
  }

  navigateToCard(index: number) {
    if (index >= 0 && index < this.totalCards) {
      this.stopAutoAdvance();
      this.currentIndex.set(index);
      this.startAutoAdvance();
    }
  }
}
