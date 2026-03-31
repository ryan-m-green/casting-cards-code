import { Injectable } from '@angular/core';

const SPARK_COLORS = [
  '#C8A030', // Ember Gold
  '#7A54C0', // Arcane Indigo
  '#D4C0FF', // Lavender
  '#E8A820', // Bright Amber
  '#FFF0D0', // Warm White
];

@Injectable({ providedIn: 'root' })
export class SparkleService {
  trigger(host: HTMLElement): void {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360 + Math.random() * (360 / count);
      const rad   = angle * (Math.PI / 180);
      const dist  = 56 + Math.random() * 64;
      const dx    = Math.round(Math.cos(rad) * dist);
      const dy    = Math.round(Math.sin(rad) * dist);
      const color = SPARK_COLORS[i % SPARK_COLORS.length];
      const delay = Math.random() * 80;

      const spark = document.createElement('div');
      spark.className = 'knock-spark';
      spark.style.setProperty('--dx', `${dx}px`);
      spark.style.setProperty('--dy', `${dy}px`);
      spark.style.setProperty('--color', color);
      spark.style.animationDelay = `${delay}ms`;

      host.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
    }
  }
}
