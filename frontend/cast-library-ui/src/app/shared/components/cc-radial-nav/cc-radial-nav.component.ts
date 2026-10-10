import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CcRadialNavItem {
  key: string;
  label: string;
  ariaLabel: string;
  angle: number; // degrees from top, clockwise
  icon?: string; // optional SVG icon path
  iconWidth?: number; // optional width for the icon
  iconHeight?: number; // optional height for the icon
}

interface CcRadialNavCell {
  key: string;
  path: string;
  ariaLabel: string;
  isCenter: boolean;
}

@Component({
  selector: 'app-cc-radial-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-radial-nav.component.html',
  styleUrl: './cc-radial-nav.component.scss',
})
export class CcRadialNavComponent {
  /** Currently selected grid area, used to highlight the active button. */
  activeArea = input<string>('middle-middle');

  /** Optional portal color override. */
  portalColor = input<string>('');

  /** Emits the grid-area key when any button is selected. */
  navigate = output<string>();

  /** Emits when the campaign chronicles arc button is pressed. */
  chronicles = output<void>();

  readonly centerKey = 'middle-middle';

  // Geometry (SVG user units, 500x500 space centered at 250,250)
  readonly centerX = 250;
  readonly centerY = 250;
  readonly centerRadius = 41.25;
  readonly itemRadius = 41.25;
  readonly itemDistance = 84.22;

  readonly items: CcRadialNavItem[] = [
    { key: 'bottom-right', label: 'Bot R', ariaLabel: 'Bottom Right', angle: 135 },
    { key: 'middle-right', label: 'Mid R', ariaLabel: 'Middle Right', angle: 90,
      icon: '/musical_instruments_grey.svg', iconWidth: 34, iconHeight: 29 },
    { key: 'top-right', label: 'Top R', ariaLabel: 'Top Right', angle: 45,
      icon: '/player_icon.svg', iconWidth: 32, iconHeight: 32 },
    { key: 'top-middle', label: 'Top M', ariaLabel: 'Top Middle', angle: 0,
      icon: '/hourglass_passing_time.svg', iconWidth: 32, iconHeight: 32 },
    { key: 'top-left', label: 'Top L', ariaLabel: 'Top Left', angle: 315,
      icon: '/storyline.svg', iconWidth: 32, iconHeight: 32 },
    { key: 'middle-left', label: 'Mid L', ariaLabel: 'Middle Left', angle: 270,
      icon: '/factions.svg', iconWidth: 38, iconHeight: 38 },
    { key: 'bottom-left', label: 'Bot L', ariaLabel: 'Bottom Left', angle: 225 },
    { key: 'bottom-middle', label: 'Bot M', ariaLabel: 'Bottom Middle', angle: 180 }
  ];

  onSelect(key: string) {
    this.navigate.emit(key);
  }

  onCenter() {
    this.navigate.emit(this.centerKey);
  }

  onChronicles() {
    this.chronicles.emit();
  }

  get centerPath(): string {
    return this.circlePath(this.centerX, this.centerY, this.centerRadius);
  }

  get cells(): CcRadialNavCell[] {
    const center: CcRadialNavCell = {
      key: this.centerKey,
      path: this.centerPath,
      ariaLabel: 'Middle Middle',
      isCenter: true
    };
    const surrounding: CcRadialNavCell[] = this.items.map((item) => ({
      key: item.key,
      path: this.getItemPath(item),
      ariaLabel: item.ariaLabel,
      isCenter: false
    }));
    const all = [center, ...surrounding];
    const activeIndex = all.findIndex((cell) => cell.key === this.activeArea());
    if (activeIndex > -1) {
      const [activeCell] = all.splice(activeIndex, 1);
      all.push(activeCell);
    }
    return all;
  }

  trackCell(index: number, cell: CcRadialNavCell): string {
    return cell.key;
  }

  getItemPath(item: CcRadialNavItem): string {
    return this.sectorPath(
      this.centerX,
      this.centerY,
      this.centerRadius,
      this.itemDistance + this.itemRadius,
      item.angle
    );
  }

  getItemCenter(angle: number): { x: number; y: number } {
    const radians = (angle - 90) * (Math.PI / 180); // -90 to start from top
    return {
      x: this.centerX + Math.cos(radians) * this.itemDistance,
      y: this.centerY + Math.sin(radians) * this.itemDistance
    };
  }

  getSectorIconTransform(angle: number): { x: number; y: number } {
    return this.getItemCenter(angle);
  }

  private circlePath(cx: number, cy: number, r: number): string {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  }

  private sectorPath(
    cx: number,
    cy: number,
    innerRadius: number,
    outerRadius: number,
    angleDeg: number,
    spanDeg = 45
  ): string {
    const startRad = (angleDeg - spanDeg / 2 - 90) * (Math.PI / 180);
    const endRad = (angleDeg + spanDeg / 2 - 90) * (Math.PI / 180);

    const point = (r: number, rad: number) => ({
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    });

    const innerStart = point(innerRadius, startRad);
    const outerStart = point(outerRadius, startRad);
    const outerEnd = point(outerRadius, endRad);
    const innerEnd = point(innerRadius, endRad);

    return [
      `M ${innerStart.x} ${innerStart.y}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
      'Z'
    ].join(' ');
  }

  getIconDimensions(item: CcRadialNavItem): { width: number; height: number } {
    return {
      width: item.iconWidth || 44,
      height: item.iconHeight || 44
    };
  }
}
