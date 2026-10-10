import { Component } from '@angular/core';

let nextCrossId = 0;

interface BloodDrip {
  x: number;
  y: number;
  length: number;
  width: number;
}

const at = (value: number) => Math.round(value * 10) / 10;

@Component({
  selector: 'cc-bloodied-cross',
  standalone: true,
  templateUrl: './cc-bloodied-cross.component.html',
  styleUrl: './cc-bloodied-cross.component.scss'
})
export class CcBloodiedCrossComponent {
  readonly crossId = `bloodied-cross-${nextCrossId++}`;
  readonly bloodSoakFilter = `url(#${this.crossId}-soak)`;
  readonly bloodPaintFilter = `url(#${this.crossId}-paint)`;
  readonly bloodRed = `url(#${this.crossId}-red)`;

  readonly bloodDrips: readonly BloodDrip[] = [
    { x: 29,  y: 40,  length: 13, width: 4.6 },
    { x: 55,  y: 80,  length: 21, width: 5.2 },
    { x: 82,  y: 120, length: 10, width: 4.2 },
    { x: 114, y: 169, length: 16, width: 5.0 },
    { x: 131, y: 195, length: 9,  width: 3.8 },
    { x: 112, y: 53,  length: 14, width: 4.8 },
    { x: 79,  y: 104, length: 11, width: 4.4 },
    { x: 47,  y: 153, length: 19, width: 5.4 },
    { x: 25,  y: 187, length: 10, width: 4.0 },
  ];

  dripPath(drip: BloodDrip): string {
    const half = drip.width / 2;
    const tip = drip.y + drip.length;
    const waist = drip.y + drip.length * 0.5;

    return [
      `M ${at(drip.x - half)} ${at(drip.y)}`,
      `C ${at(drip.x - half - 1)} ${at(waist)}, ${at(drip.x - 1.2)} ${at(tip - 2)}, ${at(drip.x)} ${at(tip)}`,
      `C ${at(drip.x + 1.2)} ${at(tip - 2)}, ${at(drip.x + half + 1)} ${at(waist)}, ${at(drip.x + half)} ${at(drip.y)}`,
      'Z',
    ].join(' ');
  }
}
