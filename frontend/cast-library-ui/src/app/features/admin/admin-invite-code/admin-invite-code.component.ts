import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

interface AdminInviteCodeResponse {
  code: string;
  expiresAt: string;
}

@Component({
  selector: 'app-admin-invite-code',
  standalone: true,
  imports: [DmNavComponent],
  templateUrl: './admin-invite-code.component.html',
  styleUrl: './admin-invite-code.component.scss',
})
export class AdminInviteCodeComponent implements OnInit {
  private http = inject(HttpClient);

  code      = signal<AdminInviteCodeResponse | null>(null);
  loading   = signal(false);
  errorMsg  = signal('');

  ngOnInit() {
    this.http.get<AdminInviteCodeResponse | null>(`${environment.apiUrl}/api/admin/invite-code`).subscribe({
      next: res => this.code.set(res),
      error: () => this.errorMsg.set('Failed to load invite code.'),
    });
  }

  generate() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.http.post<AdminInviteCodeResponse>(`${environment.apiUrl}/api/admin/invite-code/generate`, {}).subscribe({
      next: res => {
        this.code.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Failed to generate invite code.');
        this.loading.set(false);
      },
    });
  }

  expiresIn(expiresAt: string): string {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }

  formatDate(expiresAt: string): string {
    return new Date(expiresAt).toLocaleString();
  }
}
