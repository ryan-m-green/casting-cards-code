import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { JournalTitleComponent } from '../../shared/components/journal-title/journal-title.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, JournalTitleComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private auth   = inject(AuthService);

  private token = '';

  loading  = signal(true);
  success  = signal(false);
  errorMsg = signal('');

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.router.navigate(['/forgot-password']);
      return;
    }
    this.token = token;
    this.verifyEmail();
  }

  verifyEmail() {
    this.auth.verifyEmail(this.token).subscribe({
      next: (response) => {
        this.success.set(true);
        this.loading.set(false);
        // Redirect based on bypass payment flag
        setTimeout(() => {
          if (response.bypassPayment) {
            this.router.navigate(['/dm/dashboard']);
          } else {
            this.router.navigate(['/subscription-choice']);
          }
        }, 1500);
      },
      error: (e) => {
        this.errorMsg.set(e.error?.message || 'Invalid or expired verification link.');
        this.loading.set(false);
      },
    });
  }
}
