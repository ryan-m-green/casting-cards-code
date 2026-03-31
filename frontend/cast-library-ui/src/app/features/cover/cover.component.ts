import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { SparkleService } from '../../shared/services/sparkle.service';

@Component({
  selector: 'app-cover',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cover.component.html',
  styleUrl: './cover.component.scss'
})
export class CoverComponent {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private fb      = inject(FormBuilder);
  private auth    = inject(AuthService);
  private router  = inject(Router);
  private sparkle = inject(SparkleService);

  loginForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  errorMsg = signal('');
  loading  = signal(false);

  private readonly SPARK_DURATION_MS = 700;

  triggerSparkles(event: MouseEvent): void {
    this.sparkle.trigger(this.sparkHost.nativeElement);
  }

  knock(): void {
    if (this.loginForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { email, password } = this.loginForm.value;
    const sparkStart = Date.now();
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (res) => {
        const elapsed   = Date.now() - sparkStart;
        const remaining = Math.max(0, this.SPARK_DURATION_MS - elapsed);
        setTimeout(() => {
          if (res.user.role === 'DM' || res.user.role === 'Admin') {
            this.router.navigate(['/dm/dashboard']);
          } else {
            this.router.navigate(['/player/campaigns']);
          }
        }, remaining);
      },
      error: (e) => {
        this.errorMsg.set(e.error?.message || 'Login failed');
        this.loading.set(false);
      }
    });
  }

  createAccount(): void { this.router.navigate(['/join']); }
}
