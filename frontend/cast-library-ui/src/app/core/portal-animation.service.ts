import { Injectable, signal } from '@angular/core';

export interface PortalAnimationConfig {
  card: HTMLElement;
  id: string;
  spineColor: string;
  routePrefix: string;
  onNavigate?: (routePrefix: string, id: string) => void;
  enableNavigation?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PortalAnimationService {
  readonly active   = signal(false);
  readonly instant  = signal(false);
  readonly noFade   = signal(false);
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

  private _safetyTimer: ReturnType<typeof setTimeout> | null = null;

  show() {
    this.noFade.set(false);
    this.active.set(true);
    this._resetSafetyTimer();
  }

  hide() {
    if (this._safetyTimer) { clearTimeout(this._safetyTimer); this._safetyTimer = null; }
    this.instant.set(false);
    this.noFade.set(false);
    this.active.set(false);
  }

  hideNow() {
    if (this._safetyTimer) { clearTimeout(this._safetyTimer); this._safetyTimer = null; }
    this.instant.set(false);
    this.noFade.set(true);
    this.active.set(false);
  }

  quickCover() {
    this.noFade.set(false);
    this.instant.set(true);
    this.active.set(true);
    this._resetSafetyTimer();
  }

  private _resetSafetyTimer() {
    if (this._safetyTimer) clearTimeout(this._safetyTimer);
    this._safetyTimer = setTimeout(() => this.hide(), 8000);
  }

  exitToLibrary(navigate: () => void): void {
    this.quickCover();
    navigate();
  }

  private safeColor(color: string): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  enter(config: PortalAnimationConfig): void {
    const { card, id, spineColor, routePrefix, onNavigate, enableNavigation = true } = config;
    const ghostW = card.offsetWidth || 170;
    const ghostH = card.offsetHeight || 240;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const color = this.safeColor(spineColor);

    const ghost = card.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      width: ghostW + 'px',
      margin: '0',
      overflow: 'visible',
      zIndex: '9000',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'none',
      willChange: 'transform, opacity',
      visibility: 'hidden',
    });
    document.body.appendChild(ghost);
    void ghost.offsetWidth;

    const actualW = ghost.offsetWidth || ghostW;
    const actualH = ghost.offsetHeight || ghostH;

    ghost.style.top = (cy - actualH / 2) + 'px';
    ghost.style.left = (cx - actualW / 2) + 'px';
    ghost.style.transform = 'scale(0.4) rotate(-3deg)';
    ghost.style.visibility = '';

    const innerPortal = ghost.querySelector('.portal-oval-inner') as HTMLElement;
    if (innerPortal) {
      innerPortal.style.background = '#000';
      innerPortal.style.boxShadow = 'none';
      innerPortal.style.inset = '0';
    }

    this.ghostTemplate = ghost.cloneNode(true) as HTMLElement;
    this.originRect = null;
    this.spineColor = color;

    const sparks: HTMLElement[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * 2 * Math.PI + Math.random() * 0.5;
      const dist = 80 + Math.random() * 80;
      const size = 5 + Math.random() * 6;
      const startX = cx + Math.cos(angle) * dist;
      const startY = cy + Math.sin(angle) * dist;
      const sp = document.createElement('div');
      Object.assign(sp.style, {
        position: 'fixed',
        width: size + 'px',
        height: size + 'px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}, 0 0 ${size * 12}px ${color}`,
        left: (startX - size / 2) + 'px',
        top: (startY - size / 2) + 'px',
        zIndex: '9001',
        pointerEvents: 'none',
        opacity: '1',
        willChange: 'transform, opacity',
      });
      document.body.appendChild(sp);
      sparks.push(sp);
    }

    void ghost.offsetWidth;

    const sparkAnimations = sparks.map(sp => {
      const dx = cx - parseFloat(sp.style.left) - parseFloat(sp.style.width) / 2;
      const dy = cy - parseFloat(sp.style.top) - parseFloat(sp.style.height) / 2;
      return sp.animate([
        { transform: 'translate(0, 0)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 }
      ], {
        duration: 600,
        easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        fill: 'forwards'
      });
    });

    const entryAnimation = ghost.animate([
      { transform: 'scale(0.3) rotate(-3deg)', opacity: 0 },
      { transform: 'scale(1.05) rotate(1deg)', opacity: 1 },
      { transform: 'scale(1.0) rotate(0deg)', opacity: 1 }
    ], {
      duration: 500,
      easing: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
      fill: 'forwards'
    });

    entryAnimation.finished.then(() => {
      let hasTriggeredOverlay = false;
      const triggerTime = 400;

      const zoomAnimation = ghost.animate([
        { transform: 'scale(1.0)' },
        { transform: 'scale(100)' }
      ], {
        duration: 2100,
        easing: 'cubic-bezier(0.4, 0, 0.8, 1)',
        fill: 'forwards'
      });

      const startTime = performance.now();

      const checkProgress = () => {
        const elapsed = performance.now() - startTime;
        if (elapsed >= triggerTime && !hasTriggeredOverlay) {
          this.quickCover();
          hasTriggeredOverlay = true;
        }

        if (elapsed < 2100) {
          requestAnimationFrame(checkProgress);
        }
      };

      requestAnimationFrame(checkProgress);

      setTimeout(() => {
        if (enableNavigation) {
          if (onNavigate) {
            onNavigate(routePrefix, id);
          }
        }
      }, 1200);

      zoomAnimation.finished.then(() => {
        ghost.remove();
        sparks.forEach(s => s.remove());
      });
    });
  }

  exit(navigate: () => void): void {
    const originRect = this.originRect;
    const template = this.ghostTemplate;

    this.show();

    setTimeout(() => {
      navigate();

      const ghost = template?.cloneNode(true) as HTMLElement | null;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (ghost) {
        const ghostW = originRect?.width || 170;
        const ghostH = originRect?.height || 240;

        Object.assign(ghost.style, {
          position: 'fixed',
          top: (vh / 2 - ghostH / 2) + 'px',
          left: (vw / 2 - ghostW / 2) + 'px',
          width: ghostW + 'px',
          height: ghostH + 'px',
          margin: '0',
          zIndex: '9000',
          pointerEvents: 'none',
          opacity: '1',
          transition: 'none',
          willChange: 'transform, opacity',
          transform: 'scale(80) rotate(3deg)',
        });
        document.body.appendChild(ghost);
        void ghost.offsetWidth;

        let hasHiddenOverlay = false;
        const triggerTime = 1700;

        const zoomAnimation = ghost.animate([
          { transform: 'scale(80) rotate(3deg)' },
          { transform: 'scale(0.1) rotate(-3deg)' }
        ], {
          duration: 2100,
          easing: 'cubic-bezier(0.4, 0, 0.8, 1)',
          fill: 'forwards'
        });

        const startTime = performance.now();

        const checkProgress = () => {
          const elapsed = performance.now() - startTime;
          if (elapsed >= triggerTime && !hasHiddenOverlay) {
            this.hide();
            hasHiddenOverlay = true;
          }

          if (elapsed < 2100) {
            requestAnimationFrame(checkProgress);
          }
        };

        requestAnimationFrame(checkProgress);

        zoomAnimation.finished.then(() => {
          ghost.remove();
          this.spawnExitSparks(vw / 2, vh / 2);
        });
      } else {
        const color = this.spineColor || '#6e28d0';
        const ghostW = 150;
        const ghostH = 220;

        const exitGhost = document.createElement('div');
        Object.assign(exitGhost.style, {
          position: 'fixed',
          top: (vh / 2 - ghostH / 2) + 'px',
          left: (vw / 2 - ghostW / 2) + 'px',
          width: ghostW + 'px',
          height: ghostH + 'px',
          zIndex: '9000',
          pointerEvents: 'none',
          opacity: '1',
          transform: 'scale(80) rotate(3deg)',
          transition: 'none',
          willChange: 'transform, opacity',
          margin: '0',
          borderRadius: '12px',
          padding: '6px',
          boxSizing: 'border-box',
          background: 'linear-gradient(145deg, #2c1a60 0%, #1a0e40 30%, #0c0828 60%, #261860 100%)',
          boxShadow: `0 0 0 1px #0a0620, 0 10px 36px rgba(0,0,0,0.8), 0 0 32px ${color}55, inset 0 1px 0 ${color}33`,
        });

        const inner = document.createElement('div');
        Object.assign(inner.style, {
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          background: 'radial-gradient(ellipse at 50% 45%, #0e0830 0%, #060418 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          overflow: 'hidden',
        });

        const ovalArea = document.createElement('div');
        Object.assign(ovalArea.style, {
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        });

        const ovalOuter = document.createElement('div');
        Object.assign(ovalOuter.style, {
          position: 'relative',
          width: '72px',
          height: '100px',
        });

        const ovalGlow = document.createElement('div');
        Object.assign(ovalGlow.style, {
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          bottom: '-2px',
          left: '-2px',
          borderRadius: '50%',
          background: color,
          filter: 'blur(1px)',
          opacity: '0.55',
        });

        const ovalRing = document.createElement('div');
        Object.assign(ovalRing.style, {
          position: 'absolute',
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255,0.22)',
          boxShadow: `0 0 18px ${color}, 0 0 40px ${color}80`,
        });

        const ovalInner = document.createElement('div');
        Object.assign(ovalInner.style, {
          position: 'absolute',
          top: '5px',
          right: '5px',
          bottom: '5px',
          left: '5px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 38% 32%, #0d1838 0%, #04060e 100%)',
          boxShadow: `inset 0 0 12px 20px ${color}22`,
        });

        ovalOuter.append(ovalGlow, ovalRing, ovalInner);
        ovalArea.appendChild(ovalOuter);

        const footer = document.createElement('div');
        Object.assign(footer.style, {
          padding: '4px 10px',
          textAlign: 'center',
          fontFamily: 'inherit',
          fontSize: '7px',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: `${color}99`,
          borderTop: `1px solid ${color}33`,
        });
        footer.textContent = 'Enter';

        inner.append(ovalArea, footer);
        exitGhost.appendChild(inner);

        document.body.appendChild(exitGhost);
        void exitGhost.offsetWidth;

        let hasHiddenOverlay = false;
        const triggerTime = 1700;

        const zoomAnimation = exitGhost.animate([
          { transform: 'scale(100) rotate(3deg)' },
          { transform: 'scale(0.1) rotate(-3deg)' }
        ], {
          duration: 2100,
          easing: 'cubic-bezier(0.4, 0, 0.8, 1)',
          fill: 'forwards'
        });

        const startTime = performance.now();

        const checkProgress = () => {
          const elapsed = performance.now() - startTime;
          if (elapsed >= triggerTime && !hasHiddenOverlay) {
            this.hide();
            hasHiddenOverlay = true;
          }

          if (elapsed < 2100) {
            requestAnimationFrame(checkProgress);
          }
        };

        requestAnimationFrame(checkProgress);

        zoomAnimation.finished.then(() => {
          exitGhost.remove();
          this.spawnExitSparks(vw / 2, vh / 2);
        });
      }
    }, 1000);
  }

  private spawnExitSparks(cx: number, cy: number) {
    const color = this.spineColor || '#6e28d0';
    const sparks: HTMLElement[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * 2 * Math.PI + Math.random() * 0.5;
      const dist = 60 + Math.random() * 80;
      const size = 4 + Math.random() * 5;
      const sp = document.createElement('div');
      Object.assign(sp.style, {
        position: 'fixed',
        width: size + 'px',
        height: size + 'px',
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}, 0 0 ${size * 12}px ${color}`,
        left: (cx - size / 2) + 'px',
        top: (cy - size / 2) + 'px',
        zIndex: '9001',
        pointerEvents: 'none',
        opacity: '1',
        willChange: 'transform, opacity',
      });
      document.body.appendChild(sp);
      sparks.push(sp);
    }

    sparks.forEach(sp => {
      const angle = Math.random() * 2 * Math.PI;
      const dist = 60 + Math.random() * 80;
      sp.animate([
        { transform: 'translate(0, 0)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`, opacity: 0 }
      ], {
        duration: 1200,
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
        fill: 'forwards'
      }).finished.then(() => sp.remove());
    });
  }
}
