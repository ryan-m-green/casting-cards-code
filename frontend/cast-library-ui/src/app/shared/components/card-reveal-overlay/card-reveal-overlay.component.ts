import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cast } from '../../models/cast.model';
import { Location } from '../../models/location.model';
import { Sublocation } from '../../models/sublocation.model';
import { Faction } from '../../models/faction.model';
import { CastCardComponent } from '../cast-card/cast-card.component';
import { LocationCardComponent } from '../location-card/location-card.component';
import { SublocationCardComponent } from '../sublocation-card/sublocation-card.component';
import { FactionCardComponent } from '../faction-card/faction-card.component';

export interface CardRevealOverlayData {
  cardType: 'location' | 'sublocation' | 'cast' | 'player' | 'faction';
  name: string;
  descriptor: string;
  imageUrl?: string;
  secretContent?: string;
  symbolPath?: string;
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
};

@Component({
  selector: 'app-card-reveal-overlay',
  standalone: true,
  imports: [CommonModule, CastCardComponent, LocationCardComponent, SublocationCardComponent, FactionCardComponent],
  templateUrl: './card-reveal-overlay.component.html',
  styleUrl: './card-reveal-overlay.component.scss',
})
export class CardRevealOverlayComponent {
  @Input() data: CardRevealOverlayData | null = null;
  @Output() dismissed = new EventEmitter<void>();

  get castModel(): Cast | null {
    if (!this.data) return null;
    return { ...EMPTY_CAST_BASE, name: this.data.name, role: this.data.descriptor, imageUrl: this.data.imageUrl };
  }

  get locationModel(): Location | null {
    if (!this.data) return null;
    return { ...EMPTY_LOCATION_BASE, name: this.data.name, classification: this.data.descriptor, imageUrl: this.data.imageUrl };
  }

  get sublocationModel(): Sublocation | null {
    if (!this.data) return null;
    return { ...EMPTY_SUBLOCATION_BASE, name: this.data.name, imageUrl: this.data.imageUrl };
  }

  get factionModel(): Faction | null {
    if (!this.data) return null;
    return { ...EMPTY_FACTION_BASE, name: this.data.name, symbolPath: this.data.symbolPath ?? '' };
  }

  dismiss() {
    this.dismissed.emit();
  }
}
