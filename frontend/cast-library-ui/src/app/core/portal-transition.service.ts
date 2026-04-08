import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PortalTransitionService {
  readonly active   = signal(false);
  readonly instant  = signal(false);
  originRect: DOMRect | null = null;
  ghostTemplate: HTMLElement | null = null;

  get spineColor(): string {
    return sessionStorage.getItem('portalSpineColor') ?? '#6e28d0';
  }
  set spineColor(value: string) {
    sessionStorage.setItem('portalSpineColor', value);
  }

  show()        { this.active.set(true); }
  hide()        { this.instant.set(false); this.active.set(false); }
  quickCover()  { this.instant.set(true);  this.active.set(true); }

  exitToLibrary(navigate: () => void): void {
    const originRect = this.originRect;
    const template   = this.ghostTemplate;

    this.show();

    setTimeout(() => {
      navigate();

      const ghost = template?.cloneNode(true) as HTMLElement | null;
      const vw    = window.innerWidth;
      const vh    = window.innerHeight;

      if (originRect && ghost) {
        const ghostW = originRect.width  || 170;
        const ghostH = originRect.height || 240;

        Object.assign(ghost.style, {
          position:      'fixed',
          top:           (vh / 2 - ghostH / 2) + 'px',
          left:          (vw / 2 - ghostW / 2) + 'px',
          width:         ghostW + 'px',
          height:        ghostH + 'px',
          margin:        '0',
          zIndex:        '9000',
          pointerEvents: 'none',
          opacity:       '1',
          transition:    'none',
          willChange:    'transform, opacity',
          transform:     'scale(30)',
        });
        document.body.appendChild(ghost);
        void ghost.offsetWidth;

        ghost.style.transition = 'transform 2s cubic-bezier(0.2,0,0.6,1), opacity 0.5s ease 1.8s';
        ghost.style.transform  = 'scale(1)';
        ghost.style.opacity    = '0';
        this.hide();

        setTimeout(() => this.spawnExitSparks(vw / 2, vh / 2), 1800);
        setTimeout(() => ghost.remove(), 2500);
      } else {
        const color  = this.spineColor || '#6e28d0';
        const ghostW = 170;
        const ghostH = 240;

        const exitGhost = document.createElement('div');
        Object.assign(exitGhost.style, {
          position:       'fixed',
          top:            (vh / 2 - ghostH / 2) + 'px',
          left:           (vw / 2 - ghostW / 2) + 'px',
          width:          ghostW + 'px',
          height:         ghostH + 'px',
          zIndex:         '9000',
          pointerEvents:  'none',
          borderRadius:   '10px',
          background:     'radial-gradient(ellipse at 50% 20%, #1c0e30 0%, #0c0618 50%, #050209 100%)',
          border:         `1px solid ${color}55`,
          boxShadow:      `0 4px 20px rgba(0,0,0,0.75), 0 0 22px ${color}22`,
          overflow:       'hidden',
          opacity:        '1',
          transform:      'scale(30)',
          transition:     'none',
          willChange:     'transform, opacity',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        });

        const oval = document.createElement('div');
        Object.assign(oval.style, {
          width:        '76px',
          height:       '118px',
          borderRadius: '50%',
          flexShrink:   '0',
          background:   'radial-gradient(ellipse at 40% 35%, #0e1f45 0%, #07122a 40%, #030a18 70%, #010308 100%)',
          boxShadow:    [
            '0 0 0 2px rgba(255,255,255,0.82)',
            `0 0 12px 6px ${color}b3`,
            `0 0 26px 10px ${color}7a`,
            `0 0 48px 16px ${color}4d`,
          ].join(', '),
        });
        exitGhost.appendChild(oval);
        document.body.appendChild(exitGhost);
        void exitGhost.offsetWidth;

        exitGhost.style.transition = 'transform 2s cubic-bezier(0.2,0,0.6,1), opacity 0.5s ease 1.8s';
        exitGhost.style.transform  = 'scale(1)';
        exitGhost.style.opacity    = '0';
        this.hide();

        setTimeout(() => this.spawnExitSparks(vw / 2, vh / 2), 1800);
        setTimeout(() => exitGhost.remove(), 2500);
      }
    }, 1600);
  }

  private spawnExitSparks(cx: number, cy: number) {
    const color = this.spineColor || '#6e28d0';
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * 2 * Math.PI + Math.random() * 0.5;
      const dist  = 60 + Math.random() * 80;
      const size  = 4 + Math.random() * 5;
      const sp    = document.createElement('div');
      Object.assign(sp.style, {
        position:      'fixed',
        width:         size + 'px',
        height:        size + 'px',
        borderRadius:  '50%',
        background:    color,
        boxShadow:     `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}, 0 0 ${size * 12}px ${color}`,
        left:          (cx - size / 2) + 'px',
        top:           (cy - size / 2) + 'px',
        zIndex:        '9002',
        pointerEvents: 'none',
        opacity:       '1',
        transition:    'transform 2500ms ease-out, opacity 2500ms ease-out',
      });
      document.body.appendChild(sp);
      void sp.offsetWidth;
      sp.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
      sp.style.opacity   = '0';
      setTimeout(() => sp.remove(), 2600);
    }
  }
}
