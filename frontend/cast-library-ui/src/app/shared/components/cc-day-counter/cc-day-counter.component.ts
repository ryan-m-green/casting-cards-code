import {
  Component,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal,
  computed,
  inject,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TimeOfDay, TimeOfDaySlice } from '../../models/time-of-day.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { LockIconComponent } from '../lock-icon/lock-icon.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cc-day-counter',
  standalone: true,
  imports: [CommonModule, LockIconComponent, ConfirmDialogComponent],
  templateUrl: './cc-day-counter.component.html',
  styleUrl: './cc-day-counter.component.scss',
})
export class CcDayCounterComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campaignId!: string;
  @Input() isDm = false;
  @Input() allowInteraction = false;
  @Input() panelTheme: 'light' | 'dark' = 'light';
  @Input() todInput: TimeOfDay | null = null;
  @Input() previewOnly = false;
  @Input() portalColor = '';

  @ViewChild('barTrack') barTrackRef!: ElementRef<HTMLElement>;

  private http = inject(HttpClient);
  private hub  = inject(CampaignHubService);
  private hubSubscriptions: Subscription[] = [];

  tod             = signal<TimeOfDay | null>(null);
  cursorPercent   = signal(0);
  daysPassed      = signal(0);
  isDragging      = signal(false);
  isShimmering    = signal(false);
  isLocked        = signal(true);
  showAdvanceConfirm = signal(false);

  private shimmerTimer?: ReturnType<typeof setTimeout>;
  private autoLockTimer?: ReturnType<typeof setTimeout>;
  private dragStart = 0;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Day/night gradient painted directly on the bar (the slices are non-interactive)
  barGradient = computed(() => {
    const slices = this.tod()?.slices ?? [];
    if (!slices.length) return 'none';
    const stops: string[] = [];
    slices.forEach((slice, index) => {
      const nextColor = slices[(index + 1) % slices.length]?.color ?? slice.color;
      if (index === slices.length - 1) {
        stops.push(
          `${slice.color} ${slice.startPercent}%`,
          `${slice.color} calc(100% - 16px)`,
          `${nextColor} 100%`
        );
      } else {
        stops.push(`${slice.color} ${slice.startPercent}%`, `${nextColor} ${slice.endPercent}%`);
      }
    });
    return `linear-gradient(to right, ${stops.join(', ')})`;
  });

  constructor() {
    // React to any user moving cursor — broadcast updates all connected clients
    this.hubSubscriptions.push(
      this.hub.timeCursorMoved$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId) return;
        if (this.isDragging()) return; // don't override an in-progress local drag
        this.animateCursorTo(event.positionPercent);
      })
    );

    // React to full time-of-day config replaced
    this.hubSubscriptions.push(
      this.hub.timeOfDayUpdated$.subscribe(updated => {
        if (!updated || updated.campaignId !== this.campaignId) return;
        this.loadFromTod(updated);
      })
    );

    // React to day advanced (all users)
    this.hubSubscriptions.push(
      this.hub.dayAdvanced$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId) return;
        this.daysPassed.set(event.daysPassed);
      })
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['todInput'] && this.todInput !== null) {
      this.loadFromTod(this.todInput);
    }
  }

  ngOnInit() {
    // tod data is supplied via todInput by the parent; no self-fetch needed
  }

  ngOnDestroy() {
    clearTimeout(this.shimmerTimer);
    clearTimeout(this.autoLockTimer);
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  // ── Slice labels ────────────────────────────────────────────────────────────

  labelStyle(slice: TimeOfDaySlice) {
    return {
      left:  `${slice.startPercent}%`,
      width: `${slice.endPercent - slice.startPercent}%`,
      color: slice.fontColor || undefined,
    };
  }

  cursorStyle() {
    return { left: `${this.cursorPercent()}%` };
  }

  // ── Cursor dragging (DM only) ─────────────────────────────────────────────

  toggleLock() {
    const wasLocked = this.isLocked();
    this.isLocked.update(v => !v);

    if (wasLocked) {
      // Just unlocked - start auto-lock timer
      this.resetAutoLockTimer();
    } else {
      // Just locked manually - clear timer
      clearTimeout(this.autoLockTimer);
    }
  }

  private resetAutoLockTimer() {
    clearTimeout(this.autoLockTimer);
    this.autoLockTimer = setTimeout(() => {
      this.isLocked.set(true);
    }, 8000);
  }

  onCursorMouseDown(event: MouseEvent) {
    if (this.isLocked() || (!this.isDm && !this.allowInteraction)) return;
    event.preventDefault();
    this.isDragging.set(true);
    this.dragStart = event.clientX;
    this.resetAutoLockTimer();
  }

  onCursorTouchStart(event: TouchEvent) {
    if (this.isLocked() || (!this.isDm && !this.allowInteraction)) return;
    event.preventDefault();
    this.isDragging.set(true);
    this.resetAutoLockTimer();
  }

  onCursorKeyDown(event: KeyboardEvent) {
    if (this.isLocked() || (!this.isDm && !this.allowInteraction)) return;
    const step = event.shiftKey ? 5 : 1;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = Math.min(100, this.cursorPercent() + step);
      this.cursorPercent.set(next);
      this.resetAutoLockTimer();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = Math.max(0, this.cursorPercent() - step);
      this.cursorPercent.set(next);
      this.resetAutoLockTimer();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.broadcastCursorPosition();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onDocMouseMove(event: MouseEvent) {
    if (!this.isDragging()) return;
    const bar = this.barTrackRef?.nativeElement;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct  = ((event.clientX - rect.left) / rect.width) * 100;
    this.cursorPercent.set(Math.max(0, Math.min(100, pct)));
    this.resetAutoLockTimer();
  }

  @HostListener('document:mouseup')
  onDocMouseUp() {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    if (!this.previewOnly) {
      this.broadcastCursorPosition();
    }
    this.triggerDayActionIfAtEdge();
    this.resetAutoLockTimer();
  }

  @HostListener('document:touchmove', ['$event'])
  onDocTouchMove(event: TouchEvent) {
    if (!this.isDragging()) return;
    const bar = this.barTrackRef?.nativeElement;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct  = ((event.touches[0].clientX - rect.left) / rect.width) * 100;
    this.cursorPercent.set(Math.max(0, Math.min(100, pct)));
    this.resetAutoLockTimer();
  }

  @HostListener('document:touchend')
  @HostListener('document:touchcancel')
  onDocTouchEnd() {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    if (!this.previewOnly) {
      this.broadcastCursorPosition();
    }
    this.triggerDayActionIfAtEdge();
    this.resetAutoLockTimer();
  }

  private triggerDayActionIfAtEdge() {
    if (this.isLocked() || (!this.isDm && !this.allowInteraction)) return;
    const pct = this.cursorPercent();
    if (pct === 100) {
      this.requestAdvanceDay();
    }
  }

  requestAdvanceDay() {
    if (this.isLocked() || (!this.isDm && !this.allowInteraction)) return;
    this.showAdvanceConfirm.set(true);
    this.resetAutoLockTimer();
  }

  cancelAdvanceDay() {
    this.showAdvanceConfirm.set(false);
    this.resetAutoLockTimer();
  }

  confirmAdvanceDay() {
    if (this.isLocked() || (!this.isDm && !this.allowInteraction)) return;
    this.showAdvanceConfirm.set(false);
    if (this.previewOnly) {
      this.daysPassed.update(d => d + 1);
      return;
    }
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/time-of-day/advance-day`,
      {}
    ).subscribe();
  }

  onAdvanceDay() {
    this.requestAdvanceDay();
  }

  onAdvanceDayTouch(event: TouchEvent) {
    event.preventDefault();
    this.onAdvanceDay();
  }

  private broadcastCursorPosition() {
    const pct = this.cursorPercent();
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/time-of-day/cursor`,
      { positionPercent: pct }
    ).subscribe();
  }

  // ── Cursor animation for players ─────────────────────────────────────────

  private animateCursorTo(targetPct: number) {
    if (this.reducedMotion) {
      this.cursorPercent.set(targetPct);
      return;
    }
    this.isShimmering.set(true);
    clearTimeout(this.shimmerTimer);
    this.shimmerTimer = setTimeout(() => this.isShimmering.set(false), 1400);
    // CSS transition on the cursor handles the smooth glide
    this.cursorPercent.set(targetPct);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private loadFromTod(tod: TimeOfDay) {
    this.tod.set(tod);
    this.cursorPercent.set(tod.cursorPositionPercent);
    this.daysPassed.set(tod.daysPassed ?? 0);
  }
}
