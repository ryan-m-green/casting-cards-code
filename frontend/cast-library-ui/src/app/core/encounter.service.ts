import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CardCondition } from '../shared/models/condition.model';

export interface EncounterCombatant {
  id: string;
  spotId: string;
  encounterId: string;
  combatantType: 'cast' | 'player' | string;
  sourceCastId?: string;
  playerCardId?: string;
  originCampaignCastInstanceId?: string;
  displayName: string;
  imageUrl: string;
  maxHitPoints: number;
  lostHitPoints: number;
  tempHitPoints: number;
  isDefeated: boolean;
  isCaptured: boolean;
  isEscaped: boolean;
  conditions: string[];
  notes: string;
  initiativeNumber?: number | null;
}

export interface EncounterCombatantCondition extends CardCondition {
  combatantId: string;
}

export interface EncounterSpot {
  id: string;
  encounterId: string;
  initiativeOrder: number;
  groupName?: string;
  turnsTaken?: number;
  combatants: EncounterCombatant[];
}

export interface CampaignEncounter {
  id: string;
  campaignId: string;
  sequenceNumber: number;
  name: string;
  status: string;
  currentSpotId?: string;
  roundNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  endedAt?: string;
  spots: EncounterSpot[];
}

export interface SpotCombatantRequest {
  combatantType: 'cast' | 'player';
  sourceCastId?: string;
  playerCardId?: string;
  originCampaignCastInstanceId?: string;
}

export interface AddCombatantToEncounterRequest extends SpotCombatantRequest {
  spotId?: string;
}

export interface UpdateEncounterCombatantRequest {
  maxHitPoints?: number;
  lostHitPoints?: number;
  tempHitPoints?: number;
  isDefeated?: boolean;
  isCaptured?: boolean;
  isEscaped?: boolean;
  notes?: string;
}

export type EncounterPickerTarget =
  | { mode: 'new' }
  | { mode: 'existing'; spotId: string; spotName: string; spotCombatants: EncounterCombatant[] };

export interface PickedGroupCard {
  request: SpotCombatantRequest;
  maxHitPoints: number;
}

export interface CombatantHitPointsChange {
  combatantIds: string[];
  maxHitPoints: number;
}

export interface EncounterGroupPicked {
  cards: PickedGroupCard[];
  hitPointChanges: CombatantHitPointsChange[];
}

export const ENCOUNTER_MAX_SPOTS = 10;

export interface EncounterPlaces {
  players: number;
  groups: number;
  total: number;
}

export interface CombatantDetailsTarget {
  campaignId: string;
  encounterId: string;
  portalColor: string;
  spotName: string;
  combatants: EncounterCombatant[];
  index: number;
  readOnly?: boolean;
}

export interface SpotInitiativeRequest {
  spotId: string;
  initiativeNumber: number | null;
}

@Injectable({ providedIn: 'root' })
export class EncounterService {
  private http = inject(HttpClient);

  private url(campaignId: string, suffix = ''): string {
    return `${environment.apiUrl}/api/campaign/${campaignId}/encounters${suffix}`;
  }

  list(campaignId: string): Observable<CampaignEncounter[]> {
    return this.http.get<CampaignEncounter[]>(this.url(campaignId));
  }

  get(campaignId: string, encounterId: string): Observable<CampaignEncounter> {
    return this.http.get<CampaignEncounter>(this.url(campaignId, `/${encounterId}`));
  }

  create(campaignId: string, name?: string): Observable<CampaignEncounter> {
    return this.http.post<CampaignEncounter>(this.url(campaignId), { name: name ?? '' });
  }

  startEncounter(campaignId: string, encounterId: string): Observable<CampaignEncounter> {
    return this.http.post<CampaignEncounter>(this.url(campaignId, `/${encounterId}/start`), {});
  }

  endEncounter(campaignId: string, encounterId: string): Observable<void> {
    return this.http.post<void>(this.url(campaignId, `/${encounterId}/end`), {});
  }

  advanceTurn(
    campaignId: string,
    encounterId: string,
    direction: 'next' | 'prev' = 'next'
  ): Observable<{ currentSpotId: string; roundNumber: number; ended: boolean }> {
    return this.http.post<{ currentSpotId: string; roundNumber: number; ended: boolean }>(
      this.url(campaignId, `/${encounterId}/turn`),
      { direction }
    );
  }

  renameEncounter(campaignId: string, encounterId: string, name: string): Observable<void> {
    return this.http.patch<void>(this.url(campaignId, `/${encounterId}`), { name });
  }

  addCombatant(
    campaignId: string,
    encounterId: string,
    request: AddCombatantToEncounterRequest
  ): Observable<EncounterCombatant> {
    return this.http.post<EncounterCombatant>(this.url(campaignId, `/${encounterId}/combatants`), request);
  }

  removeCombatant(campaignId: string, encounterId: string, combatantId: string): Observable<void> {
    return this.http.delete<void>(this.url(campaignId, `/${encounterId}/combatants/${combatantId}`));
  }

  updateCombatant(
    campaignId: string,
    encounterId: string,
    combatantId: string,
    request: UpdateEncounterCombatantRequest
  ): Observable<EncounterCombatant> {
    return this.http.patch<EncounterCombatant>(
      this.url(campaignId, `/${encounterId}/combatants/${combatantId}`),
      request
    );
  }

  getCombatantConditions(
    campaignId: string,
    encounterId: string,
    combatantId: string
  ): Observable<EncounterCombatantCondition[]> {
    return this.http.get<EncounterCombatantCondition[]>(
      this.url(campaignId, `/${encounterId}/combatants/${combatantId}/conditions`)
    );
  }

  createSpot(campaignId: string, encounterId: string, combatants: SpotCombatantRequest[]): Observable<EncounterSpot> {
    return this.http.post<EncounterSpot>(this.url(campaignId, `/${encounterId}/spots`), { combatants });
  }

  renameSpot(campaignId: string, encounterId: string, spotId: string, name: string): Observable<void> {
    return this.http.patch<void>(this.url(campaignId, `/${encounterId}/spots/${spotId}`), { name });
  }

  deleteSpot(campaignId: string, encounterId: string, spotId: string): Observable<void> {
    return this.http.delete<void>(this.url(campaignId, `/${encounterId}/spots/${spotId}`));
  }

  reorderSpots(campaignId: string, encounterId: string, spotIds: string[]): Observable<void> {
    return this.http.patch<void>(this.url(campaignId, `/${encounterId}/order`), { spotIds });
  }

  setInitiative(campaignId: string, encounterId: string, spots: SpotInitiativeRequest[]): Observable<CampaignEncounter> {
    return this.http.patch<CampaignEncounter>(this.url(campaignId, `/${encounterId}/initiative`), { spots });
  }
}
