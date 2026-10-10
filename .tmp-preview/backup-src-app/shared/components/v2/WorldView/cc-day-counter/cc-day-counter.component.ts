import {
  Component,
  ChangeDetectionStrategy,
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
import { environment } from '../../../../../../environments/environment';
import { TimeOfDay, TimeOfDaySlice } from '../../../../models/time-of-day.model';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { CcLockButtonComponent } from '../../Shared/cc-lock-button/cc-lock-button.component';

@Component({
  selector: 'app-cc-day-counter',
  standalone: true,
  imports: [CommonModule, CcLockButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private hubSubscriptions: Subscription[] = [];

  private readonly mark = publishGridAreaMark('top-middle', 'day', {
    title: () => ['The Realm of', this.shellSvc.campaign()?.name ?? ''],
    icon: { path: '/hourglass_passing_time.svg', width: 32, height: 32 },
  });

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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['todInput'] && this.todInput !== null) {
      this.loadFromTod(this.todInput);
    }
  }

  ngOnInit() {
    this.gridLoad.report('top-middle', 'day');

    this.hubSubscriptions.push(
      this.hub.on('TimeCursorMoved', 'cc-day-counter', event => {
        if (!event || event.campaignId !== this.campaignId) return;
        if (this.isDragging()) return;
        this.animateCursorTo(event.positionPercent);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('TimeOfDayUpdated', 'cc-day-counter', updated => {
        if (!updated || updated.campaignId !== this.campaignId) return;
        this.loadFromTod(updated);
      })
    );

    this.hubSubscriptions.push(
      this.hub.on('DayAdvanced', 'cc-day-counter', event => {
        if (!event || event.campaignId !== this.campaignId) return;
        this.daysPassed.set(event.daysPassed);
      })
    );
  }

  ngOnDestroy() {
    clearTimeout(this.shimmerTimer);
    clearTimeout(this.autoLockTimer);
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

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

  toggleLock() {
    const wasLocked = this.isLocked();
    this.isLocked.update(v => !v);

    if (wasLocked) {
      this.resetAutoLockTimer();
    } else {
      clearTimeout(this.autoLockTimer);
      this.showAdvanceConfirm.set(false);
    }
  }

  private resetAutoLockTimer() {
    clearTimeout(this.autoLockTimer);
    this.autoLockTimer = setTimeout(() => {
      this.isLocked.set(true);
      this.showAdvanceConfirm.set(false);
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

  private animateCursorTo(targetPct: number) {
    if (this.reducedMotion) {
      this.cursorPercent.set(targetPct);
      return;
    }
    this.isShimmering.set(true);
    clearTimeout(this.shimmerTimer);
    this.shimmerTimer = setTimeout(() => this.isShimmering.set(false), 1400);
    this.cursorPercent.set(targetPct);
  }

  private loadFromTod(tod: TimeOfDay) {
    this.tod.set(tod);
    this.cursorPercent.set(tod.cursorPositionPercent);
    this.daysPassed.set(tod.daysPassed ?? 0);
  }
}
