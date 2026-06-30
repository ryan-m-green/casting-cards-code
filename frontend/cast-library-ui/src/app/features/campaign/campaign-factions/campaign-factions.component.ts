import { Component, OnInit, OnChanges, SimpleChanges, signal, computed, inject, ViewChild, ElementRef, HostListener, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignDetail, CampaignCastRelationship, CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignFactionInstance } from '../../../shared/models/faction.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { FactionCardComponent } from '../../../shared/components/faction-card/faction-card.component';
import { PortalImportCardComponent } from '../../../shared/components/portal-import-card/portal-import-card.component';
import { FactionWebComponent } from '../faction-web/faction-web.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../../shared/components/campaign-dropdown/campaign-dropdown.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { CastRelationshipsTabComponent } from '../cast-relationships-tab/cast-relationships-tab.component';

// ── Social Compass constants ───────────────────────────────────────────────────
const COMPASS_CX            = 280;
const COMPASS_CY            = 280;
const COMPASS_OUTER_R       = 224;
const COMPASS_TN_INNER_R    =  22;
const COMPASS_TN_OUTER_R    =  38;
const RING_HOSTILE_BOUNDARY = 162;
const RING_DEVOTED_BOUNDARY = 100;
const SLICE_BOUNDARIES      = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

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
  x1: number; y1: number;
  x2: number; y2: number;
  edgeClass: string;
}

interface SliceLine {
  x1: number; y1: number;
  x2: number; y2: number;
}

@Component({
  selector: 'app-campaign-factions',
  standalone: true,
  imports: [CommonModule, FactionCardComponent, PortalImportCardComponent, FactionWebComponent, CampaignDropdownComponent, CastCardComponent, CastRelationshipsTabComponent],
  templateUrl: './campaign-factions.component.html',
  styleUrl: './campaign-factions.component.scss',
})
export class CampaignFactionsComponent implements OnInit, OnChanges {
  // ── Player-mode inputs ─────────────────────────────────────────────────────
  @Input() mode: 'dm' | 'player' = 'dm';
  @Input() playerFactions: CampaignFactionInstance[] = [];
  @Input() playerCasts: CampaignCastInstance[] = [];
  @Input() playerSublocations: CampaignSublocationInstance[] = [];
  @Input() playerRelationships: CampaignCastRelationship[] = [];
  @Input() playerCampaignId = '';

  private _factionsGridEl = signal<HTMLElement | null>(null);
  @ViewChild('factionsGrid') set factionsGridRef(ref: ElementRef<HTMLElement> | undefined) {
    this._factionsGridEl.set(ref?.nativeElement ?? null);
  }
  get factionsGridEl(): HTMLElement | null { return this._factionsGridEl(); }

  private _importCard = signal<PortalImportCardComponent | null>(null);
  @ViewChild('importCard') set importCardSetter(ref: PortalImportCardComponent | undefined) {
    this._importCard.set(ref ?? null);
  }
  get importCardRef(): PortalImportCardComponent | null { return this._importCard(); }

  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private http     = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);
  private hub      = inject(CampaignHubService);
  private playerShellSvc = inject(PlayerCampaignShellService);
  auth             = inject(AuthService);
  private hubSubscriptions: Subscription[] = [];

  campaign   = signal<CampaignDetail | null>(null);
  campaignId = signal('');

  // ── Resolved collections (DM uses campaign(), player uses inputs) ──────────
  resolvedFactions     = signal<CampaignFactionInstance[]>([]);
  resolvedCasts        = signal<CampaignCastInstance[]>([]);
  resolvedSublocations = signal<CampaignSublocationInstance[]>([]);
  resolvedRelationships = signal<CampaignCastRelationship[]>([]);

  isDm = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);

  activeTab = signal<'factions' | 'registry' | 'social' | 'set-social'>('factions');
  setTab(tab: 'factions' | 'registry' | 'social' | 'set-social') {
    this.activeTab.set(tab);
    if (tab === 'social') {
      if (this.mode === 'player') this.loadPlayerCastNotes();
      else this.loadCastNotes();
    }
  }

  // ── Social Compass ────────────────────────────────────────────────────────

  selectedCompassCastId = signal<string>('');
  castNotes             = signal<CampaignCastPlayerNotes[]>([]);
  selectedCastOverlay   = signal<CampaignCastInstance | null>(null);
  selectedCompassRelExplanation = signal<string | null>(null);
  overlayState          = signal<'closed' | 'opening' | 'open' | 'closing'>('closed');
  sparkOriginX          = signal(0);
  sparkOriginY          = signal(0);
  readonly sparkAngles  = Array.from({ length: 16 }, (_, i) => i * 22.5);
  private overlayTimer: ReturnType<typeof setTimeout> | null = null;

  readonly compassCx           = COMPASS_CX;
  readonly compassCy           = COMPASS_CY;
  readonly compassOuterR       = COMPASS_OUTER_R;
  readonly compassTnInnerR     = COMPASS_TN_INNER_R;
  readonly compassTnOuterR     = COMPASS_TN_OUTER_R;
  readonly ringHostileBoundary = RING_HOSTILE_BOUNDARY;
  readonly ringDevotedBoundary = RING_DEVOTED_BOUNDARY;

  readonly compassSliceLines: SliceLine[] = SLICE_BOUNDARIES.map(angle => {
    const rad = (angle * Math.PI) / 180;
    return {
      x1: COMPASS_CX + COMPASS_TN_OUTER_R * Math.sin(rad),
      y1: COMPASS_CY - COMPASS_TN_OUTER_R * Math.cos(rad),
      x2: COMPASS_CX + COMPASS_OUTER_R    * Math.sin(rad),
      y2: COMPASS_CY - COMPASS_OUTER_R    * Math.cos(rad),
    };
  });

  castDropdownOptions = computed((): CampaignDropdownOption[] => {
    const casts = this.resolvedCasts();
    const rels  = this.resolvedRelationships();

    const withCount = casts.map(c => ({
      c,
      count: rels.filter(r => r.sourceCastInstanceId === c.instanceId || r.targetCastInstanceId === c.instanceId).length,
    }));

    const withRels    = withCount.filter(x => x.count > 0).sort((a, b) => b.count - a.count || a.c.name.localeCompare(b.c.name));
    const withoutRels = withCount.filter(x => x.count === 0).sort((a, b) => a.c.name.localeCompare(b.c.name));

    return [
      { value: '', label: 'Select a cast member…' },
      ...[...withRels, ...withoutRels].map(x => ({ value: x.c.instanceId, label: x.c.name })),
    ];
  });

  selectedCast = computed((): CampaignCastInstance | null => {
    const id = this.selectedCompassCastId();
    if (!id) return null;
    return this.resolvedCasts().find(c => c.instanceId === id) ?? null;
  });

  compassNodes = computed((): CompassNode[] => {
    const selected = this.selectedCast();
    if (!selected) return [];

    const casts = this.resolvedCasts().filter(c => c.instanceId !== selected.instanceId);
    const rels  = this.resolvedRelationships();
    if (casts.length === 0) return [];

    const NODE_R = 12;

    // ── 1. Only include casts the selected cast has a relationship with ────────
    const relatedCasts = casts.filter(cast =>
      rels.some(r => r.sourceCastInstanceId === selected.instanceId && r.targetCastInstanceId === cast.instanceId)
    );
    if (relatedCasts.length === 0) return [];

    // ── 2. Assign each cast its disposition value, ring radius, and alignment angle ──
    const items = relatedCasts.map(cast => {
      const rel          = rels.find(r => r.sourceCastInstanceId === selected.instanceId && r.targetCastInstanceId === cast.instanceId);
      const value        = rel?.value ?? 0;
      const alignment    = cast.alignment || 'Lawful Neutral';
      const isUnassessed = !cast.alignment;
      const alignAngleDeg = ALIGNMENT_ANGLES[alignment] ?? ALIGNMENT_ANGLES['Lawful Neutral'];
      return { cast, value, alignment, isUnassessed, alignAngleDeg, radialR: this.dispositionRadius(value) };
    });

    // ── 3. Group by radial distance (same value → same ring) ─────────────────
    const ringMap = new Map<number, typeof items>();
    for (const item of items) {
      const key = item.radialR;
      if (!ringMap.has(key)) ringMap.set(key, []);
      ringMap.get(key)!.push(item);
    }

    // ── 4. For each ring, sort by alignment angle then space evenly ───────────
    const pos = new Map<string, { cx: number; cy: number }>();

    for (const [radialR, group] of ringMap) {
      // Sort by their natural alignment angle so they stay near their octant
      group.sort((a, b) => a.alignAngleDeg - b.alignAngleDeg);

      const count = group.length;

      // Minimum angular spacing to prevent circle overlap on this ring
      // arc between centres must be >= diameter + gap
      const minArcGap = (NODE_R * 2 + 8) / (radialR || 1); // radians
      const evenStep  = (2 * Math.PI) / count;
      const step      = Math.max(evenStep, minArcGap);

      // If step > evenStep the nodes won't fill the circle — centre the spread
      // on the mean alignment angle so they still cluster near their octant.
      const meanAngleRad = group.reduce((sum, n) => sum + (n.alignAngleDeg * Math.PI / 180), 0) / count;
      const totalSpan    = step * (count - 1);
      const startAngle   = count === 1
        ? meanAngleRad
        : meanAngleRad - totalSpan / 2;

      // Dead-zone: keep nodes away from the top (north) where ring labels sit.
      // Any final angle within ±20° of north (0 / 2π) is nudged just past the boundary.
      const TOP_ZONE_RAD = 20 * Math.PI / 180;
      const nudgeAngle = (a: number): number => {
        const norm = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // 0..2π
        if (norm <= TOP_ZONE_RAD) return TOP_ZONE_RAD;
        if (norm >= 2 * Math.PI - TOP_ZONE_RAD) return 2 * Math.PI - TOP_ZONE_RAD;
        return a;
      };

      group.forEach((item, idx) => {
        const raw   = count === 1 ? startAngle : startAngle + idx * step;
        const angle = nudgeAngle(raw);
        pos.set(item.cast.instanceId, {
          cx: COMPASS_CX + radialR * Math.sin(angle),
          cy: COMPASS_CY - radialR * Math.cos(angle),
        });
      });
    }

    // ── 5. Build final nodes ──────────────────────────────────────────────────
    return items.map(n => {
      const p = pos.get(n.cast.instanceId)!;
      const spaceIdx  = n.cast.name.indexOf(' ');
      const firstName = spaceIdx === -1 ? n.cast.name : n.cast.name.slice(0, spaceIdx);
      const lastName  = spaceIdx === -1 ? ''           : n.cast.name.slice(spaceIdx + 1);
      return {
        castInstanceId: n.cast.instanceId,
        name:           n.cast.name,
        firstName,
        lastName,
        cx:   p.cx,
        cy:   p.cy,
        r:    NODE_R,
        fill: this.dispositionFill(n.value),
        isUnassessed:  n.isUnassessed,
        alignmentCode: this.alignmentAbbr(n.alignment, n.isUnassessed),
      };
    });
  });

  compassEdges = computed((): CompassEdge[] => {
    const selected = this.selectedCast();
    if (!selected) return [];

    const rels  = this.resolvedRelationships();
    const nodes = this.compassNodes();
    const edges: CompassEdge[] = [];
    const seen  = new Set<string>();

    for (const rel of rels) {
      const isSelectedSource = rel.sourceCastInstanceId === selected.instanceId;
      const isSelectedTarget = rel.targetCastInstanceId === selected.instanceId;

      // Only draw edges that connect the center node to another cast
      if (!isSelectedSource && !isSelectedTarget) continue;

      const otherCastId = isSelectedSource ? rel.targetCastInstanceId : rel.sourceCastInstanceId;
      const otherNode   = nodes.find(n => n.castInstanceId === otherCastId);
      if (!otherNode) continue;

      const pairKey = [selected.instanceId, otherCastId].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      edges.push({
        id:        rel.id,
        x1:        COMPASS_CX,
        y1:        COMPASS_CY,
        x2:        otherNode.cx,
        y2:        otherNode.cy,
        edgeClass: this.relEdgeClass(rel.value),
      });
    }
    return edges;
  });

  unassessedCount = computed(() =>
    this.compassNodes().filter(n => n.isUnassessed).length
  );

  // ── Player Social Compass (party-centric) ─────────────────────────────────

  playerCompassNodes = computed((): CompassNode[] => {
    if (this.mode !== 'player') return [];
    const casts = this.resolvedCasts();
    if (!casts.length) return [];

    const notes = this.castNotes();
    const NODE_R = 12;

    const unlockedCasts = casts.filter(c => c.isVisibleToPlayers);
    if (!unlockedCasts.length) return [];

    const items = unlockedCasts.map(cast => {
      const note         = notes.find(n => n.castInstanceId === cast.instanceId);
      const perception   = note?.perception ?? 0;
      const alignment    = cast.alignment || 'Lawful Neutral';
      const isUnassessed = !cast.alignment;
      const alignAngleDeg = ALIGNMENT_ANGLES[alignment] ?? ALIGNMENT_ANGLES['Lawful Neutral'];
      return { cast, value: perception, alignment, isUnassessed, alignAngleDeg, radialR: this.dispositionRadius(perception) };
    });

    const ringMap = new Map<number, typeof items>();
    for (const item of items) {
      const key = item.radialR;
      if (!ringMap.has(key)) ringMap.set(key, []);
      ringMap.get(key)!.push(item);
    }

    const pos = new Map<string, { cx: number; cy: number }>();
    for (const [radialR, group] of ringMap) {
      group.sort((a, b) => a.alignAngleDeg - b.alignAngleDeg);
      const count = group.length;
      const minArcGap = (NODE_R * 2 + 8) / (radialR || 1);
      const evenStep  = (2 * Math.PI) / count;
      const step      = Math.max(evenStep, minArcGap);
      const meanAngleRad = group.reduce((sum, n) => sum + (n.alignAngleDeg * Math.PI / 180), 0) / count;
      const totalSpan    = step * (count - 1);
      const startAngle   = count === 1 ? meanAngleRad : meanAngleRad - totalSpan / 2;
      const TOP_ZONE_RAD = 20 * Math.PI / 180;
      const nudgeAngle = (a: number): number => {
        const norm = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (norm <= TOP_ZONE_RAD) return TOP_ZONE_RAD;
        if (norm >= 2 * Math.PI - TOP_ZONE_RAD) return 2 * Math.PI - TOP_ZONE_RAD;
        return a;
      };
      group.forEach((item, idx) => {
        const raw   = count === 1 ? startAngle : startAngle + idx * step;
        const angle = nudgeAngle(raw);
        pos.set(item.cast.instanceId, {
          cx: COMPASS_CX + radialR * Math.sin(angle),
          cy: COMPASS_CY - radialR * Math.cos(angle),
        });
      });
    }

    return items.map(n => {
      const p = pos.get(n.cast.instanceId)!;
      const spaceIdx  = n.cast.name.indexOf(' ');
      const firstName = spaceIdx === -1 ? n.cast.name : n.cast.name.slice(0, spaceIdx);
      const lastName  = spaceIdx === -1 ? ''          : n.cast.name.slice(spaceIdx + 1);
      return {
        castInstanceId: n.cast.instanceId,
        name:           n.cast.name,
        firstName,
        lastName,
        cx:   p.cx,
        cy:   p.cy,
        r:    NODE_R,
        fill: this.dispositionFill(n.value),
        isUnassessed:  n.isUnassessed,
        alignmentCode: this.alignmentAbbr(n.alignment, n.isUnassessed),
      };
    });
  });

  playerCompassEdges = computed((): CompassEdge[] => {
    if (this.mode !== 'player') return [];
    const notes = this.castNotes();
    const nodes = this.playerCompassNodes();
    const edges: CompassEdge[] = [];
    const seen  = new Set<string>();

    for (const note of notes) {
      const sourceNode = nodes.find(n => n.castInstanceId === note.castInstanceId);
      if (!sourceNode) continue;

      for (const connectedId of note.connections) {
        const targetNode = nodes.find(n => n.castInstanceId === connectedId);
        if (!targetNode) continue;

        const pairKey = [note.castInstanceId, connectedId].sort().join('|');
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);

        edges.push({
          id:        pairKey,
          x1:        sourceNode.cx,
          y1:        sourceNode.cy,
          x2:        targetNode.cx,
          y2:        targetNode.cy,
          edgeClass: 'edge--neutral',
        });
      }
    }
    return edges;
  });

  private objectPronoun(pronouns: string | undefined): string {
    const p = (pronouns ?? '').toLowerCase();
    if (p.startsWith('he'))  return 'him';
    if (p.startsWith('she')) return 'her';
    if (p.startsWith('it'))  return 'it';
    return 'them';
  }

  compassDispositionSummary = computed((): string => {
    const cast  = this.selectedCast();
    if (!cast) return '';
    const nodes = this.compassNodes();
    if (!nodes.length) return '';

    const rels = this.resolvedRelationships();
    const pronoun = this.objectPronoun(cast.pronouns);

    let likes = 0, indifferent = 0, dislikes = 0;
    for (const node of nodes) {
      const rel = rels.find(r => r.sourceCastInstanceId === cast.instanceId && r.targetCastInstanceId === node.castInstanceId);
      const val = rel?.value ?? 0;
      if (val > 0)       likes++;
      else if (val === 0) indifferent++;
      else               dislikes++;
    }

    const firstName = cast.name.split(' ')[0];
    const parts: string[] = [];
    if (likes > 0)       parts.push(`${likes} ${likes === 1 ? 'cast member likes' : 'cast members like'} ${pronoun}`);
    if (indifferent > 0) parts.push(`${indifferent} ${indifferent === 1 ? 'is' : 'are'} indifferent with ${pronoun}`);
    if (dislikes > 0)    parts.push(`${dislikes} ${dislikes === 1 ? 'does not like' : 'do not like'} ${pronoun}`);

    return `${firstName}: ${parts.join(', ')}.`;
  });

  private loadCastNotes() {
    const casts = this.resolvedCasts();
    if (!casts.length) return;
    const query = casts.map(c => `castInstanceId=${c.instanceId}`).join('&');
    this.http.get<CampaignCastPlayerNotes[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/cast-player-notes/by-cast-instances?${query}`
    ).subscribe(notes => this.castNotes.set(notes));
  }

  private loadPlayerCastNotes() {
    const casts = this.resolvedCasts();
    if (!casts.length) return;
    const query = casts.map(c => `castInstanceId=${c.instanceId}`).join('&');
    this.http.get<CampaignCastPlayerNotes[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/cast-player-notes/by-cast-instances?${query}`
    ).subscribe(notes => this.castNotes.set(notes));
  }

  private dispositionRadius(value: number): number {
    const clamped = Math.max(-5, Math.min(5, value));
    const step    = (COMPASS_OUTER_R - COMPASS_TN_OUTER_R) / 10;
    return COMPASS_OUTER_R - (clamped + 5) * step;
  }

  private dispositionFill(value: number): string {
    if (value <= -3) return 'var(--compass-hostile)';
    if (value <= -1) return 'var(--compass-amber)';
    if (value === 0) return 'var(--compass-grey)';
    if (value <= 2)  return 'var(--compass-sage)';
    return 'var(--compass-devoted)';
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

  private relEdgeClass(value: number): string {
    if (value >= 3)  return 'edge--allied';
    if (value >= 1)  return 'edge--patronage';
    if (value === 0) return 'edge--neutral';
    if (value >= -2) return 'edge--rival';
    if (value >= -4) return 'edge--blackmail';
    return 'edge--enemy';
  }

  openCastOverlay(node: CompassNode | null, event: Event): void {
    let cast: CampaignCastInstance | undefined;
    if (node) {
      cast = this.resolvedCasts().find(c => c.instanceId === node.castInstanceId);
    } else {
      cast = this.selectedCast() ?? undefined;
    }
    if (!cast) return;

    const svgEl = (event.currentTarget as Element).closest('svg') as SVGSVGElement;
    const pt    = svgEl.createSVGPoint();
    pt.x = node ? node.cx : COMPASS_CX;
    pt.y = node ? node.cy : COMPASS_CY;
    const screen = pt.matrixTransform(svgEl.getScreenCTM()!);

    if (this.overlayTimer) clearTimeout(this.overlayTimer);
    this.sparkOriginX.set(screen.x);
    this.sparkOriginY.set(screen.y);
    this.selectedCastOverlay.set(cast);

    if (node) {
      const rel = this.resolvedRelationships().find(
        r => r.sourceCastInstanceId === this.selectedCompassCastId() && r.targetCastInstanceId === node.castInstanceId
      );
      this.selectedCompassRelExplanation.set(rel?.explanation ?? null);
    } else {
      this.selectedCompassRelExplanation.set(null);
    }

    this.overlayState.set('opening');
    this.overlayTimer = setTimeout(() => this.overlayState.set('open'), 320);
  }

  closeCastOverlay(): void {
    if (this.overlayState() === 'closed' || this.overlayState() === 'closing') return;
    if (this.overlayTimer) clearTimeout(this.overlayTimer);
    this.sparkOriginX.set(window.innerWidth  / 2);
    this.sparkOriginY.set(window.innerHeight / 2);
    this.overlayState.set('closing');
    this.overlayTimer = setTimeout(() => {
      this.overlayState.set('closed');
      this.selectedCastOverlay.set(null);
      this.selectedCompassRelExplanation.set(null);
    }, 400);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCastOverlay();
  }

  private factionTilts = new Map<string, number>();

  factionTilt(instanceId: string): number {
    if (!this.factionTilts.has(instanceId)) {
      const magnitude = 2;
      this.factionTilts.set(instanceId, Math.random() < 0.5 ? -magnitude : magnitude);
    }
    return this.factionTilts.get(instanceId)!;
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.mode === 'player') {
      this.resolvedFactions.set(this.playerFactions);
      this.resolvedCasts.set(this.playerCasts);
      this.resolvedSublocations.set(this.playerSublocations);
      this.resolvedRelationships.set(this.playerRelationships);
      this.campaignId.set(this.playerCampaignId);
    }
  }

  ngOnInit() {
    this.hubSubscriptions.push(
      this.hub.factionSymbolAssigned$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) {
          return;
        }
        if (this.mode === 'player') {
          this.http.get<CampaignFactionInstance[]>(
            `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/player`
          ).subscribe(factions => {
            this.resolvedFactions.set(factions);
          });
        } else {
          this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}`)
            .subscribe(campaign => {
              this.campaign.set(campaign);
              this.resolvedFactions.set(campaign.factions);
              this.resolvedCasts.set(campaign.casts);
              this.resolvedSublocations.set(campaign.sublocations);
              this.resolvedRelationships.set(campaign.relationships ?? []);
            });
        }
      })
    );

    if (this.mode === 'player') {
      this.resolvedFactions.set(this.playerFactions);
      this.resolvedCasts.set(this.playerCasts);
      this.resolvedSublocations.set(this.playerSublocations);
      this.resolvedRelationships.set(this.playerRelationships);
      this.campaignId.set(this.playerCampaignId);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(campaign => {
        this.campaign.set(campaign);
        this.resolvedFactions.set(campaign.factions);
        this.resolvedCasts.set(campaign.casts);
        this.resolvedSublocations.set(campaign.sublocations);
        this.resolvedRelationships.set(campaign.relationships ?? []);
        this.shellSvc.setTitleContext({ pageType: 'gm-factions', campaignId: id, baseRoute: '/campaign', location: null }, '56px');
      });
  }

  goToLocations() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  goToFaction(faction: CampaignFactionInstance) {
    if (this.mode === 'player') {
      const campaignId = this.playerCampaignId || this.campaignId();
      this.router.navigate(['/player/campaign', campaignId, 'factions', faction.factionInstanceId]);
      return;
    }
    this.router.navigate(['/campaign', this.campaignId(), 'factions', faction.factionInstanceId]);
  }

  toggleFactionVisibility(faction: CampaignFactionInstance) {
    const next = !faction.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${faction.factionInstanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.resolvedFactions.update(factions => factions.map(f =>
        f.factionInstanceId === faction.factionInstanceId ? { ...f, isVisibleToPlayers: next } : f
      ));
      this.campaign.update(c => c ? {
        ...c,
        factions: c.factions.map(f => f.factionInstanceId === faction.factionInstanceId
          ? { ...f, isVisibleToPlayers: next }
          : f)
      } : c);
    });
  }

  onFactionAdded(instance: CampaignFactionInstance) {
    if (instance.factionInstanceId.startsWith('tmp-')) {
      this.campaign.update(c => c ? { ...c, factions: [...c.factions, instance] } : c);
    } else {
      this.campaign.update(c => {
        if (!c) return c;
        const factions = c.factions.some(f => f.factionInstanceId === instance.factionInstanceId)
          ? c.factions
          : c.factions.some(f => f.factionInstanceId.startsWith('tmp-') && f.sourceFactionId === instance.sourceFactionId)
            ? c.factions.map(f => f.factionInstanceId.startsWith('tmp-') && f.sourceFactionId === instance.sourceFactionId ? instance : f)
            : [...c.factions, instance];
        return { ...c, factions };
      });
    }
  }

  onFactionRemoved(instanceId: string) {
    this.campaign.update(c => c ? { ...c, factions: c.factions.filter(f => f.factionInstanceId !== instanceId) } : c);
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }
}
