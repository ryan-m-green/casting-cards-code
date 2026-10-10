import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CardCondition } from '../shared/models/condition.model';

/**
 * Whose conditions these are: a party member's card, or one card of an encounter.
 * The encounter keeps its own row per card, so a cast card's conditions are written
 * against that row — where they live is the only difference between the two.
 */
export type ConditionSubject =
  | { kind: 'player'; playerCardId: string }
  | { kind: 'combatant'; encounterId: string; combatantId: string };

/**
 * Card conditions API client.
 *
 * A condition hangs off the card that carries it: a party member's off their player
 * card (which the hub then tells the party about, so the player's own sheet shows it
 * without a reload), a cast card's off the encounter's own row for it. The rings that
 * show a card's conditions and the panel that gives them out both come through here,
 * so that one card's route is written once.
 */
@Injectable({ providedIn: 'root' })
export class CardConditionService {
  private http = inject(HttpClient);

  load(campaignId: string, subject: ConditionSubject): Observable<CardCondition[]> {
    return this.http.get<CardCondition[]>(this.url(campaignId, subject));
  }

  /** Gives the card a condition, and returns it as it was written. */
  assign(campaignId: string, subject: ConditionSubject, conditionName: string): Observable<CardCondition> {
    return this.http.post<CardCondition>(this.url(campaignId, subject), { conditionName });
  }

  /** Takes a condition off the card. */
  remove(campaignId: string, subject: ConditionSubject, conditionId: string): Observable<void> {
    return this.http.delete<void>(`${this.url(campaignId, subject)}/${conditionId}`);
  }

  /**
   * The one card's conditions: the campaign's players endpoint for a party member,
   * the encounter's own card for a cast card.
   */
  private url(campaignId: string, subject: ConditionSubject): string {
    const base = `${environment.apiUrl}/api/campaign/${campaignId}`;

    return subject.kind === 'player'
      ? `${base}/players/${subject.playerCardId}/conditions`
      : `${base}/encounters/${subject.encounterId}/combatants/${subject.combatantId}/conditions`;
  }
}
