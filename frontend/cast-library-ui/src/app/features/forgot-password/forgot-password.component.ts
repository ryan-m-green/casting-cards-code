import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading   = signal(false);
  submitted = signal(false);

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const { email } = this.form.value;
    this.auth.forgotPassword(email!).subscribe({
      next:  () => { this.submitted.set(true); this.loading.set(false); },
      error: () => { this.submitted.set(true); this.loading.set(false); }, // always show same message
    });
  }
}
