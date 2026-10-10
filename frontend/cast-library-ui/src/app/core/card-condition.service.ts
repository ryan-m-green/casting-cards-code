import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CardCondition } from '../shared/models/condition.model';

export type ConditionSubject =
  | { kind: 'player'; playerCardId: string }
  | { kind: 'combatant'; encounterId: string; combatantId: string };

@Injectable({ providedIn: 'root' })
export class CardConditionService {
  private http = inject(HttpClient);

  load(campaignId: string, subject: ConditionSubject): Observable<CardCondition[]> {
    return this.http.get<CardCondition[]>(this.url(campaignId, subject));
  }

  assign(campaignId: string, subject: ConditionSubject, conditionName: string): Observable<CardCondition> {
    return this.http.post<CardCondition>(this.url(campaignId, subject), { conditionName });
  }

  remove(campaignId: string, subject: ConditionSubject, conditionId: string): Observable<void> {
    return this.http.delete<void>(`${this.url(campaignId, subject)}/${conditionId}`);
  }

  private url(campaignId: string, subject: ConditionSubject): string {
    const base = `${environment.apiUrl}/api/campaign/${campaignId}`;

    return subject.kind === 'player'
      ? `${base}/players/${subject.playerCardId}/conditions`
      : `${base}/encounters/${subject.encounterId}/combatants/${subject.combatantId}/conditions`;
  }
}
