import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PlayerFieldJournalEntry {
  id: string;
  campaignId: string;
  encounterId: string;
  cardKey: string;
  castInstanceId: string | null;
  sourceCastId: string | null;
  notes: string;
  updatedAt: string;
}

export interface PlayerFieldJournalTarget {
  encounterId: string;
  castInstanceId: string | null;
  sourceCastId: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlayerFieldJournalService {
  private http = inject(HttpClient);

  private url(campaignId: string): string {
    return `${environment.apiUrl}/api/campaigns/${campaignId}/field-journal`;
  }

  list(campaignId: string): Observable<PlayerFieldJournalEntry[]> {
    return this.http.get<PlayerFieldJournalEntry[]>(this.url(campaignId));
  }

  save(
    campaignId: string,
    target: PlayerFieldJournalTarget,
    notes: string
  ): Observable<PlayerFieldJournalEntry> {
    return this.http.put<PlayerFieldJournalEntry>(this.url(campaignId), {
      encounterId: target.encounterId,
      castInstanceId: target.castInstanceId,
      sourceCastId: target.sourceCastId,
      notes,
    });
  }
}
