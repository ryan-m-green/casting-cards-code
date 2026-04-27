import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PortalTransitionService {
  readonly active   = signal(false);
  readonly instant  = signal(false);
  originRect: DOMRect | null = null;

  private _ghostTemplate: HTMLElement | null = null;
  get ghostTemplate(): HTMLElement | null {
    if (this._ghostTemplate) return this._ghostTemplate;
    const html = sessionStorage.getItem('portalGhostTemplate');
    if (!html) return null;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    return wrap.firstElementChild as HTMLElement | null;
  }
  set ghostTemplate(value: HTMLElement | null) {
    this._ghostTemplate = value;
    if (value) {
      sessionStorage.setItem('portalGhostTemplate', value.outerHTML);
    } else {
      sessionStorage.removeItem('portalGhostTemplate');
    }
  }

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

      if (ghost) {
        const ghostW = originRect?.width  || 170;
        const ghostH = originRect?.height || 240;

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
        const ghostW = 150;
        const ghostH = 220;

        // Outer frame — replicates .card-wrap + .c-frame.frame-portal inline
        const exitGhost = document.createElement('div');
        Object.assign(exitGhost.style, {
          position:     'fixed',
          top:          (vh / 2 - ghostH / 2) + 'px',
          left:         (vw / 2 - ghostW / 2) + 'px',
          width:        ghostW + 'px',
          height:       ghostH + 'px',
          zIndex:       '9000',
          pointerEvents:'none',
          opacity:      '1',
          transform:    'scale(30)',
          transition:   'none',
          willChange:   'transform, opacity',
          margin:       '0',
          borderRadius: '12px',
          padding:      '6px',
          boxSizing:    'border-box',
          background:   'linear-gradient(145deg, #2c1a60 0%, #1a0e40 30%, #0c0828 60%, #261860 100%)',
          boxShadow:    `0 0 0 1px #0a0620, 0 10px 36px rgba(0,0,0,0.8), 0 0 32px ${color}55, inset 0 1px 0 ${color}33`,
        });

        // Inner dark area — replicates .c-inner.inner-portal
        const inner = document.createElement('div');
        Object.assign(inner.style, {
          width:         '100%',
          height:        '100%',
          borderRadius:  '8px',
          background:    'radial-gradient(ellipse at 50% 45%, #0e0830 0%, #060418 100%)',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          boxSizing:     'border-box',
          overflow:      'hidden',
        });

        // Oval container — replicates .portal-oval-area + .portal-oval-outer
        const ovalArea = document.createElement('div');
        Object.assign(ovalArea.style, {
          flex:           '1',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        });

        const ovalOuter = document.createElement('div');
        Object.assign(ovalOuter.style, {
          position: 'relative',
          width:    '72px',
          height:   '100px',
        });

        // Glow — replicates .portal-oval-glow
        const ovalGlow = document.createElement('div');
        Object.assign(ovalGlow.style, {
          position:     'absolute',
          top:          '-2px',
          right:        '-2px',
          bottom:       '-2px',
          left:         '-2px',
          borderRadius: '50%',
          background:   color,
          filter:       'blur(1px)',
          opacity:      '0.55',
        });

        // Ring — replicates .portal-oval-ring
        const ovalRing = document.createElement('div');
        Object.assign(ovalRing.style, {
          position:     'absolute',
          top:          '0',
          right:        '0',
          bottom:       '0',
          left:         '0',
          borderRadius: '50%',
          border:       '3px solid rgba(255,255,255,0.22)',
          boxShadow:    `0 0 18px ${color}, 0 0 40px ${color}80`,
        });

        // Inner void — replicates .portal-oval-inner
        const ovalInner = document.createElement('div');
        Object.assign(ovalInner.style, {
          position:     'absolute',
          top:          '5px',
          right:        '5px',
          bottom:       '5px',
          left:         '5px',
          borderRadius: '50%',
          background:   'radial-gradient(ellipse at 38% 32%, #0d1838 0%, #04060e 100%)',
          boxShadow:    `inset 0 0 12px 20px ${color}22`,
        });

        ovalOuter.append(ovalGlow, ovalRing, ovalInner);
        ovalArea.appendChild(ovalOuter);

        // Footer — replicates .portal-footer-strip
        const footer = document.createElement('div');
        Object.assign(footer.style, {
          padding:       '4px 10px',
          textAlign:     'center',
          fontFamily:    'inherit',
          fontSize:      '7px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color:         `${color}99`,
          borderTop:     `1px solid ${color}33`,
        });
        footer.textContent = 'Enter';

        inner.append(ovalArea, footer);
        exitGhost.appendChild(inner);

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
