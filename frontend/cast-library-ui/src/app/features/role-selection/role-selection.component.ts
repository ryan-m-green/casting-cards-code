import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password        = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-role-selection',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './role-selection.component.html',
  styleUrl: './role-selection.component.scss'
})
export class RoleSelectionComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    inviteCode:      ['', Validators.required],
    displayName:     ['', Validators.required],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
  }, { validators: passwordsMatch });

  selectedRole = signal<'DM' | 'Player'>('DM');
  errorMsg     = signal('');
  loading      = signal(false);

  get passwordMismatch(): boolean {
    const confirm = this.registerForm.get('confirmPassword');
    return !!this.registerForm.hasError('passwordMismatch') && !!confirm?.touched;
  }

  register() {
    if (this.registerForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { email, password, displayName, inviteCode } = this.registerForm.value;
    this.auth.register({
      email: email!,
      password: password!,
      displayName: displayName!,
      role: this.selectedRole(),
      inviteCode: inviteCode!,
    }).subscribe({
      next: () => {
        if (this.selectedRole() === 'DM') {
          this.router.navigate(['/subscribe']);
        } else {
          this.router.navigate(['/player/campaigns']);
        }
      },
      error: (e) => {
        this.errorMsg.set(e.error?.[0] || 'Registration failed');
        this.loading.set(false);
      }
    });
  }

  signIn() { this.router.navigate(['/']); }
}
