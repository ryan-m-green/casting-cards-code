import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PortalTransitionService {
  readonly active   = signal(false);
  readonly instant  = signal(false);
  /** The cover is being taken off without its own fade (see hideNow). */
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

  /**
   * Taken off at once, with no fade of its own. For a page that is doing its own reveal —
   * the campaign shell's curtain over the grid — since the cover's own fade out is three
   * seconds long, and a page revealed under it would keep brightening for all of them.
   */
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
}
