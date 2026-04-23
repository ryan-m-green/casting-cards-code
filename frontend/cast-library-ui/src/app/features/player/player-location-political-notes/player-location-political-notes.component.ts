import {
  Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges,
  signal, computed, inject, input, ElementRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../../shared/components/campaign-dropdown/campaign-dropdown.component';
import { environment } from '../../../../environments/environment';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import {
  LocationPoliticalNotes, LocationFaction, LocationFactionRelationship, LocationNpcRole,
  CampaignCastRelationship, CampaignCastPlayerNotes,
} from '../../../shared/models/campaign.model';

// Type alias for backwards compatibility
type CityPoliticalNotes = LocationPoliticalNotes;

export type PoliticalTab = 'notes' | 'web' | 'map' | 'social';

export const FACTION_TYPES  = ['Official', 'Guild', 'Church', 'Criminal', 'Shadow', 'Military'] as const;
export const REL_TYPES      = ['Allied', 'Rival', 'Enemy', 'Neutral', 'Blackmail', 'Patronage'] as const;
export const NPC_ROLES      = ['Ruler', 'Member', 'Agent', 'Target'] as const;
export const NPC_MOTIVATIONS = ['Ambition', 'Fear', 'Loyalty', 'Greed', 'Survival'] as const;

const EMPTY_NOTES = (): LocationPoliticalNotes => ({
  id: '', campaignId: '', locationInstanceId: '',
  generalNotes: '', factions: [], relationships: [], npcRoles: [], updatedAt: '',
});

// ── Social Compass constants ───────────────────────────────────────────────

const ALIGNMENT_ANGLES: Record<string, number> = {
  'Neutral Good':    0,
  'Chaotic Good':   45,
  'Chaotic Neutral': 90,
  'Chaotic Evil':  135,
  'Neutral Evil':  180,
  'Lawful Evil':   225,
  'Lawful Neutral': 270,
  'Lawful Good':   315,
};

const COMPASS_CX            = 280;
const COMPASS_CY            = 280;
const COMPASS_OUTER_R       = 224;
const COMPASS_TN_INNER_R    =  22;
const COMPASS_TN_OUTER_R    =  38;
const RING_HOSTILE_BOUNDARY = 162;
const RING_DEVOTED_BOUNDARY  = 100;
const SLICE_BOUNDARIES       = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

interface CompassNode {
  castInstanceId: string;
  name: string;
  firstName: string;
  lastName: string;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  isUnassessed: boolean;
  alignmentCode: string;
}

interface CompassEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  edgeClass: string;
}

interface SliceLine {
  x1: number; y1: number;
  x2: number; y2: number;
}

interface AlignmentIcon {
  label: string;
  cx: number;
  cy: number;
}

@Component({
  selector: 'app-player-location-political-notes',
  standalone: true,
  imports: [CommonModule, CampaignDropdownComponent],
  templateUrl: './player-location-political-notes.component.html',
  styleUrl: './player-location-political-notes.component.scss',
})
export class PlayerLocationPoliticalNotesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campaignId!: string;
  @Input() locationInstanceId!: string;
  allCasts      = input<CampaignCastInstance[]>([]);
  relationships = input<CampaignCastRelationship[]>([]);
  spineColor    = input('#9ab0b8');

  private http  = inject(HttpClient);
  private elRef = inject(ElementRef);

  readonly factionTypes = FACTION_TYPES;
  readonly relTypes     = REL_TYPES;
  readonly npcRoles     = NPC_ROLES;
  readonly motivations  = NPC_MOTIVATIONS;

  readonly factionTypeOptions: CampaignDropdownOption[] = FACTION_TYPES.map(t => ({ value: t, label: t }));
  readonly relTypeOptions: CampaignDropdownOption[]     = REL_TYPES.map(t => ({ value: t, label: t }));
  readonly npcRoleOptions: CampaignDropdownOption[]     = NPC_ROLES.map(r => ({ value: r, label: r }));
  readonly motivationOptions: CampaignDropdownOption[]  = NPC_MOTIVATIONS.map(m => ({ value: m, label: m }));

  activeTab         = signal<PoliticalTab>('notes');
  notes             = signal<LocationPoliticalNotes>(EMPTY_NOTES());
  saving            = signal(false);
  locationCastNotes = signal<CampaignCastPlayerNotes[]>([]);

  // ── Cast card popout ──────────────────────────────────────────────────────
  selectedCast      = signal<CampaignCastInstance | null>(null);
  overlayState      = signal<'closed' | 'opening' | 'open' | 'closing'>('closed');
  sparkOriginX      = signal(0);
  sparkOriginY      = signal(0);
  readonly sparkAngles = Array.from({ length: 16 }, (_, i) => i * 22.5);
  private overlayTimer: ReturnType<typeof setTimeout> | null = null;

  selectedCastNotes = computed(() => {
    const cast = this.selectedCast();
    if (!cast) return null;
    return this.locationCastNotes().find((n: any) => n.castInstanceId === cast.instanceId) ?? null;
  });

  // Local plain values — never bound to signals during typing,
  // matching the pattern in player-cast-notes (wantText) and
  // cast-relationships-tab (explanationTexts Map).
  generalText = '';
  private factionNameInputs = new Map<string, string>();
  private relNotesInputs    = new Map<string, string>();

  // Type alias for backwards compatibility
  private get cityCastNotes() {
    return this.locationCastNotes;
  }

  private set cityCastNotes(value: any) {
    this.locationCastNotes.set(value());
  }

  factionOptions       = computed(() => this.notes().factions.map(f => ({ value: f.id, label: f.name || '—' })));
  availableCastOptions = computed((): CampaignDropdownOption[] => [
    { value: '', label: 'Add a cast member…' },
    ...this.availableCasts().map(c => ({ value: c.instanceId, label: c.name })),
  ]);

  private saveDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Compass readonlys ─────────────────────────────────────────────────────

  readonly compassSliceLines: SliceLine[] = SLICE_BOUNDARIES.map(angle => {
    const rad = (angle * Math.PI) / 180;
    return {
      x1: COMPASS_CX + COMPASS_TN_OUTER_R * Math.sin(rad),
      y1: COMPASS_CY - COMPASS_TN_OUTER_R * Math.cos(rad),
      x2: COMPASS_CX + COMPASS_OUTER_R    * Math.sin(rad),
      y2: COMPASS_CY - COMPASS_OUTER_R    * Math.cos(rad),
    };
  });

  // Expose as public for template use
  readonly compassCx = COMPASS_CX;
  readonly compassCy = COMPASS_CY;
  readonly compassOuterR = COMPASS_OUTER_R;
  readonly compassTnInnerR = COMPASS_TN_INNER_R;
  readonly compassTnOuterR = COMPASS_TN_OUTER_R;
  readonly ringHostileBoundary = RING_HOSTILE_BOUNDARY;
  readonly ringDevotedBoundary = RING_DEVOTED_BOUNDARY;

  // ── Computed ──────────────────────────────────────────────────────────────

  availableCasts = computed(() => {
    const assigned = new Set(this.notes().npcRoles.map((n: any) => n.castInstanceId));
    return this.allCasts().filter((c: any) => !assigned.has(c.instanceId));
  });

  webNodes = computed(() =>
    this.notes().factions.map((f: any, i: any) => ({
      faction: f,
      cx: this.nodeX(i, this.notes().factions.length),
      cy: this.nodeY(i, this.notes().factions.length),
      r:  8 + f.influence * 1.4,
    }))
  );

  webEdges = computed(() => {
    const nodes = this.webNodes();
    return this.notes().relationships.map((r: any) => {
      const a = nodes.find((n: any) => n.faction.id === r.factionAId);
      const b = nodes.find((n: any) => n.faction.id === r.factionBId);
      if (!a || !b) return null;
      return { rel: r, x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy };
    }).filter((e: any) => e !== null);
  });

  compassNodes = computed((): CompassNode[] => {
    const notesMap  = new Map(this.cityCastNotes().map((n: any) => [n.castInstanceId, n]));
    const total     = this.allCasts().length;
    if (total === 0) return [];

    const startAngle = -Math.PI / 2;                  // 12 o'clock
    const step       = (2 * Math.PI) / total;

    return this.allCasts().map((cast: any, i: any) => {
      const note         = notesMap.get(cast.instanceId) as any;
      const isUnassessed = !note?.alignment;
      const alignment    = note?.alignment  || 'Lawful Neutral';
      const perception   = note?.perception ?? 0;
      const rating       = note?.rating     ?? 0;

      const angle   = startAngle + step * i;
      const radialR = this.perceptionRadius(perception);
      const cx      = COMPASS_CX + radialR * Math.sin(angle);
      const cy      = COMPASS_CY - radialR * Math.cos(angle);

      const spaceIdx = cast.name.indexOf(' ');
      const firstName = spaceIdx === -1 ? cast.name : cast.name.slice(0, spaceIdx);
      const lastName  = spaceIdx === -1 ? ''         : cast.name.slice(spaceIdx + 1);

      return {
        castInstanceId: cast.instanceId,
        name:           cast.name,
        firstName,
        lastName,
        cx, cy,
        r:             this.nodeRadius(rating),
        fill:          this.perceptionFill(perception),
        isUnassessed,
        alignmentCode: this.alignmentAbbr(alignment, isUnassessed),
      };
    });
  });

  compassEdges = computed((): CompassEdge[] => {
    const notes = this.locationCastNotes();
    const nodes = this.compassNodes();
    const rels  = this.relationships();
    const edges: CompassEdge[] = [];
    const seen  = new Set<string>();

    for (const note of notes) {
      const srcNode = nodes.find(n => n.castInstanceId === note.castInstanceId);
      if (!srcNode) continue;
      for (const connId of note.connections) {
        const pairKey = [note.castInstanceId, connId].sort().join('|');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        const tgtNode = nodes.find(n => n.castInstanceId === connId);
        if (!tgtNode) continue;
        const rel = rels.find(r =>
          (r.sourceCastInstanceId === note.castInstanceId && r.targetCastInstanceId === connId) ||
          (r.sourceCastInstanceId === connId && r.targetCastInstanceId === note.castInstanceId)
        );
        edges.push({
          id:        pairKey,
          x1:        srcNode.cx,
          y1:        srcNode.cy,
          x2:        tgtNode.cx,
          y2:        tgtNode.cy,
          edgeClass: this.relEdgeClass(rel?.value ?? 0),
        });
      }
    }

    return edges;
  });

  unassessedCount = computed(() => {
    const notesMap = new Map(this.locationCastNotes().map(n => [n.castInstanceId, n]));
    return this.allCasts().filter(c => !notesMap.get(c.instanceId)?.alignment).length;
  });

  factionName = (id: string) =>
    this.notes().factions.find(f => f.id === id)?.name ?? '—';

  castName = (id: string) =>
    this.allCasts().find(c => c.instanceId === id)?.name ?? '—';

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    if (this.overlayTimer) clearTimeout(this.overlayTimer);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['locationInstanceId'] && !changes['locationInstanceId'].firstChange) {
      this.locationCastNotes.set([]);
      this.load();
    }
  }

  // ── Load / Save ───────────────────────────────────────────────────────────

  private load() {
    this.http.get<LocationPoliticalNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/location-political-notes/${this.locationInstanceId}`
    ).subscribe(n => {
      const notes = n ?? EMPTY_NOTES();
      this.notes.set(notes);
      this.generalText = notes.generalNotes;
      this.factionNameInputs.clear();
      this.relNotesInputs.clear();
      // Set text input values imperatively — no [value] binding on these inputs,
      // matching the cast-notes wantTextarea pattern and the relationships explanationTexts pattern.
      setTimeout(() => {
        for (const f of notes.factions)      this.setFactionNameDom(f.id, f.name);
        for (const r of notes.relationships) this.setRelNotesDom(r.id, r.notes);
      }, 0);
    });
  }

  private scheduleSave() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => this.save(), 800);
  }

  private save() {
    this.saving.set(true);
    const n = this.notes();
    this.http.put<LocationPoliticalNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/location-political-notes/${this.locationInstanceId}`,
      {
        generalNotes: this.generalText,
        factions: n.factions.map((f: any) => ({
          ...f,
          name: this.factionNameInputs.has(f.id) ? this.factionNameInputs.get(f.id)! : f.name,
        })),
        relationships: n.relationships.map((r: any) => ({
          ...r,
          notes: this.relNotesInputs.has(r.id) ? this.relNotesInputs.get(r.id)! : r.notes,
        })),
        npcRoles: n.npcRoles,
      }
    ).subscribe({
      next: () => {
        this.factionNameInputs.clear();
        this.relNotesInputs.clear();
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  private setFactionNameDom(factionId: string, value: string) {
    const el = (this.elRef.nativeElement as HTMLElement)
      .querySelector(`[data-faction-name-id="${factionId}"]`) as HTMLInputElement | null;
    if (el) el.value = value;
  }

  private setRelNotesDom(relId: string, value: string) {
    const el = (this.elRef.nativeElement as HTMLElement)
      .querySelector(`[data-rel-notes-id="${relId}"]`) as HTMLInputElement | null;
    if (el) el.value = value;
  }

  // ── Tab ──────────────────────────────────────────────────────────────────

  setTab(tab: PoliticalTab) {
    this.activeTab.set(tab);
    if (tab === 'notes') {
      setTimeout(() => {
        const n = this.notes();
        for (const f of n.factions)
          this.setFactionNameDom(f.id, this.factionNameInputs.get(f.id) ?? f.name);
        for (const r of n.relationships)
          this.setRelNotesDom(r.id, this.relNotesInputs.get(r.id) ?? r.notes);
      }, 0);
    }
    if (tab === 'social') {
      this.loadLocationCastNotes();
    }
  }

  // ── General notes ────────────────────────────────────────────────────────

  onGeneralInput(value: string) {
    this.generalText = value;
    this.scheduleSave();
  }

  // ── Factions ─────────────────────────────────────────────────────────────

  addFaction() {
    this.notes.update(n => ({
      ...n,
      factions: [...n.factions, {
        id: crypto.randomUUID(), name: '', type: 'Official',
        influence: 0, isHidden: false, sortOrder: n.factions.length,
      }],
    }));
  }

  onFactionNameInput(factionId: string, value: string) {
    this.factionNameInputs.set(factionId, value);
    this.scheduleSave();
  }

  setFactionType(factionId: string, type: string) {
    this.notes.update(n => ({
      ...n, factions: n.factions.map((f: any) => f.id === factionId ? { ...f, type } : f),
    }));
    this.scheduleSave();
  }

  setFactionHidden(factionId: string, isHidden: boolean) {
    this.notes.update(n => ({
      ...n, factions: n.factions.map((f: any) => f.id === factionId ? { ...f, isHidden } : f),
    }));
    this.scheduleSave();
  }

  onInfluenceInput(factionId: string, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.notes.update(n => ({
      ...n, factions: n.factions.map(f => f.id === factionId ? { ...f, influence: value } : f),
    }));
    // visual update only — no save until release, matching cast-relationships onSliderChange
  }

  onInfluenceRelease(factionId: string, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.notes.update(n => ({
      ...n, factions: n.factions.map(f => f.id === factionId ? { ...f, influence: value } : f),
    }));
    this.save();
  }

  influenceSliderClass(value: number): string {
    if (value <= 3) return 'slider-low';
    if (value <= 6) return 'slider-mid';
    return 'slider-high';
  }

  removeFaction(id: string) {
    this.factionNameInputs.delete(id);
    this.notes.update(n => ({
      ...n,
      factions:      n.factions.filter((f: any) => f.id !== id),
      relationships: n.relationships.filter((r: any) => r.factionAId !== id && r.factionBId !== id),
      npcRoles:      n.npcRoles.filter((nr: any) => nr.factionId !== id),
    }));
    this.save();
  }

  // ── Relationships ─────────────────────────────────────────────────────────

  addRelationship() {
    const factions = this.notes().factions;
    if (factions.length < 2) return;
    this.notes.update(n => ({
      ...n,
      relationships: [...n.relationships, {
        id: crypto.randomUUID(),
        factionAId: factions[0].id, factionBId: factions[1].id,
        relationshipType: 'Rival', strength: 0, notes: '',
      }],
    }));
    this.scheduleSave();
  }

  setRelFactionA(relId: string, factionId: string) {
    this.notes.update(n => ({
      ...n, relationships: n.relationships.map((r: any) => r.id === relId ? { ...r, factionAId: factionId } : r),
    }));
    this.scheduleSave();
  }

  setRelFactionB(relId: string, factionId: string) {
    this.notes.update(n => ({
      ...n, relationships: n.relationships.map((r: any) => r.id === relId ? { ...r, factionBId: factionId } : r),
    }));
    this.scheduleSave();
  }

  setRelType(relId: string, type: string) {
    this.notes.update(n => ({
      ...n, relationships: n.relationships.map((r: any) => r.id === relId ? { ...r, relationshipType: type } : r),
    }));
    this.scheduleSave();
  }

  onStrengthInput(relId: string, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.notes.update(n => ({
      ...n, relationships: n.relationships.map(r => r.id === relId ? { ...r, strength: value } : r),
    }));
  }

  onStrengthRelease(relId: string, event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.notes.update(n => ({
      ...n, relationships: n.relationships.map(r => r.id === relId ? { ...r, strength: value } : r),
    }));
    this.save();
  }

  strengthSliderClass(value: number): string {
    if (value <= 1) return 'slider-low';
    if (value <= 3) return 'slider-mid';
    return 'slider-high';
  }

  onRelNotesInput(relId: string, value: string) {
    this.relNotesInputs.set(relId, value);
    this.scheduleSave();
  }

  removeRelationship(id: string) {
    this.relNotesInputs.delete(id);
    this.notes.update(n => ({
      ...n, relationships: n.relationships.filter(r => r.id !== id),
    }));
    this.save();
  }

  // ── NPC Roles ─────────────────────────────────────────────────────────────

  addNpcRole(castInstanceId: string) {
    if (!castInstanceId || !this.notes().factions.length) return;
    this.notes.update(n => ({
      ...n,
      npcRoles: [...n.npcRoles, {
        id: crypto.randomUUID(), castInstanceId,
        factionId: n.factions[0].id, role: 'Member', motivation: 'Loyalty',
      }],
    }));
    this.save();
  }

  setNpcFaction(roleId: string, factionId: string) {
    this.notes.update(n => ({
      ...n, npcRoles: n.npcRoles.map(nr => nr.id === roleId ? { ...nr, factionId } : nr),
    }));
    this.scheduleSave();
  }

  setNpcRole(roleId: string, role: string) {
    this.notes.update(n => ({
      ...n, npcRoles: n.npcRoles.map(nr => nr.id === roleId ? { ...nr, role } : nr),
    }));
    this.scheduleSave();
  }

  setNpcMotivation(roleId: string, motivation: string) {
    this.notes.update(n => ({
      ...n, npcRoles: n.npcRoles.map(nr => nr.id === roleId ? { ...nr, motivation } : nr),
    }));
    this.scheduleSave();
  }

  removeNpcRole(id: string) {
    this.notes.update(n => ({ ...n, npcRoles: n.npcRoles.filter(nr => nr.id !== id) }));
    this.save();
  }

  // ── SVG / Map helpers ─────────────────────────────────────────────────────

  edgeClass(type: string): string {
    const map: Record<string, string> = {
      Allied: 'edge--allied', Rival: 'edge--rival', Enemy: 'edge--enemy',
      Neutral: 'edge--neutral', Blackmail: 'edge--blackmail', Patronage: 'edge--patronage',
    };
    return map[type] ?? '';
  }

  announceDistrict(faction: LocationFaction) {
    const live = document.getElementById('district-live');
    if (!live) return;
    const msg = `${faction.name}. Controlled by ${faction.name} (${faction.type}). Influence: ${faction.influence} out of 10.${faction.isHidden ? ' Unconfirmed.' : ''}`;
    live.textContent = '';
    setTimeout(() => { live.textContent = msg; }, 10);
  }

  districtPattern(factionId: string | null): string {
    if (!factionId) return 'pattern-none';
    const idx = this.notes().factions.findIndex(f => f.id === factionId);
    const patterns = ['pattern-diagonal', 'pattern-dots', 'pattern-lines', 'pattern-solid', 'pattern-cross'];
    return patterns[idx % patterns.length] ?? 'pattern-none';
  }

  districtGlow(influence: number): string {
    if (influence >= 8) return 'glow--heavy';
    if (influence >= 4) return 'glow--medium';
    if (influence >= 1) return 'glow--light';
    return '';
  }

  districtColor(factionId: string | null): string {
    if (!factionId) return 'var(--district-neutral)';
    const idx = this.notes().factions.findIndex(f => f.id === factionId);
    const colors = ['var(--district-0)', 'var(--district-1)', 'var(--district-2)', 'var(--district-3)', 'var(--district-4)'];
    return colors[idx % colors.length] ?? 'var(--district-neutral)';
  }

  private nodeX(i: number, total: number): number {
    return 200 + 130 * Math.cos((2 * Math.PI * i) / total - Math.PI / 2);
  }

  private nodeY(i: number, total: number): number {
    return 200 + 130 * Math.sin((2 * Math.PI * i) / total - Math.PI / 2);
  }

  // ── Social Compass helpers ─────────────────────────────────────────────────

  private nodeRadius(rating: number): number {
    if (rating >= 3) return 21;
    if (rating === 2) return 14;
    if (rating === 1) return 7;
    return 9; // 0 stars — unrated neutral
  }

  private alignmentAbbr(alignment: string, isUnassessed: boolean): string {
    if (isUnassessed) return '?';
    const map: Record<string, string> = {
      'Lawful Good':    'LG', 'Neutral Good':    'NG', 'Chaotic Good':    'CG',
      'Lawful Neutral': 'LN', 'True Neutral':    'TN', 'Chaotic Neutral': 'CN',
      'Lawful Evil':    'LE', 'Neutral Evil':    'NE', 'Chaotic Evil':    'CE',
    };
    return map[alignment] ?? '?';
  }

  private perceptionRadius(p: number): number {
    const step = (COMPASS_OUTER_R - COMPASS_TN_OUTER_R) / 10;
    return COMPASS_OUTER_R - (Math.max(-5, Math.min(5, p)) + 5) * step;
  }

  private perceptionFill(p: number): string {
    if (p <= -3) return 'var(--compass-hostile)';
    if (p <= -1) return 'var(--compass-amber)';
    if (p === 0) return 'var(--compass-grey)';
    if (p <= 2)  return 'var(--compass-sage)';
    return 'var(--compass-devoted)';
  }

  private relEdgeClass(value: number): string {
    if (value >= 3)  return 'edge--allied';
    if (value >= 1)  return 'edge--patronage';
    if (value === 0) return 'edge--neutral';
    if (value >= -2) return 'edge--rival';
    if (value >= -4) return 'edge--blackmail';
    return 'edge--enemy';
  }

  // ── Cast card popout handlers ─────────────────────────────────────────────

  openCastCard(node: CompassNode, event: Event): void {
    const cast = this.allCasts().find(c => c.instanceId === node.castInstanceId);
    if (!cast) return;

    const svgEl = (event.currentTarget as Element).closest('svg') as SVGSVGElement;
    const pt    = svgEl.createSVGPoint();
    pt.x = node.cx;
    pt.y = node.cy;
    const screen = pt.matrixTransform(svgEl.getScreenCTM()!);

    if (this.overlayTimer) clearTimeout(this.overlayTimer);
    this.sparkOriginX.set(screen.x);
    this.sparkOriginY.set(screen.y);
    this.selectedCast.set(cast);
    this.overlayState.set('opening');
    this.overlayTimer = setTimeout(() => this.overlayState.set('open'), 320);
  }

  closeCastCard(): void {
    if (this.overlayState() === 'closed' || this.overlayState() === 'closing') return;
    if (this.overlayTimer) clearTimeout(this.overlayTimer);
    this.sparkOriginX.set(window.innerWidth  / 2);
    this.sparkOriginY.set(window.innerHeight / 2);
    this.overlayState.set('closing');
    this.overlayTimer = setTimeout(() => {
      this.overlayState.set('closed');
      this.selectedCast.set(null);
    }, 400);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCastCard();
  }

  private loadLocationCastNotes() {
    const ids = this.allCasts().map(c => c.instanceId);
    if (ids.length === 0) return;
    const query = ids.map(id => `castInstanceId=${id}`).join('&');
    this.http.get<CampaignCastPlayerNotes[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/cast-player-notes/by-cast-instances?${query}`
    ).subscribe(notes => this.locationCastNotes.set(notes));
  }
}
