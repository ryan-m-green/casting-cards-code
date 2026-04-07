import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TimeOfDay, TimeOfDaySlice } from '../../../shared/models/time-of-day.model';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';

interface SliceDraft {
  id?: string;
  label: string;
  color: string;
  durationHours: number;
  dmNotes: string;
  playerNotes: string;
}

@Component({
  selector: 'app-time-of-day-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeOfDayBarComponent],
  templateUrl: './time-of-day-editor.component.html',
  styleUrl: './time-of-day-editor.component.scss',
})
export class TimeOfDayEditorComponent implements OnInit, OnDestroy {
  @Input() campaignId!: string;

  private http      = inject(HttpClient);
  private saveTimer?: ReturnType<typeof setTimeout>;

  dayLengthHours  = signal(24);
  slices          = signal<SliceDraft[]>([]);
  autoSaveStatus  = signal<'idle' | 'saving' | 'saved'>('idle');

  hasSlices = computed(() => this.slices().length > 0);

  sliceTotal = computed(() =>
    this.slices().reduce((s, d) => s + (d.durationHours || 0), 0)
  );

  isValid = computed(() => {
    const diff = Math.abs(this.sliceTotal() - this.dayLengthHours());
    return this.slices().length > 0
      && this.dayLengthHours() > 0
      && diff < 0.01;
  });

  /** Guard for showing the preview bar */
  previewTod = computed<TimeOfDay | null>(() => {
    const drafts = this.slices();
    const day    = this.dayLengthHours();
    if (!drafts.length || day <= 0) return null;
    const total = drafts.reduce((s, d) => s + (d.durationHours || 0), 0);
    if (total <= 0) return null;
    let running = 0;
    const slices: TimeOfDaySlice[] = drafts.map((d, i) => {
      const start = (running / total) * 100;
      running    += d.durationHours || 0;
      return {
        id: d.id ?? `preview-${i}`, label: d.label || `Slice ${i + 1}`,
        color: d.color || '#888888', durationHours: d.durationHours || 0,
        startPercent: start, endPercent: (running / total) * 100,
        dmNotes: d.dmNotes, playerNotes: d.playerNotes,
      };
    });
    return { id: '', campaignId: this.campaignId, dayLengthHours: day, cursorPositionPercent: 0, slices };
  });

  ngOnInit() {
    this.http.get<TimeOfDay>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/time-of-day`)
      .subscribe({
        next: tod => {
          this.dayLengthHours.set(tod.dayLengthHours);
          this.slices.set(tod.slices.map(s => ({
            id: s.id, label: s.label, color: s.color,
            durationHours: s.durationHours, dmNotes: s.dmNotes, playerNotes: s.playerNotes,
          })));
        },
        error: () => {
          this.slices.set([
            { label: 'Morning', color: '#f59e0b', durationHours: 6,  dmNotes: '', playerNotes: '' },
            { label: 'Midday',  color: '#3b82f6', durationHours: 12, dmNotes: '', playerNotes: '' },
            { label: 'Night',   color: '#1e1b4b', durationHours: 6,  dmNotes: '', playerNotes: '' },
          ]);
        },
      });
  }

  ngOnDestroy() {
    clearTimeout(this.saveTimer);
  }

  onDayLengthChange(value: number) {
    this.dayLengthHours.set(value);
    this.scheduleAutosave();
  }

  addSlice() {
    this.slices.update(s => [
      ...s,
      { label: '', color: '#6366f1', durationHours: 0, dmNotes: '', playerNotes: '' },
    ]);
    this.scheduleAutosave();
  }

  removeSlice(index: number) {
    this.slices.update(s => s.filter((_, i) => i !== index));
    this.scheduleAutosave();
  }

  moveUp(index: number) {
    if (index === 0) return;
    this.slices.update(s => {
      const copy = [...s];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
    this.scheduleAutosave();
  }

  moveDown(index: number) {
    if (index === this.slices().length - 1) return;
    this.slices.update(s => {
      const copy = [...s];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
    this.scheduleAutosave();
  }

  updateSliceField(index: number, field: keyof SliceDraft, value: string | number) {
    this.slices.update(s =>
      s.map((d, i) => i === index ? { ...d, [field]: value } : d)
    );
    this.scheduleAutosave();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private scheduleAutosave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.autosave(), 800);
  }

  private autosave() {
    if (!this.isValid()) return;
    this.autoSaveStatus.set('saving');
    this.http.put<TimeOfDay>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/time-of-day`,
      {
        dayLengthHours: this.dayLengthHours(),
        slices: this.slices().map(d => ({
          id: d.id, label: d.label, color: d.color,
          durationHours: d.durationHours, dmNotes: d.dmNotes, playerNotes: d.playerNotes,
        })),
      }
    ).subscribe({
      next: tod => {
        this.autoSaveStatus.set('saved');
        this.slices.set(tod.slices.map(s => ({
          id: s.id, label: s.label, color: s.color,
          durationHours: s.durationHours, dmNotes: s.dmNotes, playerNotes: s.playerNotes,
        })));
        setTimeout(() => this.autoSaveStatus.set('idle'), 2000);
      },
      error: () => this.autoSaveStatus.set('idle'),
    });
  }
}
