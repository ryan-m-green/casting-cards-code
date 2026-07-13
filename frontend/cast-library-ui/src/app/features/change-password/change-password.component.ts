import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { JournalTitleComponent } from '../../shared/components/journal-title/journal-title.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const newPassword     = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, JournalTitleComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  private router = inject(Router);
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);

  // Account form
  accountForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  // Password form
  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  // Account form signals
  accountLoading  = signal(false);
  accountSuccess  = signal(false);
  accountErrorMsg = signal('');

  // Password form signals
  loading  = signal(false);
  success  = signal(false);
  errorMsg = signal('');

  constructor() {
    // Populate account form with current user data
    const currentUser = this.auth.currentUser();
    if (currentUser) {
      this.accountForm.patchValue({
        displayName: currentUser.displayName,
        email: currentUser.email,
      });
    }
  }

  submitAccount() {
    if (this.accountForm.invalid) return;
    this.accountLoading.set(true);
    this.accountErrorMsg.set('');
    const { displayName, email } = this.accountForm.value;
    const currentUser = this.auth.currentUser();

    // Update both display name and email
    this.auth.updateDisplayName(displayName!).subscribe({
      next: () => {
        // Only update email if it has changed
        if (email && email !== currentUser?.email) {
          this.auth.updateEmail(email).subscribe({
            next: () => {
              this.accountSuccess.set(true);
              this.accountLoading.set(false);
              setTimeout(() => this.accountSuccess.set(false), 3000);
            },
            error: (e) => {
              this.accountErrorMsg.set(e.error?.message || 'Failed to update email. It may already be in use.');
              this.accountLoading.set(false);
            },
          });
        } else {
          this.accountSuccess.set(true);
          this.accountLoading.set(false);
          setTimeout(() => this.accountSuccess.set(false), 3000);
        }
      },
      error: (e) => {
        this.accountErrorMsg.set(e.error?.message || 'Failed to update account information.');
        this.accountLoading.set(false);
      },
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { currentPassword, newPassword } = this.form.value;
    this.auth.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
        const redirectRoute = this.auth.isDm() ? '/gm/dashboard' : '/player/campaigns';
        setTimeout(() => this.router.navigate([redirectRoute]), 2000);
      },
      error: (e) => {
        this.errorMsg.set(e.error?.message || 'Failed to change password.');
        this.loading.set(false);
      },
    });
  }
}
