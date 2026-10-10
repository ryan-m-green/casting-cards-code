import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BugReport, SubmitBugReportRequest } from '../models/bug-report.model';

@Injectable({ providedIn: 'root' })
export class BugReportService {
  private http = inject(HttpClient);

  submit(request: SubmitBugReportRequest): Observable<BugReport> {
    return this.http.post<BugReport>(`${environment.apiUrl}/api/bug-reports`, request);
  }

  getAll(): Observable<BugReport[]> {
    return this.http.get<BugReport[]>(`${environment.apiUrl}/api/bug-reports`);
  }

  markFixed(id: string): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/api/bug-reports/${id}/mark-fixed`, {});
  }

  updateSeverity(id: string, severity: string): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/api/bug-reports/${id}/severity`, { severity });
  }

  deleteBug(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/bug-reports/${id}`);
  }

  cleanup(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/bug-reports/cleanup`);
  }
}
