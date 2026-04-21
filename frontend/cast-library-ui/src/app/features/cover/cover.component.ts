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

  errorMsg    = signal('');
  loading     = signal(false);
  showSuccess = signal(false);

  private readonly SPARK_DURATION_MS = 700;

  private readonly rawScratches = [
    { x: 15, y: 12, w: 80, rot: -8,  op: 0.12 },
    { x: 60, y: 25, w: 45, rot: 12,  op: 0.08 },
    { x: 20, y: 55, w: 30, rot: -3,  op: 0.10 },
    { x: 70, y: 70, w: 60, rot: 6,   op: 0.07 },
    { x: 5,  y: 80, w: 40, rot: -15, op: 0.09 },
    { x: 40, y: 88, w: 55, rot: 4,   op: 0.06 },
    { x: 80, y: 45, w: 25, rot: -20, op: 0.08 },
  ];

  readonly scratches = this.rawScratches.map(s => {
    const cx  = s.x + s.w / 2;
    const rad = s.rot * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rotate = (px: number) => ({
      x: +(cx + (px - cx) * cos).toFixed(2),
      y: +(s.y + (px - cx) * sin).toFixed(2),
    });
    const p1 = rotate(s.x);
    const p2 = rotate(s.x + s.w);
    return {
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      stopMid1: `rgba(255,200,140,${(s.op * 1.5).toFixed(2)})`,
      stopMid2: `rgba(255,200,140,${s.op})`,
    };
  });
  private readonly SUCCESS_HOLD_MS   = 1400;

  readonly crestStarLines = [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
    const rad   = angle * Math.PI / 180;
    const long  = i % 2 === 0 ? 36 : 28;
    const short = i % 2 === 0 ? 18 : 20;
    return {
      x1: 50 + Math.cos(rad) * short,
      y1: 50 + Math.sin(rad) * short,
      x2: 50 + Math.cos(rad) * long,
      y2: 50 + Math.sin(rad) * long,
      stroke:      i % 2 === 0 ? 'rgba(200,140,50,0.65)' : 'rgba(180,120,40,0.4)',
      strokeWidth: i % 2 === 0 ? '1.2' : '0.7',
    };
  });

  readonly crestTicks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const inner = 41;
    const outer = i % 6 === 0 ? 44 : 42.5;
    return {
      x1: 50 + Math.cos(angle) * inner,
      y1: 50 + Math.sin(angle) * inner,
      x2: 50 + Math.cos(angle) * outer,
      y2: 50 + Math.sin(angle) * outer,
    };
  });

  triggerSparkles(event: MouseEvent): void {
    this.sparkle.trigger(this.sparkHost.nativeElement);
  }

  hasEmailError(): boolean {
    const c = this.loginForm.get('email');
    return !!(c?.invalid && c?.touched);
  }

  emailErrorMsg(): string {
    const c = this.loginForm.get('email');
    if (c?.hasError('required')) return 'Seal required';
    if (c?.hasError('email'))    return 'Malformed seal';
    return '';
  }

  hasPasswordError(): boolean {
    const c = this.loginForm.get('password');
    return !!(c?.invalid && c?.touched);
  }

  knock(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    const { email, password } = this.loginForm.value;
    const sparkStart = Date.now();
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (res) => {
        const elapsed   = Date.now() - sparkStart;
        const remaining = Math.max(0, this.SPARK_DURATION_MS - elapsed);
        setTimeout(() => {
          this.loading.set(false);
          this.showSuccess.set(true);
          setTimeout(() => {
            if (res.user.role === 'DM' || res.user.role === 'Admin') {
              this.router.navigate(['/dm/dashboard']);
            } else {
              this.router.navigate(['/player/campaigns']);
            }
          }, this.SUCCESS_HOLD_MS);
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
