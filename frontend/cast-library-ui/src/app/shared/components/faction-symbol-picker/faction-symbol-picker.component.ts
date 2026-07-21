import {
  Component, Input, Output, EventEmitter,
  signal, computed, HostListener, ElementRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignFactionInstance } from '../../models/faction.model';

export type FactionSymbolPickerTargetType = 'sublocation' | 'cast';

export interface FactionSymbolAssignment {
  factionInstanceId: string;
  symbolPath: string;
}

@Component({
  selector: 'app-faction-symbol-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faction-symbol-picker.component.html',
  styleUrl: './faction-symbol-picker.component.scss',
})
export class FactionSymbolPickerComponent {
  @Input({ required: true }) campaignId!: string;
  @Input({ required: true }) targetDropInstanceId!: string;
  @Input({ required: true }) targetType!: FactionSymbolPickerTargetType;
  @Input({ required: true }) factions!: CampaignFactionInstance[];

  /** Current assigned faction instance ids on the target card */
  @Input() assignedFactionIds: string[] = [];

  @Output() assigned = new EventEmitter<FactionSymbolAssignment[]>();

  private http = inject(HttpClient);
  private el   = inject(ElementRef);

  panelOpen = signal(false);

  /** Local optimistic state so the UI responds instantly */
  private localAssigned = signal<string[] | null>(null);

  currentAssigned = computed<string[]>(() =>
    this.localAssigned() ?? this.assignedFactionIds
  );

  isAssigned(faction: CampaignFactionInstance): boolean {
    return this.currentAssigned().includes(faction.factionInstanceId);
  }

  isMaxReached = computed<boolean>(() => {
    if (this.targetType === 'sublocation') return this.currentAssigned().length >= 1;
    if (this.targetType === 'cast') return this.currentAssigned().length >= 4;
    return false;
  });

  get panelLabel(): string {
    return this.targetType === 'sublocation'
      ? 'Select a faction symbol to assign'
      : 'Select up to 4 faction symbols to assign';
  }

  togglePanel(): void {
    this.panelOpen.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.panelOpen.set(false);
    }
  }

  onFactionClick(faction: CampaignFactionInstance): void {
    if (!faction.symbolPath) return;
    const current = [...this.currentAssigned()];
    const idx = current.indexOf(faction.factionInstanceId);

    if (this.targetType === 'sublocation') {
      // Only 1 allowed — toggle
      if (idx !== -1) {
        this.applyAndSave([]);
      } else {
        this.applyAndSave([faction.factionInstanceId]);
      }
    } else {
      // Cast — up to 4
      if (idx !== -1) {
        current.splice(idx, 1);
      } else if (current.length < 4) {
        current.push(faction.factionInstanceId);
      }
      this.applyAndSave(current);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private applyAndSave(ids: string[]): void {
    this.localAssigned.set(ids);

    const symbols = this.buildSymbols(ids);
    this.assigned.emit(symbols);
    this.save(symbols);
  }

  private buildSymbols(ids: string[]): FactionSymbolAssignment[] {
    return ids
      .map(id => {
        const f = this.factions.find(f => f.factionInstanceId === id);
        return f?.symbolPath ? { factionInstanceId: id, symbolPath: f.symbolPath } : null;
      })
      .filter((s): s is FactionSymbolAssignment => s !== null);
  }

  private save(symbols: FactionSymbolAssignment[]): void {
    const base = `${environment.apiUrl}/api/campaigns/${this.campaignId}`;

    if (this.targetType === 'sublocation') {
      const body = symbols.length
        ? { factionInstanceId: symbols[0].factionInstanceId, symbolPath: symbols[0].symbolPath }
        : { factionInstanceId: null, symbolPath: null };

      this.http.patch(`${base}/sublocations/${this.targetDropInstanceId}/player-faction-symbol`, body)
        .subscribe(() => this.localAssigned.set(null));
    } else {
      const body = { factionSymbols: symbols.map(s => ({ factionInstanceId: s.factionInstanceId, symbolPath: s.symbolPath })) };
      this.http.patch(`${base}/casts/${this.targetDropInstanceId}/player-faction-symbols`, body)
        .subscribe(() => this.localAssigned.set(null));
    }
  }
}
