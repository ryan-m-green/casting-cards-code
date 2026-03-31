import {
  Component, Input, OnChanges, OnDestroy, SimpleChanges,
  ViewChild, ElementRef, signal, computed, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignCastRelationship } from '../../../shared/models/campaign.model';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { RelationshipWebModalComponent } from '../relationship-web-modal/relationship-web-modal.component';

interface RelationshipDraft {
  value: number;
  explanation: string;
  relationshipId?: string;
}

@Component({
  selector: 'app-cast-relationships-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CardFlipComponent, RelationshipWebModalComponent],
  templateUrl: './cast-relationships-tab.component.html',
  styleUrl: './cast-relationships-tab.component.scss',
})
export class CastRelationshipsTabComponent implements OnChanges, OnDestroy {
  @Input() campaignId: string | null = null;
  @Input() castInstances: CampaignCastInstance[] = [];

  @ViewChild('mainCard') mainCardRef!: ElementRef<HTMLElement>;

  private http = inject(HttpClient);
  private el   = inject(ElementRef);

  selectedIdx   = signal(0);
  relationships = signal<CampaignCastRelationship[]>([]);
  drafts        = signal<Map<string, RelationshipDraft>>(new Map());
  filterText    = signal('');
  showWebModal  = signal(false);
  isSwapping    = false;

  // ── Computed ────────────────────────────────────────────────────────────────

  currentCast = computed(() => this.castInstances[this.selectedIdx()] ?? null);

  otherCast = computed(() => {
    const current = this.currentCast();
    if (!current) return [];
    return this.castInstances.filter(n => n.instanceId !== current.instanceId);
  });

  filteredOtherCast = computed(() => {
    const filter = this.filterText().toLowerCase().trim();
    if (!filter) return this.otherCast();
    return this.otherCast().filter(n =>
      n.name.toLowerCase().includes(filter) ||
      n.race.toLowerCase().includes(filter) ||
      n.role.toLowerCase().includes(filter)
    );
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['campaignId'] || changes['castInstances']) {
      this.selectedIdx.set(0);
      this.loadRelationships();
    }
  }

  ngOnDestroy(): void {
    for (const timer of this.saveTimers.values()) clearTimeout(timer);
  }

  // ── Card stack cycling ────────────────────────────────────────────────────────

  cycleCast(): void {
    if (this.isSwapping || this.castInstances.length <= 1) return;
    this.isSwapping = true;

    const card = this.mainCardRef?.nativeElement;
    if (!card) { this.isSwapping = false; return; }

    card.style.transition = 'transform 0.27s cubic-bezier(0.4,0,1,1), opacity 0.22s ease-in';
    card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
    card.style.opacity    = '0';

    setTimeout(() => {
      this.selectedIdx.update(i => (i + 1) % this.castInstances.length);
      this.rebuildDrafts();

      card.style.transition = 'none';
      card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
      card.style.opacity    = '0';
      void card.offsetWidth;
      card.style.transition = 'transform 0.30s cubic-bezier(0,0,0.2,1), opacity 0.25s ease-out';
      card.style.transform  = 'translateX(0) scale(1) rotate(0deg)';
      card.style.opacity    = '1';

      setTimeout(() => { this.isSwapping = false; }, 300);
    }, 270);
  }

  // ── Slider / explanation handlers ───────────────────────────────────────────

  onSliderChange(targetInstanceId: string, event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    const map   = new Map(this.drafts());
    const draft = map.get(targetInstanceId) ?? { value: 0, explanation: '' };
    map.set(targetInstanceId, { ...draft, value });
    this.drafts.set(map);
    this.scheduleSave(targetInstanceId);
  }

  onSliderRelease(targetInstanceId: string, event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    if (value !== 0) return;
    const map   = new Map(this.drafts());
    const draft = map.get(targetInstanceId) ?? { value: 0, explanation: '' };
    map.set(targetInstanceId, { ...draft, explanation: '' });
    this.drafts.set(map);
    this.explanationTexts.set(targetInstanceId, '');
    this.setExplanationDom(targetInstanceId, '');
  }

  onExplanationInput(targetInstanceId: string, event: Event): void {
    const explanation = (event.target as HTMLInputElement).value;
    this.explanationTexts.set(targetInstanceId, explanation);
    this.scheduleSave(targetInstanceId);
  }

  // ── Helpers used in template ─────────────────────────────────────────────────

  getDraft(targetInstanceId: string): RelationshipDraft {
    return this.drafts().get(targetInstanceId) ?? { value: 0, explanation: '' };
  }

  getExplanationText(targetInstanceId: string): string {
    return this.explanationTexts.get(targetInstanceId) ?? '';
  }

  sliderLabel(value: number): string {
    if (value === 0) return 'Neutral';
    return value > 0 ? `Friendly (+${value})` : `Hostile (${value})`;
  }

  sliderClass(value: number): string {
    if (value > 0) return 'slider-friendly';
    if (value < 0) return 'slider-hostile';
    return 'slider-neutral';
  }

  raceIcon(race: string): string {
    const icons: Record<string, string> = {
      human:    '👤', elf: '🧝', dwarf: '⛏️', halfling: '🌱',
      gnome:    '🔧', 'half-orc': '⚔️', orc: '🪓', tiefling: '😈',
      dragonborn: '🐉', aasimar: '👼',
    };
    return icons[race.toLowerCase()] ?? '🎭';
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private loadRelationships(): void {
    const cid = this.campaignId;
    if (!cid) { this.relationships.set([]); this.drafts.set(new Map()); return; }

    this.http
      .get<CampaignCastRelationship[]>(`${environment.apiUrl}/api/campaigns/${cid}/cast-relationships`)
      .subscribe(rels => {
        this.relationships.set(rels);
        this.rebuildDrafts();
      });
  }

  private rebuildDrafts(): void {
    const current = this.currentCast();
    if (!current) { this.drafts.set(new Map()); this.explanationTexts.clear(); return; }

    const map = new Map<string, RelationshipDraft>();
    this.explanationTexts.clear();

    for (const cast of this.castInstances.filter(n => n.instanceId !== current.instanceId)) {
      const rel = this.relationships().find(r =>
        r.sourceCastInstanceId === current.instanceId &&
        r.targetCastInstanceId === cast.instanceId
      );
      map.set(cast.instanceId, {
        value:          rel?.value ?? 0,
        explanation:    rel?.explanation ?? '',
        relationshipId: rel?.id,
      });
      this.explanationTexts.set(cast.instanceId, rel?.explanation ?? '');
    }
    this.drafts.set(map);
    setTimeout(() => {
      this.explanationTexts.forEach((value, id) => this.setExplanationDom(id, value));
    }, 0);
  }

  // Local text map for explanation textareas — never pushed to drafts() signal during typing
  private explanationTexts = new Map<string, string>();

  private setExplanationDom(instanceId: string, value: string) {
    const el = (this.el.nativeElement as HTMLElement)
      .querySelector(`[data-expl-id="${instanceId}"]`) as HTMLTextAreaElement | null;
    if (el) el.value = value;
  }

  private saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private scheduleSave(targetInstanceId: string): void {
    const existing = this.saveTimers.get(targetInstanceId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.persistRelationship(targetInstanceId), 800);
    this.saveTimers.set(targetInstanceId, timer);
  }

  private persistRelationship(targetInstanceId: string): void {
    const cid     = this.campaignId;
    const current = this.currentCast();
    if (!cid || !current) return;

    const draft       = this.drafts().get(targetInstanceId);
    if (!draft) return;
    const explanation = this.explanationTexts.get(targetInstanceId) ?? '';

    const isNeutral = draft.value === 0 && !explanation.trim();

    if (draft.relationshipId) {
      if (isNeutral) {
        this.http
          .delete(`${environment.apiUrl}/api/campaigns/${cid}/cast-relationships/${draft.relationshipId}`)
          .subscribe(() => {
            const map = new Map(this.drafts());
            const d   = map.get(targetInstanceId);
            if (d) map.set(targetInstanceId, { ...d, relationshipId: undefined });
            this.drafts.set(map);
            this.relationships.update(rs =>
              rs.filter(r => r.id !== draft.relationshipId)
            );
          });
      } else {
        this.http
          .put(`${environment.apiUrl}/api/campaigns/${cid}/cast-relationships/${draft.relationshipId}`, {
            value:       draft.value,
            explanation: explanation.trim() || null,
          })
          .subscribe(() => {
            this.relationships.update(rs =>
              rs.map(r =>
                r.id === draft.relationshipId
                  ? { ...r, value: draft.value, explanation: explanation.trim() || null }
                  : r
              )
            );
          });
      }
    } else if (!isNeutral) {
      this.http
        .post<CampaignCastRelationship>(
          `${environment.apiUrl}/api/campaigns/${cid}/cast-relationships`,
          {
            sourceCastInstanceId: current.instanceId,
            targetCastInstanceId: targetInstanceId,
            value:               draft.value,
            explanation:         explanation.trim() || null,
          }
        )
        .subscribe(rel => {
          const map = new Map(this.drafts());
          const d   = map.get(targetInstanceId);
          if (d) map.set(targetInstanceId, { ...d, relationshipId: rel.id });
          this.drafts.set(map);
          this.relationships.update(rs => [...rs, rel]);
        });
    }
  }
}
