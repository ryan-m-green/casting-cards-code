import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BugReportService } from '../../../shared/services/bug-report.service';
import { BugReport } from '../../../shared/models/bug-report.model';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';

@Component({
  selector: 'app-admin-bug-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, JournalTitleComponent],
  templateUrl: './admin-bug-reports.component.html',
  styleUrl: './admin-bug-reports.component.scss',
})
export class AdminBugReportsComponent implements OnInit {
  private bugReportSvc = inject(BugReportService);

  bugs        = signal<BugReport[]>([]);
  loading     = signal(false);
  marking     = signal<string | null>(null);
  deleting    = signal<string | null>(null);
  cleaning    = signal(false);
  errorMsg    = signal('');

  ngOnInit() {
    this.loadBugs();
  }

  loadBugs() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.bugReportSvc.getAll().subscribe({
      next: res => { this.bugs.set(res); this.loading.set(false); },
      error: () => { this.errorMsg.set('Failed to load bug reports.'); this.loading.set(false); },
    });
  }

  markFixed(bug: BugReport) {
    if (bug.isFixed) return;
    this.marking.set(bug.id);
    this.bugReportSvc.markFixed(bug.id).subscribe({
      next: () => {
        this.bugs.update(list =>
          list.map(b => b.id === bug.id ? { ...b, isFixed: true, fixedAt: new Date().toISOString() } : b)
        );
        this.marking.set(null);
      },
      error: () => { this.marking.set(null); },
    });
  }

  deleteBug(bug: BugReport) {
    this.deleting.set(bug.id);
    this.bugReportSvc.deleteBug(bug.id).subscribe({
      next: () => {
        this.bugs.update(list => list.filter(b => b.id !== bug.id));
        this.deleting.set(null);
      },
      error: () => { this.deleting.set(null); },
    });
  }


  cleanup() {
    this.cleaning.set(true);
    this.bugReportSvc.cleanup().subscribe({
      next: () => {
        this.cleaning.set(false);
        this.loadBugs();
      },
      error: () => { this.cleaning.set(false); },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

get openBugs(): BugReport[] {
    return this.bugs()
      .filter(b => !b.isFixed)
      .sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime());
  }

  get fixedBugs(): BugReport[] {
    return this.bugs().filter(b => b.isFixed);
  }
}
