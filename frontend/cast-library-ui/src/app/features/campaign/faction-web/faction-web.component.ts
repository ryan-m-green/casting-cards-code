import { Component, Input, OnChanges, SimpleChanges, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CampaignFactionInstance, FactionRelationship } from '../../../shared/models/faction.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';

const NODE_X           = 0;
const NODE_W           = 140;
const NODE_H           = 34;
const ROW_STEP_MIN     = 54;
const ROW_GAP          = 32;
const PAD_TOP          = 8;
const PAD_BOTTOM       = 40;
const PAD_RIGHT        = 20;
const CROWN_SIZE       = 12;
const SAME_ROW_COL_GAP = 240;
const CAST_TICK_W      = 24;
const SUBLOC_ELBOW_W   = 20;
const SUBLOC_TICK_W    = 14;
const TREE_FIRST_DY    = 14;
const TREE_CHILD_DY    = 20;

export interface WebNode {
  id: string;
  x: number; y: number; cx: number; cy: number;
  faction: CampaignFactionInstance;
  rowIdx: number;
}

export interface TreeChild {
  id: string;
  label: string;
  isPrimary: boolean;
  cy: number;
}

export interface CastGroup {
  factionId: string;
  elbowStartX: number; // bottom-left of faction box
  elbowY: number;      // y of elbow horizontal (bottom of faction box)
  spineX: number;      // x of cast vertical spine (offset right from box left edge)
  spineY1: number;     // top of spine = elbowY
  spineY2: number;     // bottom of spine = last child cy
  iconX: number;       // x where icon starts
  children: TreeChild[];
}

export interface SublocGroup {
  factionId: string;
  elbowStartX: number;
  elbowY: number;
  spineX: number;
  spineY1: number;
  spineY2: number;
  iconX: number;
  children: TreeChild[];
}

@Component({
  selector: 'app-faction-web',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faction-web.component.html',
  styleUrl: './faction-web.component.scss',
})
export class FactionWebComponent implements OnChanges {
  private router = inject(Router);

  @Input({ required: true }) factions: CampaignFactionInstance[] = [];
  @Input() allCast: CampaignCastInstance[] = [];
  @Input() allSublocations: CampaignSublocationInstance[] = [];
  @Input() campaignId = '';
  @Input() playerMode = false;

  readonly nodeW     = NODE_W;
  readonly nodeH     = NODE_H;
  readonly crownSize = CROWN_SIZE;

  private readonly _factions        = signal<CampaignFactionInstance[]>([]);
  private readonly _allCast         = signal<CampaignCastInstance[]>([]);
  private readonly _allSublocations = signal<CampaignSublocationInstance[]>([]);

  ngOnChanges(_: SimpleChanges): void {
    this._factions.set([...this.factions]);
    this._allCast.set([...this.allCast]);
    this._allSublocations.set([...this.allSublocations]);
  }

  nodes = computed<WebNode[]>(() => {
    const factions = this._factions();
    if (!factions.length) return [];

    const sorted = [...factions].sort((a, b) => {
      if (a.influence != null && b.influence != null) return b.influence - a.influence || a.name.localeCompare(b.name);
      if (a.influence != null) return -1;
      if (b.influence != null) return 1;
      return a.name.localeCompare(b.name);
    });

    const result: WebNode[] = [];
    let rowIdx = 0;
    let currentY = PAD_TOP + NODE_H / 2;

    for (const f of sorted) {
      const cx = NODE_X + NODE_W / 2;
      const cy = currentY;
      result.push({ id: f.factionInstanceId, x: cx - NODE_W / 2, y: cy - NODE_H / 2, cx, cy, faction: f, rowIdx });
      const childCount = Math.max(f.castInstanceIds?.length ?? 0, f.subLocationInstanceIds?.length ?? 0);
      currentY += childCount > 0 ? TREE_FIRST_DY + childCount * TREE_CHILD_DY + ROW_GAP : ROW_STEP_MIN;
      rowIdx++;
    }

    return result;
  });

  private nodeMap = computed(() => new Map(this.nodes().map(n => [n.id, n])));

  spineSegments = computed<Array<{
    x1: number; y1: number; x2: number; y2: number;
    relType: string; strength: number;
    dx: number; dy: number;
    labelT: number;
    labelDx: number;
    labelDy: number;
    d: string;
  }>>(() => {
    const map = this.nodeMap();

    type RawSeg = { x1: number; y1: number; x2: number; y2: number; relType: string; strength: number; pairKey: string; isVertical: boolean; };
    const raw: RawSeg[] = [];

    for (const f of this._factions()) {
      const nodeA = map.get(f.factionInstanceId);
      if (!nodeA) continue;
      for (const rel of (f.factionRelationships ?? [])) {
        const nodeB = map.get(rel.factionInstanceIdB);
        if (!nodeB) continue;
        let x1: number, y1: number, x2: number, y2: number;
        const sameRow = Math.abs(nodeA.cy - nodeB.cy) < 1;
        if (sameRow) {
          if (nodeA.cx < nodeB.cx) {
            x1 = nodeA.x + NODE_W; y1 = nodeA.cy;
            x2 = nodeB.x;          y2 = nodeB.cy;
          } else {
            x1 = nodeA.x;          y1 = nodeA.cy;
            x2 = nodeB.x + NODE_W; y2 = nodeB.cy;
          }
        } else if (nodeA.cy < nodeB.cy) {
          x1 = nodeA.x; y1 = nodeA.y + NODE_H;
          x2 = nodeB.x; y2 = nodeB.y;
        } else {
          x1 = nodeA.x; y1 = nodeA.y;
          x2 = nodeB.x; y2 = nodeB.y + NODE_H;
        }
        const [idA, idB] = [f.factionInstanceId, rel.factionInstanceIdB].sort();
        raw.push({ x1, y1, x2, y2, relType: rel.relationshipType, strength: rel.strength, pairKey: `${idA}|${idB}`, isVertical: !sameRow });
      }
    }

    const SPREAD = 6; // px between parallel lines
    const groups = new Map<string, RawSeg[]>();
    const seen = new Set<string>();
    for (const seg of raw) {
      const dedupeKey = `${seg.pairKey}|${seg.relType}`;
      if (seen.has(dedupeKey)) continue; // skip mirror duplicate (B→A after A→B already added)
      seen.add(dedupeKey);
      if (!groups.has(seg.pairKey)) groups.set(seg.pairKey, []);
      groups.get(seg.pairKey)!.push(seg);
    }

    const result: { x1: number; y1: number; x2: number; y2: number; relType: string; strength: number; dx: number; dy: number; labelT: number; labelDx: number; labelDy: number; d: string; }[] = [];

    let globalIdx = 0;
    const startOffsetMap = new Map<string, number>(); // tracks how many lines have already started from a given node y
    const endOffsetMap   = new Map<string, number>(); // tracks how many lines have already ended at a given node y

    for (const segs of groups.values()) {
      const n = segs.length;
      const labelPositions = n === 1 ? [0.5] : Array.from({ length: n }, (_, i) => 0.3 + i * (0.4 / (n - 1)));

      for (let i = 0; i < n; i++) {
        const seg = segs[i];
        const bracketDepth = (globalIdx + 1) * 4;
        globalIdx++;

        // Bump start y up 4px for each additional line leaving the same source node
        const startKey = `${seg.x1},${seg.y1}`;
        const startCount = startOffsetMap.get(startKey) ?? 0;
        startOffsetMap.set(startKey, startCount + 1);
        const adjY1 = seg.y1 - startCount * 8;

        // Bump end y up 4px for each additional line arriving at the same destination node
        const endKey = `${seg.x2},${seg.y2}`;
        const endCount = endOffsetMap.get(endKey) ?? 0;
        endOffsetMap.set(endKey, endCount + 1);
        const adjY2 = seg.y2 + endCount * 8;

        const dx = -bracketDepth;
        const dy = 0;
        const d = `M ${seg.x1},${adjY1} L ${seg.x1 - bracketDepth},${adjY1} L ${seg.x2 - bracketDepth},${adjY2} L ${seg.x2},${adjY2}`;
        result.push({ x1: seg.x1, y1: adjY1, x2: seg.x2, y2: adjY2, relType: seg.relType, strength: seg.strength, dx, dy, labelT: labelPositions[i], labelDx: -4, labelDy: 0, d });
      }
    }
    return result;
  });

  castGroups = computed<CastGroup[]>(() => {
    const map   = this.nodeMap();
    const casts = this._allCast();
    const result: CastGroup[] = [];
    for (const f of this._factions()) {
      const fNode = map.get(f.factionInstanceId);
      if (!fNode) continue;
      const ids = f.castInstanceIds ?? [];
      if (!ids.length) continue;
      const ordered = [
        ...(f.primaryCastInstanceId ? [f.primaryCastInstanceId] : []),
        ...ids.filter(id => id !== f.primaryCastInstanceId),
      ];
      const children: TreeChild[] = [];
      ordered.forEach((id, i) => {
        const cast = casts.find(c => c.instanceId === id);
        if (!cast) return;
        children.push({
          id: cast.instanceId, label: cast.name,
          isPrimary: id === f.primaryCastInstanceId,
          cy: fNode.y + NODE_H + TREE_FIRST_DY + i * TREE_CHILD_DY,
        });
      });
      if (!children.length) continue;
      const elbowStartX = fNode.x;
      const elbowY      = fNode.y + NODE_H;       // bottom of faction box
      const spineX      = fNode.x + CAST_TICK_W;  // dedicated cast spine x, away from relationship spine
      result.push({
        factionId: f.factionInstanceId,
        elbowStartX,
        elbowY,
        spineX,
        spineY1: elbowY,
        spineY2: children[children.length - 1].cy,
        iconX:   spineX + 6,
        children,
      });
    }
    return result;
  });

  sublocGroups = computed<SublocGroup[]>(() => {
    const map  = this.nodeMap();
    const subs = this._allSublocations();
    const result: SublocGroup[] = [];
    for (const f of this._factions()) {
      const fNode = map.get(f.factionInstanceId);
      if (!fNode) continue;
      const ids = f.subLocationInstanceIds ?? [];
      if (!ids.length) continue;
      const ordered = [
        ...(f.primarySublocationInstanceId ? [f.primarySublocationInstanceId] : []),
        ...ids.filter(id => id !== f.primarySublocationInstanceId),
      ];
      const children: TreeChild[] = [];
      ordered.forEach((id, i) => {
        const sub = subs.find(s => s.instanceId === id);
        if (!sub) return;
        children.push({
          id: sub.instanceId, label: sub.name,
          isPrimary: id === f.primarySublocationInstanceId,
          cy: fNode.y + NODE_H + TREE_FIRST_DY + i * TREE_CHILD_DY,
        });
      });
      if (!children.length) continue;
      const elbowStartX = fNode.x + NODE_W;
      const spineX      = elbowStartX + SUBLOC_ELBOW_W;
      const elbowY      = fNode.y + NODE_H; // bottom of faction box
      result.push({
        factionId: f.factionInstanceId,
        elbowStartX,
        elbowY,
        spineX,
        spineY1: elbowY,
        spineY2: children[children.length - 1].cy,
        iconX:   spineX + SUBLOC_TICK_W,
        children,
      });
    }
    return result;
  });

  private _viewBoxDims = computed<{ minX: number; minY: number; w: number; h: number }>(() => {
    const ns = this.nodes();
    const cg = this.castGroups();
    const sg = this.sublocGroups();
    if (!ns.length) return { minX: 0, minY: 0, w: 600, h: 400 };
    const allChildCy = [...cg.flatMap(g => g.children.map(c => c.cy)), ...sg.flatMap(g => g.children.map(c => c.cy))];
    const maxLabelRight = sg.length ? Math.max(...sg.map(g => g.iconX + 160)) : NODE_W;
    const minX = -PAD_RIGHT;
    const minY = Math.min(...ns.map(n => n.y)) - PAD_TOP;
    const maxX = Math.max(...ns.map(n => n.x + NODE_W), maxLabelRight) + PAD_RIGHT;
    const maxNodeBottom = Math.max(...ns.map(n => n.y + NODE_H));
    const maxY = Math.max(maxNodeBottom, ...(allChildCy.length ? allChildCy : [0])) + PAD_BOTTOM;
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  });

  viewBox = computed<string>(() => {
    const d = this._viewBoxDims();
    return `${d.minX} ${d.minY} ${d.w} ${d.h}`;
  });

  svgHeight = computed<number>(() => Math.ceil(this._viewBoxDims().h * 1.25));

  alignIcon(faction: CampaignFactionInstance): string {
    const p = faction.perception ?? 0;
    if (p > 0) return '🕊';
    if (p < 0) return '🗡';
    return '⚖';
  }

  alignColor(faction: CampaignFactionInstance): string {
    const p = faction.perception ?? 0;
    if (p > 0) return '#6ecf88';
    if (p < 0) return '#d05858';
    return '#a898c8';
  }

  influenceGlow(influence: number): string {
    const clamped = Math.max(0, Math.min(10, influence));
    const opacity = 0.15 + clamped * 0.07;
    const spread  = 2 + clamped * 1.2;
    return `drop-shadow(0 0 ${spread}px rgba(167,121,233,${opacity.toFixed(2)}))`;
  }

  influenceDots(influence: number): string {
    const n = Math.max(0, Math.min(10, Math.round(influence)));
    return '●'.repeat(n) + '○'.repeat(10 - n);
  }

  navigateToCast(castId: string): void {
    const cast = this._allCast().find(c => c.instanceId === castId);
    if (!cast?.sublocationInstanceId) return;
    const base = this.playerMode ? '/player/campaign' : '/campaign';
    this.router.navigate([base, this.campaignId, 'sublocations', cast.sublocationInstanceId, 'cast', castId]);
  }

  relColor(relType: string): string {
    switch (relType) {
      case 'allied':  return 'rgba(80,200,120,0.7)';
      case 'rival':   return 'rgba(220,160,50,0.7)';
      case 'enemy':   return 'rgba(210,70,70,0.7)';
      default:        return 'rgba(160,155,180,0.5)';
    }
  }

  relDash(relType: string): string {
    switch (relType) {
      case 'allied':  return 'none';        // solid
      case 'rival':   return '3,3';         // tight even dashes
      case 'enemy':   return '6,3,1,3';     // dash-dot
      case 'neutral': return '1,4';         // sparse dots
      default:        return 'none';
    }
  }

  relLabel(relType: string): string {
    return relType.charAt(0).toUpperCase() + relType.slice(1);
  }

  relLabelBox(seg: { x1: number; y1: number; x2: number; y2: number; dx: number; dy: number; labelT: number; labelDy: number; relType: string }): { x: number; y: number } {
    const rect    = this.relLabelRect(seg.relType);
    const vertX   = seg.x1 + seg.dx - 4;
    const labelCx = vertX - this.relLabelConnectorW - rect.w / 2;
    const topY    = Math.min(seg.y1, seg.y2);
    return { x: labelCx, y: topY };
  }

  relLabelConnector(seg: { x1: number; y1: number; x2: number; y2: number; dx: number; dy: number; labelT: number; labelDy: number; relType: string }): { x1: number; y1: number; x2: number; y2: number } {
    const vertX = seg.x1 + seg.dx - 4;
    const topY  = Math.min(seg.y1, seg.y2);
    return { x1: vertX - this.relLabelConnectorW, y1: topY, x2: vertX, y2: topY };
  }

  readonly relLabelPad  = 2;   // px padding between border and text
  readonly relLabelFontSize = 6; // px
  readonly relLabelConnectorW = 8; // px connector from label right edge to the path
  relLabelRect(relType: string): { w: number; h: number } {
    const charW = this.relLabelFontSize * 0.6;
    const label = this.relLabel(relType);
    const extraW = relType === 'neutral' ? 4 : relType === 'enemy' ? 4 : 0;
    const w = label.length * charW + this.relLabelPad * 2 + extraW;
    const h = this.relLabelFontSize + this.relLabelPad * 2;
    return { w, h };
  }

  navigateToSublocation(sublocationId: string): void {
    const base = this.playerMode ? '/player/campaign' : '/campaign';
    this.router.navigate([base, this.campaignId, 'sublocations', sublocationId]);
  }
}

