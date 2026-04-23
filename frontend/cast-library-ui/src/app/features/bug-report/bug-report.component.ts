import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BugReportService } from '../../shared/services/bug-report.service';
import { SubmitBugReportRequest } from '../../shared/models/bug-report.model';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-bug-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './bug-report.component.html',
  styleUrl: './bug-report.component.scss',
})
export class BugReportComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private bugReportSvc   = inject(BugReportService);
  auth                   = inject(AuthService);

  menuOpen = signal(false);

  readonly severities = ['Low', 'Medium', 'High', 'Critical'] as const;

  form = this.fb.group({
    title:            ['', [Validators.required, Validators.maxLength(255)]],
    description:      ['', Validators.required],
    stepsToReproduce: [''],
    severity:         ['Medium', Validators.required],
    pageUrl:          [''],
  });

  loading   = signal(false);
  submitted = signal(false);
  errorMsg  = signal('');

  ngOnInit() {
    this.form.patchValue({ pageUrl: ""});
  }

  submit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMsg.set('');

    const request: SubmitBugReportRequest = {
      title:            this.form.value.title!,
      description:      this.form.value.description!,
      stepsToReproduce: this.form.value.stepsToReproduce || undefined,
      severity:         this.form.value.severity as SubmitBugReportRequest['severity'],
      pageUrl:          this.form.value.pageUrl || undefined,
      device:           this.getDevice(),
      browser:          this.getBrowser(),
      os:               this.getOs(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    this.bugReportSvc.submit(request).subscribe({
      next:  () => { this.submitted.set(true); this.loading.set(false); },
      error: () => { this.errorMsg.set('Failed to submit report. Please try again.'); this.loading.set(false); },
    });
  }

  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox'))       return 'Firefox';
    if (ua.includes('Edg'))           return 'Edge';
    if (ua.includes('Chrome'))        return 'Chrome';
    if (ua.includes('Safari'))        return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return ua.substring(0, 100);
  }

  private getOs(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows NT'))    return 'Windows';
    if (ua.includes('Mac OS X'))      return 'macOS';
    if (ua.includes('Android'))       return 'Android';
    if (ua.includes('Linux'))         return 'Linux';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  private getDevice(): string {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
    if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }
}
