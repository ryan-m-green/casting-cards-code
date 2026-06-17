import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Session, StartSessionRequest } from '../shared/models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  constructor(private http: HttpClient) {}

  startSession(campaignId: string): Observable<Session> {
    const request: StartSessionRequest = { campaignId };
    return this.http.post<Session>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/sessions`,
      request
    );
  }

  getActiveSession(campaignId: string): Observable<Session | null> {
    return this.http.get<Session | null>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/sessions/active`
    );
  }

  getSessionCount(campaignId: string): Observable<number> {
    return this.http.get<number>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/sessions/count`
    );
  }

  endSession(campaignId: string, endDay: number, alternateTitle?: string): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/sessions/end`,
      { endDay, alternateTitle: alternateTitle ?? '' }
    );
  }

  updateSession(campaignId: string, sessionId: string, title: string, alternateTitle: string): Observable<Session> {
    return this.http.patch<Session>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/sessions/${sessionId}`,
      { title, alternateTitle }
    );
  }
}
