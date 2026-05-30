import { Component, Input, OnChanges, SimpleChanges, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CampaignFactionInstance, FactionRelationship } from '../../../shared/models/faction.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';

const NODE_X           = 0;
const NODE_W           = 160;
const NODE_HEADER_H    = 34;
const ROW_GAP          = 32;
const PAD_TOP          = 8;
const PAD_BOTTOM       = 40;
const PAD_RIGHT        = 20;
const CROWN_SIZE       = 12;
const SECTION_TITLE_H  = 12;
const LIST_ITEM_H      = 16;
const DIVIDER_H        = 8;
const CARD_PADDING     = 8;

export interface WebNode {
  id: string;
  x: number; y: number; cx: number; cy: number;
  faction: CampaignFactionInstance;
  rowIdx: number;
  width: number;
  height: number;
  casts: Array<{ id: string; name: string; isPrimary: boolean }>;
  sublocations: Array<{ id: string; name: string; isPrimary: boolean }>;
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
  readonly nodeHeaderH = NODE_HEADER_H;
  readonly crownSize = CROWN_SIZE;
  readonly sectionTitleH = SECTION_TITLE_H;
  readonly listItemH = LIST_ITEM_H;
  readonly dividerH = DIVIDER_H;

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
    const casts = this._allCast();
    const subs = this._allSublocations();
    if (!factions.length) return [];

    const sorted = [...factions].sort((a, b) => {
      if (a.influence != null && b.influence != null) return b.influence - a.influence || a.name.localeCompare(b.name);
      if (a.influence != null) return -1;
      if (b.influence != null) return 1;
      return a.name.localeCompare(b.name);
    });

    const result: WebNode[] = [];
    let rowIdx = 0;
    let currentY = PAD_TOP;

    for (const f of sorted) {
      const width = this.calculateNodeWidth(f.name);
      const x = NODE_X;
      const y = currentY;

      // Get cast data
      const castIds = f.castInstanceIds ?? [];
      const castData: Array<{ id: string; name: string; isPrimary: boolean }> = [];
      const orderedCastIds = [
        ...(f.primaryCastInstanceId ? [f.primaryCastInstanceId] : []),
        ...castIds.filter(id => id !== f.primaryCastInstanceId),
      ];
      for (const id of orderedCastIds) {
        const cast = casts.find(c => c.instanceId === id);
        if (cast) {
          castData.push({
            id: cast.instanceId,
            name: cast.name,
            isPrimary: id === f.primaryCastInstanceId,
          });
        }
      }

      // Get sublocation data
      const subIds = f.subLocationInstanceIds ?? [];
      const subData: Array<{ id: string; name: string; isPrimary: boolean }> = [];
      const orderedSubIds = [
        ...(f.primarySublocationInstanceId ? [f.primarySublocationInstanceId] : []),
        ...subIds.filter(id => id !== f.primarySublocationInstanceId),
      ];
      for (const id of orderedSubIds) {
        const sub = subs.find(s => s.instanceId === id);
        if (sub) {
          subData.push({
            id: sub.instanceId,
            name: sub.name,
            isPrimary: id === f.primarySublocationInstanceId,
          });
        }
      }

      // Calculate card height
      let height = NODE_HEADER_H + CARD_PADDING * 2;
      if (castData.length > 0) {
        height += SECTION_TITLE_H + castData.length * LIST_ITEM_H;
      }
      if (castData.length > 0 && subData.length > 0) {
        height += DIVIDER_H + 8;
      }
      if (subData.length > 0) {
        height += SECTION_TITLE_H + subData.length * LIST_ITEM_H;
      }

      const cx = x + width / 2;
      const cy = y + height / 2;
      result.push({ id: f.factionInstanceId, x, y, cx, cy, faction: f, rowIdx, width, height, casts: castData, sublocations: subData });
      currentY += height + ROW_GAP;
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
    id: string;
    sourceFactionId: string;
    targetFactionId: string;
    side: 'left' | 'right';
  }>>(() => {
    const map = this.nodeMap();

    type RawSeg = { 
      x1: number; y1: number; x2: number; y2: number; 
      relType: string; strength: number; pairKey: string; 
      nodeA: WebNode; nodeB: WebNode;
    };
    const raw: RawSeg[] = [];

    for (const f of this._factions()) {
      const nodeA = map.get(f.factionInstanceId);
      if (!nodeA) continue;
      for (const rel of (f.factionRelationships ?? [])) {
        const nodeB = map.get(rel.factionInstanceIdB);
        if (!nodeB) continue;
        const [idA, idB] = [f.factionInstanceId, rel.factionInstanceIdB].sort();
        raw.push({ 
          x1: 0, y1: 0, x2: 0, y2: 0, 
          relType: rel.relationshipType, 
          strength: rel.strength, 
          pairKey: `${idA}|${idB}`, 
          nodeA,
          nodeB
        });
      }
    }

    const groups = new Map<string, RawSeg[]>();
    const seen = new Set<string>();
    for (const seg of raw) {
      const dedupeKey = `${seg.pairKey}|${seg.relType}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      if (!groups.has(seg.pairKey)) groups.set(seg.pairKey, []);
      groups.get(seg.pairKey)!.push(seg);
    }

    const result: { x1: number; y1: number; x2: number; y2: number; relType: string; strength: number; dx: number; dy: number; labelT: number; labelDx: number; labelDy: number; d: string; id: string; sourceFactionId: string; targetFactionId: string; side: 'left' | 'right'; }[] = [];

    // Track which side each node pair uses for outer lines (alternating)
    const outerLineSideMap = new Map<string, 'left' | 'right'>();

    // Collect outer lines by side for horizontal offset assignment
    const leftOuterLines: Array<{ seg: typeof raw[0]; key: string }> = [];
    const rightOuterLines: Array<{ seg: typeof raw[0]; key: string }> = [];

    for (const segs of groups.values()) {
      for (const seg of segs) {
        const { nodeA, nodeB } = seg;
        const isAdjacent = Math.abs(nodeA.rowIdx - nodeB.rowIdx) === 1;
        
        if (!isAdjacent) {
          // Determine side for this pair
          const sideKey = seg.pairKey;
          let side: 'left' | 'right' = 'left';
          const existingSide = outerLineSideMap.get(sideKey);
          if (existingSide) {
            side = existingSide;
          } else {
            const existingSides = Array.from(outerLineSideMap.values());
            const leftCount = existingSides.filter(s => s === 'left').length;
            const rightCount = existingSides.filter(s => s === 'right').length;
            side = leftCount <= rightCount ? 'left' : 'right';
            outerLineSideMap.set(sideKey, side);
          }

          const key = `${nodeA.id}-${nodeB.id}-${seg.relType}`;
          if (side === 'left') {
            leftOuterLines.push({ seg, key });
          } else {
            rightOuterLines.push({ seg, key });
          }
        }
      }
    }

    // Assign unique horizontal offsets to each line on each side
    const baseOffset = 20;
    const offsetStep = 25;

    const leftLineOffsets = new Map<string, number>();
    leftOuterLines.forEach((item, index) => {
      leftLineOffsets.set(item.key, baseOffset + index * offsetStep);
    });

    const rightLineOffsets = new Map<string, number>();
    rightOuterLines.forEach((item, index) => {
      rightLineOffsets.set(item.key, baseOffset + index * offsetStep);
    });

    for (const segs of groups.values()) {
      const n = segs.length;
      const labelPositions = n === 1 ? [0.5] : Array.from({ length: n }, (_, i) => 0.3 + i * (0.4 / (n - 1)));

      for (let i = 0; i < n; i++) {
        const seg = segs[i];
        const { nodeA, nodeB } = seg;

        // Determine if factions are adjacent (rowIdx difference == 1)
        const isAdjacent = Math.abs(nodeA.rowIdx - nodeB.rowIdx) === 1;
        
        let x1: number, y1: number, x2: number, y2: number;
        let dx: number, dy: number;
        let d: string;
        let side: 'left' | 'right' = 'left';
        let yOffset: number = 0;

        if (isAdjacent) {
          // Inner lines: between adjacent faction cards
          // First line: 1/3 toward center from left side on x-axis
          // Second line: 2/3 toward right side from left side on x-axis
          const innerLineX = i === 0
            ? nodeA.x + nodeA.width / 3
            : nodeA.x + (nodeA.width * 2) / 3;

          x1 = innerLineX;
          x2 = innerLineX;

          // Lines should connect borders, not extend through centers
          if (nodeA.cy < nodeB.cy) {
            // nodeA is above nodeB
            y1 = nodeA.y + nodeA.height;
            y2 = nodeB.y;
          } else {
            // nodeA is below nodeB
            y1 = nodeA.y;
            y2 = nodeB.y + nodeB.height;
          }

          dx = 0;
          dy = 16; // Move labels down by 16px for inner lines (20px - 4px adjustment)
          d = `M ${x1},${y1} L ${x2},${y2}`;
        } else {
          // Outer lines: between non-adjacent faction cards
          // Use precomputed side from outerLineSideMap
          side = outerLineSideMap.get(seg.pairKey) || 'left';

          // Get horizontal offset for this segment
          const key = `${nodeA.id}-${nodeB.id}-${seg.relType}`;
          const offsetMap = side === 'left' ? leftLineOffsets : rightLineOffsets;
          const horizontalExtension = offsetMap.get(key) || baseOffset;

          // Bracket-shaped path: start at card edge, horizontal extension, vertical to target y, horizontal in to card edge
          const startX = side === 'left' ? nodeA.x : nodeA.x + nodeA.width;
          const endX = side === 'left' ? nodeB.x : nodeB.x + nodeB.width;
          const midX = side === 'left' ? startX - horizontalExtension : startX + horizontalExtension;
          const endMidX = side === 'left' ? endX - horizontalExtension : endX + horizontalExtension;

          y1 = nodeA.cy;
          y2 = nodeB.cy;

          // Set coordinates for label positioning (use the mid-vertical segment)
          x1 = midX;
          x2 = endMidX;

          dx = side === 'left' ? -horizontalExtension : horizontalExtension;
          dy = 0;

          d = `M ${startX},${y1} L ${midX},${y1} L ${endMidX},${y2} L ${endX},${y2}`;
        }

        result.push({
          x1, y1, x2, y2,
          relType: seg.relType,
          strength: seg.strength,
          dx, dy,
          labelT: labelPositions[i],
          labelDx: side === 'left' ? -4 : 4,
          labelDy: dy,
          d,
          id: `rel-${nodeA.id}-${nodeB.id}-${seg.relType}-${i}`,
          sourceFactionId: nodeA.id,
          targetFactionId: nodeB.id,
          side
        });
      }
    }
    return result;
  });

  
  private _viewBoxDims = computed<{ minX: number; minY: number; w: number; h: number }>(() => {
    const ns = this.nodes();
    if (!ns.length) return { minX: 0, minY: 0, w: 600, h: 400 };
    const minX = -PAD_RIGHT;
    const minY = Math.min(...ns.map(n => n.y)) - PAD_TOP;
    const maxX = Math.max(...ns.map(n => n.x + n.width)) + PAD_RIGHT;
    const maxY = Math.max(...ns.map(n => n.y + n.height)) + PAD_BOTTOM;
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
    if (p > 0) return 'rgb(255, 192, 220)'; // Good - rose/pink
    if (p < 0) return 'rgb(184, 216, 32)'; // Evil - acid yellow-green
    return '#a898c8'; // Neutral - original purple/lavender
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
    // Use faction alignment colors instead of relationship type colors
    switch (relType) {
      case 'allied':  return 'rgba(255, 192, 220, 0.7)';  // Good - rose/pink
      case 'rival':   return 'rgba(168, 152, 200, 0.7)';  // Neutral - original purple/lavender
      case 'enemy':   return 'rgba(184, 216, 32, 0.7)';   // Evil - acid yellow-green
      default:        return 'rgba(168, 152, 200, 0.5)';  // Default to neutral
    }
  }

  relDash(relType: string): string {
    switch (relType) {
      case 'allied':  return 'none';        // solid
      case 'rival':   return '0,8';         // 4px dots with 4px spacing (using round linecap)
      case 'enemy':   return '6,3,1,3';     // dash-dot
      case 'neutral': return '1,4';         // sparse dots
      default:        return 'none';
    }
  }

  relLabel(relType: string): string {
    return relType.charAt(0).toUpperCase() + relType.slice(1);
  }

  relLabelBox(seg: { x1: number; y1: number; x2: number; y2: number; dx: number; dy: number; labelT: number; labelDy: number; relType: string; side: 'left' | 'right' }): { x: number; y: number } {
    const rect    = this.relLabelRect(seg.relType);
    const connectorX2 = seg.x1; // Use the relationship line's horizontal extension point
    const labelCx = seg.side === 'left'
      ? connectorX2 - this.relLabelConnectorW - rect.w / 2
      : connectorX2 + this.relLabelConnectorW + rect.w / 2;
    const topY    = Math.min(seg.y1, seg.y2) + seg.dy;
    return { x: labelCx, y: topY };
  }

  relLabelConnector(seg: { x1: number; y1: number; x2: number; y2: number; dx: number; dy: number; labelT: number; labelDy: number; relType: string; side: 'left' | 'right' }): { x1: number; y1: number; x2: number; y2: number } {
    const connectorX2 = seg.x1; // Use the relationship line's horizontal extension point
    const topY  = Math.min(seg.y1, seg.y2) + seg.dy;
    return seg.side === 'left'
      ? { x1: connectorX2 - this.relLabelConnectorW, y1: topY, x2: connectorX2, y2: topY }
      : { x1: connectorX2, y1: topY, x2: connectorX2 + this.relLabelConnectorW, y2: topY };
  }

  readonly relLabelPadX = 12;   // px horizontal padding between border and text
  readonly relLabelPadY = 8;    // px vertical padding between border and text
  readonly relLabelFontSize = 6; // px
  readonly relLabelConnectorW = 20; // px connector from label right edge to the path
  relLabelRect(relType: string): { w: number; h: number } {
    const charW = this.relLabelFontSize * 0.9;
    const label = this.relLabel(relType);
    const extraW = relType === 'neutral' ? 8 : relType === 'enemy' ? 4 : 0;
    const w = label.length * charW + this.relLabelPadX * 2 + extraW;
    const h = this.relLabelFontSize + this.relLabelPadY * 2 + 1;
    return { w, h };
  }

  navigateToSublocation(sublocationId: string): void {
    const base = this.playerMode ? '/player/campaign' : '/campaign';
    this.router.navigate([base, this.campaignId, 'sublocations', sublocationId]);
  }

  private readonly NAME_FONT_SIZE = 11;
  private readonly NAME_CHAR_WIDTH = 0.6;
  private readonly ICON_OFFSET = 26;
  private readonly INFLUENCE_DOTS_WIDTH = 60;
  private readonly NODE_PADDING = 12;

  private calculateNodeWidth(name: string): number {
    const nameWidth = name.length * this.NAME_FONT_SIZE * this.NAME_CHAR_WIDTH;
    const contentWidth = this.ICON_OFFSET + nameWidth + this.INFLUENCE_DOTS_WIDTH;
    return Math.max(300, contentWidth + this.NODE_PADDING);
  }
}

