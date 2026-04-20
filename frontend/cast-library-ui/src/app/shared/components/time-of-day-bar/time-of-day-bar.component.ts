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
  effect,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TimeOfDay, TimeOfDaySlice } from '../../models/time-of-day.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-time-of-day-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './time-of-day-bar.component.html',
  styleUrl: './time-of-day-bar.component.scss',
})
export class TimeOfDayBarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campaignId!: string;
  @Input() isDm = false;
  @Input() panelTheme: 'light' | 'dark' = 'light';
  @Input() todInput: TimeOfDay | null = null;

  @ViewChild('barTrack') barTrackRef!: ElementRef<HTMLElement>;

  private http = inject(HttpClient);
  private hub  = inject(CampaignHubService);

  tod             = signal<TimeOfDay | null>(null);
  cursorPercent   = signal(0);
  daysPassed      = signal(0);
  isDragging      = signal(false);
  isShimmering    = signal(false);
  activeSliceId   = signal<string | null>(null);
  dmNotesEdit     = signal<Record<string, string>>({});
  playerNotesEdit = signal<Record<string, string>>({});
  saving          = signal<string | null>(null);

  private shimmerTimer?: ReturnType<typeof setTimeout>;
  private playerNoteTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  private dmNoteTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  private dragStart = 0;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  activeSlice = computed(() => {
    const id  = this.activeSliceId();
    const tod = this.tod();
    return tod?.slices.find(s => s.id === id) ?? null;
  });

  constructor() {
    // React to DM moving cursor (player view receives shimmering + glide)
    effect(() => {
      const event = this.hub.timeCursorMoved();
      if (!event || event.campaignId !== this.campaignId) return;
      this.animateCursorTo(event.positionPercent);
    });

    // React to player notes updated by another user
    effect(() => {
      const event = this.hub.playerNotesUpdated();
      if (!event || event.campaignId !== this.campaignId) return;
      this.playerNotesEdit.update(m => ({ ...m, [event.sliceId]: event.playerNotes }));
      this.tod.update(tod => {
        if (!tod) return tod;
        return {
          ...tod,
          slices: tod.slices.map(s =>
            s.id === event.sliceId ? { ...s, playerNotes: event.playerNotes } : s
          ),
        };
      });
    });

    // React to DM notes updated by the DM (syncs to all connected clients)
    effect(() => {
      const event = this.hub.dmNotesUpdated();
      if (!event || event.campaignId !== this.campaignId) return;
      this.dmNotesEdit.update(m => ({ ...m, [event.sliceId]: event.dmNotes }));
      this.tod.update(tod => {
        if (!tod) return tod;
        return {
          ...tod,
          slices: tod.slices.map(s =>
            s.id === event.sliceId ? { ...s, dmNotes: event.dmNotes } : s
          ),
        };
      });
    });

    // React to full time-of-day config replaced
    effect(() => {
      const updated = this.hub.timeOfDayUpdated();
      if (!updated || updated.campaignId !== this.campaignId) return;
      this.loadFromTod(updated);
    });

    // React to day advanced (all users)
    effect(() => {
      const event = this.hub.dayAdvanced();
      if (!event || event.campaignId !== this.campaignId) return;
      this.daysPassed.set(event.daysPassed);
    });
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
    Object.values(this.playerNoteTimers).forEach(t => clearTimeout(t));
    Object.values(this.dmNoteTimers).forEach(t => clearTimeout(t));
  }

  // ── Slice rendering helpers ───────────────────────────────────────────────

  sliceStyle(slice: TimeOfDaySlice, index: number) {
    const slices    = this.tod()?.slices ?? [];
    const widthPct  = (slice.endPercent - slice.startPercent);
    const nextColor = slices[(index + 1) % slices.length]?.color ?? slice.color;
    const isLast    = index === slices.length - 1;
    const gradient  = isLast
      ? `linear-gradient(to right, ${slice.color}, ${slice.color} calc(100% - 16px), ${nextColor} 100%)`
      : `linear-gradient(to right, ${slice.color}, ${nextColor})`;
    return {
      'flex-basis':       `${widthPct}%`,
      'background-image': gradient,
    };
  }

  cursorStyle() {
    return { left: `${this.cursorPercent()}%` };
  }

  // ── Cursor dragging (DM only) ─────────────────────────────────────────────

  onCursorMouseDown(event: MouseEvent) {
    if (!this.isDm) return;
    event.preventDefault();
    this.isDragging.set(true);
    this.dragStart = event.clientX;
  }

  onCursorTouchStart(event: TouchEvent) {
    if (!this.isDm) return;
    event.preventDefault();
    this.isDragging.set(true);
  }

  onCursorKeyDown(event: KeyboardEvent) {
    if (!this.isDm) return;
    const step = event.shiftKey ? 5 : 1;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = Math.min(100, this.cursorPercent() + step);
      this.cursorPercent.set(next);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = Math.max(0, this.cursorPercent() - step);
      this.cursorPercent.set(next);
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
  }

  @HostListener('document:mouseup')
  onDocMouseUp() {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    this.broadcastCursorPosition();
  }

  @HostListener('document:touchmove', ['$event'])
  onDocTouchMove(event: TouchEvent) {
    if (!this.isDragging()) return;
    const bar = this.barTrackRef?.nativeElement;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct  = ((event.touches[0].clientX - rect.left) / rect.width) * 100;
    this.cursorPercent.set(Math.max(0, Math.min(100, pct)));
  }

  @HostListener('document:touchend')
  @HostListener('document:touchcancel')
  onDocTouchEnd() {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    this.broadcastCursorPosition();
  }

  onRewindDay() {
    if (!this.isDm || this.daysPassed() === 0) return;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/time-of-day/rewind-day`,
      {}
    ).subscribe();
  }

  onAdvanceDay() {
    if (!this.isDm) return;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/time-of-day/advance-day`,
      {}
    ).subscribe();
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

  // ── Notes panel ──────────────────────────────────────────────────────────

  toggleSlicePanel(sliceId: string) {
    const current = this.activeSliceId();
    if (current === sliceId) {
      this.activeSliceId.set(null);
    } else {
      this.activeSliceId.set(sliceId);
    }
  }

  closePanel() {
    this.activeSliceId.set(null);
  }

  dmNotesFor(sliceId: string) {
    return this.dmNotesEdit()[sliceId]
      ?? (this.tod()?.slices.find(s => s.id === sliceId)?.dmNotes ?? '');
  }

  playerNotesFor(sliceId: string) {
    return this.playerNotesEdit()[sliceId]
      ?? (this.tod()?.slices.find(s => s.id === sliceId)?.playerNotes ?? '');
  }

  onDmNotesInput(sliceId: string, value: string) {
    this.dmNotesEdit.update(m => ({ ...m, [sliceId]: value }));
    clearTimeout(this.dmNoteTimers[sliceId]);
    this.dmNoteTimers[sliceId] = setTimeout(() => this.saveDmNotes(sliceId), 600);
  }

  onDmNotesBlur(sliceId: string) {
    clearTimeout(this.dmNoteTimers[sliceId]);
    this.saveDmNotes(sliceId);
  }

  private saveDmNotes(sliceId: string) {
    const notes = this.dmNotesEdit()[sliceId];
    if (notes === undefined) return;
    this.saving.set(sliceId);
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/time-of-day/slices/${sliceId}/dm-notes`,
      { dmNotes: notes }
    ).subscribe({
      next: () => {
        this.saving.set(null);
        this.tod.update(tod => {
          if (!tod) return tod;
          return {
            ...tod,
            slices: tod.slices.map(s =>
              s.id === sliceId ? { ...s, dmNotes: notes } : s
            ),
          };
        });
      },
      error: () => this.saving.set(null),
    });
  }

  onPlayerNotesInput(sliceId: string, value: string) {
    this.playerNotesEdit.update(m => ({ ...m, [sliceId]: value }));
    clearTimeout(this.playerNoteTimers[sliceId]);
    this.playerNoteTimers[sliceId] = setTimeout(() => this.savePlayerNotes(sliceId), 600);
  }

  onPlayerNotesBlur(sliceId: string) {
    clearTimeout(this.playerNoteTimers[sliceId]);
    this.savePlayerNotes(sliceId);
  }

  private savePlayerNotes(sliceId: string) {
    const notes = this.playerNotesEdit()[sliceId];
    if (notes === undefined) return;
    this.saving.set(sliceId);
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/time-of-day/slices/${sliceId}/player-notes`,
      { playerNotes: notes }
    ).subscribe({
      next:  () => {
        this.saving.set(null);
        this.tod.update(tod => {
          if (!tod) return tod;
          return {
            ...tod,
            slices: tod.slices.map(s =>
              s.id === sliceId ? { ...s, playerNotes: notes } : s
            ),
          };
        });
      },
      error: () => this.saving.set(null),
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private loadFromTod(tod: TimeOfDay) {
    this.tod.set(tod);
    this.cursorPercent.set(tod.cursorPositionPercent);
    this.daysPassed.set(tod.daysPassed ?? 0);
    const playerMap: Record<string, string> = {};
    const dmMap: Record<string, string> = {};
    tod.slices.forEach(s => {
      playerMap[s.id] = s.playerNotes;
      dmMap[s.id]     = s.dmNotes;
    });
    this.playerNotesEdit.set(playerMap);
    this.dmNotesEdit.set(dmMap);
  }
}
