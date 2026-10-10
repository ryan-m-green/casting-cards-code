import { Component } from '@angular/core';

/** Each cross needs its own filter ids: an SVG filter id must be unique in the page. */
let nextCrossId = 0;

/** One drop of blood running off the cross: where it starts, and how far it falls. */
interface BloodDrip {
  /** Where the drop leaves its stroke, in the cross's own 150×220 box. */
  x: number;
  y: number;
  /** How far below the stroke the drop runs. */
  length: number;
  /** How wide the drop is where it leaves the stroke. */
  width: number;
}

/** Trims a path coordinate to a tenth of a pixel, so the drawn path stays readable. */
const at = (value: number) => Math.round(value * 10) / 10;

/**
 * cc-bloodied-cross
 *
 * The cross a defeated card is painted with: a band of blood from one inside corner
 * of the card to the one opposite, twice over, with drops running off them. It is
 * drawn in the card's own 150×220 box and stretched to the box it is given, so a
 * card of any size gets a cross that fits it (the small ring cards and the full
 * drawer cards are the same shape, so nothing is distorted).
 *
 * The card places it: the cross fills the card, sits over both faces, lets the
 * pointer through, and is clipped to the card's corners by the radius the card sets
 * on it. The card draws it only while the card is down — see `app-cast-card`
 * (and the campaign deck's own copy, `cc-cast-card`) and `cc-simple-cast-card`.
 */
@Component({
  selector: 'cc-bloodied-cross',
  standalone: true,
  templateUrl: './cc-bloodied-cross.component.html',
  styleUrl: './cc-bloodied-cross.component.scss'
})
export class CcBloodiedCrossComponent {
  /** This cross's own filter and paint ids (an SVG filter id has to be unique). */
  readonly crossId = `bloodied-cross-${nextCrossId++}`;
  /** The blood soaked into the card: the band's own shape, spread and softened under it. */
  readonly bloodSoakFilter = `url(#${this.crossId}-soak)`;
  /** The band's edges pushed about, so it reads as painted on rather than ruled. */
  readonly bloodPaintFilter = `url(#${this.crossId}-paint)`;
  /** The blood red itself, pooled darker towards the card's corners. */
  readonly bloodRed = `url(#${this.crossId}-red)`;

  /**
   * Where blood runs off the cross. The two strokes run between the card's inside
   * corners — from (9, 9) to (141, 211) and from (141, 9) to (9, 211) in the card's
   * own 150×220 box — so every drop starts on one of those lines, hangs straight
   * down the card, and is sized like something that ran there rather than was placed.
   */
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

  /** One hanging drop: a teardrop that leaves its stroke and runs to a rounded tip. */
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
