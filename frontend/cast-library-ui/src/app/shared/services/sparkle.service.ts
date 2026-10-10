import { Injectable } from '@angular/core';

const SPARK_COLORS = [
  '#C8A030',
  '#E8A820',
  '#FFF0D0',
  '#FFD700',
  '#FFEC8B',
];

@Injectable({ providedIn: 'root' })
export class SparkleService {
  trigger(host: HTMLElement, colors: string[] = SPARK_COLORS, count = 30): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360 + Math.random() * (360 / count);
      const rad   = angle * (Math.PI / 180);
      const dist  = 56 + Math.random() * 64;
      const dx    = Math.round(Math.cos(rad) * dist);
      const dy    = Math.round(Math.sin(rad) * dist);
      const color = colors[i % colors.length];
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

  triggerSparkler(host: HTMLElement, colors: string[] = SPARK_COLORS): void {
    const spark = document.createElement('div');
    spark.className = 'sparkler-drip';

    const pattern = Math.floor(Math.random() * 3);
    
    const hx = pattern === 0 ? 0 : 5 + Math.random() * 5;
    const hd = pattern === 1 ? -1 : (pattern === 2 ? 1 : 0);
    const dy = 200 + Math.random() * 100;
    const color = colors[Math.floor(Math.random() * colors.length)];

    spark.style.setProperty('--hx', `${hx}px`);
    spark.style.setProperty('--hd', `${hd}`);
    spark.style.setProperty('--dy', `${dy}px`);
    spark.style.setProperty('--color', color);

    host.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
  }

  triggerEdge(container: HTMLElement, points = 7): void {
    const rect = container.getBoundingClientRect();
    for (let p = 0; p < points; p++) {
      const xFrac = (p + 0.5) / points;
      const delay = p * 40 + Math.random() * 25;
      setTimeout(() => {
        const anchor = document.createElement('div');
        Object.assign(anchor.style, {
          position:      'fixed',
          top:           `${rect.top}px`,
          left:          `${rect.left + rect.width * xFrac}px`,
          width:         '2px',
          height:        '2px',
          pointerEvents: 'none',
          overflow:      'visible',
        });
        document.body.appendChild(anchor);
        this.trigger(anchor);
        setTimeout(() => anchor.remove(), 750);
      }, delay);
    }
  }
}
