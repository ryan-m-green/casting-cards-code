import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignCastRelationship } from '../../../shared/models/campaign.model';

interface WebNode {
  cast: CampaignCastInstance;
  relationship: CampaignCastRelationship;
  x: number;
  y: number;
  pathD: string;
  textX: number;
  textY: number;
}

@Component({
  selector: 'app-relationship-web-modal',
  standalone: true,
  imports: [CommonModule, CardFlipComponent],
  templateUrl: './relationship-web-modal.component.html',
  styleUrl: './relationship-web-modal.component.scss',
})
export class RelationshipWebModalComponent {
  @Input() mainCast!: CampaignCastInstance;
  @Input() allCast: CampaignCastInstance[] = [];
  @Input() relationships: CampaignCastRelationship[] = [];
  @Output() closed = new EventEmitter<void>();

  readonly canvasW = 800;
  readonly canvasH = 580;
  readonly cx      = 400;
  readonly cy      = 290;
  readonly orbit   = 160;

  get nodes(): WebNode[] {
    if (!this.mainCast) return [];

    const rels = this.relationships.filter(r =>
      r.sourceCastInstanceId === this.mainCast.instanceId && r.value !== 0
    );
    const count = rels.length;
    if (count === 0) return [];

    const startAngle = -Math.PI / 2;
    const step = count === 1 ? 0 : (2 * Math.PI) / count;

    return rels
      .map((rel, i) => {
        const cast = this.allCast.find(c => c.instanceId === rel.targetCastInstanceId);
        if (!cast) return null;

        const angle = startAngle + step * i;
        const nx = this.cx + Math.cos(angle) * this.orbit;
        const ny = this.cy + Math.sin(angle) * this.orbit;

        // Quadratic bezier control point: perpendicular offset for gentle arc
        const mx = (this.cx + nx) / 2;
        const my = (this.cy + ny) / 2;
        const dx = nx - this.cx;
        const dy = ny - this.cy;
        const len = Math.hypot(dx, dy) || 1;
        const cpx = mx + (-dy / len) * 36;
        const cpy = my + (dx / len) * 36;

        // Text midpoint at t=0.5 along the bezier: 0.25*P0 + 0.5*P1 + 0.25*P2
        const textX = 0.25 * this.cx + 0.5 * cpx + 0.25 * nx;
        const textY = 0.25 * this.cy + 0.5 * cpy + 0.25 * ny;

        return {
          cast,
          relationship: rel,
          x: nx,
          y: ny,
          pathD: `M ${this.cx} ${this.cy} Q ${cpx} ${cpy} ${nx} ${ny}`,
          textX,
          textY,
        };
      })
      .filter((n): n is WebNode => n !== null);
  }

  lineStroke(value: number): string {
    return value > 0 ? '#4a9060' : '#9a3030';
  }

  lineWidth(value: number): number {
    return 1.5 + Math.abs(value) * 0.55;
  }

  truncate(text: string | null, max = 30): string {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  }

  raceIcon(race: string): string {
    const map: Record<string, string> = {
      human: '👤', elf: '🧝', dwarf: '⛏️', halfling: '🌱',
      gnome: '🔧', 'half-orc': '⚔️', orc: '🪓', tiefling: '😈',
      dragonborn: '🐉', aasimar: '👼',
    };
    return map[race?.toLowerCase()] ?? '🎭';
  }

  sentimentLabel(value: number): string {
    const abs = Math.abs(value);
    const sign = value > 0 ? '+' : '';
    if (abs >= 4) return `${sign}${value} · ${value > 0 ? 'Devoted' : 'Despises'}`;
    if (abs >= 2) return `${sign}${value} · ${value > 0 ? 'Friendly' : 'Hostile'}`;
    return `${sign}${value} · ${value > 0 ? 'Warm' : 'Cold'}`;
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('web-backdrop')) {
      this.closed.emit();
    }
  }
}
