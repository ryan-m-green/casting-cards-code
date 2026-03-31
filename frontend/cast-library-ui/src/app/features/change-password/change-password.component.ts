import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { DmNavComponent } from '../../shared/components/dm-nav/dm-nav.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const newPassword     = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, DmNavComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  private router = inject(Router);
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  loading  = signal(false);
  success  = signal(false);
  errorMsg = signal('');

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { currentPassword, newPassword } = this.form.value;
    this.auth.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/dm/dashboard']), 2000);
      },
      error: (e) => {
        this.errorMsg.set(e.error?.message || 'Failed to change password.');
        this.loading.set(false);
      },
    });
  }
}
