import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import Swiper from 'swiper';
import { Zoom } from 'swiper/modules';

const MAX_SCALE = 5;

const MIN_SCALE = 1;

const TAP_SCALE = 2.5;

const WHEEL_BITE = 0.0018;

const KEY_SCALE = 1.2;

const WHEEL_QUIET_MS = 180;

const GESTURING_CLASS = 'wm-gesturing';

const SWIPER_SPEED = 300;

interface StagePoint { x: number; y: number; }

interface ViewSize { slideWidth: number; slideHeight: number; imageWidth: number; imageHeight: number; }

@Component({
  selector: 'app-cc-worldmap-content',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-worldmap-content.component.html',
  styleUrl: './cc-worldmap-content.component.scss',
})
export class CcWorldmapContentComponent implements OnDestroy {
  private injector = inject(Injector);

  worldMapImageUrl = input<string | null>(null);

  portalColor = input('#6e28d0');

  @ViewChild('swiperEl') private swiperEl?: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  private viewSize: ViewSize | null = null;

  private pointersDown = 0;

  private wheelQuietTimer: ReturnType<typeof setTimeout> | null = null;

  readonly zoomed = signal(false);

  constructor() {
    effect(() => {
      const url = this.worldMapImageUrl();
      if (!url) {
        this.destroySwiper();
        return;
      }
      afterNextRender(() => this.createSwiper(), { injector: this.injector });
    });
  }

  ngOnDestroy(): void {
    if (this.wheelQuietTimer) {
      clearTimeout(this.wheelQuietTimer);
      this.wheelQuietTimer = null;
    }
    this.destroySwiper();
    this.setGesturing(false);
  }

  private createSwiper(): void {
    const el = this.swiperEl?.nativeElement;
    if (!el || this.swiper) return;

    this.swiper = new Swiper(el, {
      modules: [Zoom],
      zoom: { enabled: true, maxRatio: MAX_SCALE, minRatio: MIN_SCALE, toggle: false },
      slidesPerView: 1,
      spaceBetween: 0,
      speed: SWIPER_SPEED,
      simulateTouch: true,
      watchOverflow: true,
      on: {
        zoomChange: (_swiper: Swiper, scale: number) => this.onZoomChange(scale),
        doubleTap: (_swiper: Swiper, event: MouseEvent | TouchEvent | PointerEvent) => this.onDoubleTap(event),
      },
    });

    this.viewSize = null;
    this.measureView();
  }

  private destroySwiper(): void {
    this.swiper?.destroy(true, true);
    this.swiper = null;
    this.viewSize = null;
  }

  onPointerDown(): void {
    this.pointersDown += 1;
    this.setGesturing(true);
  }

  onPointerUp(): void {
    this.pointersDown = Math.max(0, this.pointersDown - 1);
    if (this.pointersDown === 0) this.setGesturing(false);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.setGesturing(true);

    const swiper = this.swiper;
    if (swiper) {
      const page = this.view()?.slideHeight ?? 0;
      const bite =
        event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * page : event.deltaY;
      const next = swiper.zoom.scale * Math.exp(-bite * WHEEL_BITE);

      if (next <= MIN_SCALE) this.resetView();
      else this.zoomTo(this.eventPoint(event), next);
    }

    if (this.wheelQuietTimer) clearTimeout(this.wheelQuietTimer);
    this.wheelQuietTimer = setTimeout(() => {
      this.wheelQuietTimer = null;
      this.setGesturing(false);
    }, WHEEL_QUIET_MS);
  }

  onKeydown(event: KeyboardEvent): void {
    const swiper = this.swiper;
    if (!swiper) return;

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomTo({ x: 0, y: 0 }, swiper.zoom.scale * KEY_SCALE);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      const next = swiper.zoom.scale / KEY_SCALE;
      if (next <= MIN_SCALE) this.resetView();
      else this.zoomTo({ x: 0, y: 0 }, next);
    } else if (event.key === '0') {
      event.preventDefault();
      this.resetView();
    }
  }

  resetView(): void {
    this.swiper?.zoom.out();
  }

  onImageLoaded(): void {
    this.viewSize = null;
    this.resetView();
    this.measureView();
  }

  private onZoomChange(scale: number): void {
    this.zoomed.set(scale > MIN_SCALE);
  }

  private onDoubleTap(event: MouseEvent | TouchEvent | PointerEvent): void {
    const swiper = this.swiper;
    if (!swiper) return;

    if (swiper.zoom.scale > MIN_SCALE) {
      this.resetView();
      return;
    }

    this.zoomTo(this.eventPoint(event), TAP_SCALE);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.viewSize = null;
    this.measureView();
    this.reclampView();
  }

  private setGesturing(moving: boolean): void {
    if (moving && this.wheelQuietTimer) {
      clearTimeout(this.wheelQuietTimer);
      this.wheelQuietTimer = null;
    }
    document.body.classList.toggle(GESTURING_CLASS, moving || this.pointersDown > 0);
  }

  private zoomTo(at: StagePoint, scale: number): void {
    const swiper = this.swiper;
    if (!swiper) return;

    const view = this.view();
    const from = swiper.zoom.scale;
    const to = this.clampScale(scale);

    const held = this.heldOffset();

    swiper.zoom.in(to);

    if (!view) return;

    const ratio = to / from;
    const wanted = { x: at.x - (at.x - held.x) * ratio, y: at.y - (at.y - held.y) * ratio };

    const wrap = this.zoomWrap();
    if (!wrap) return;

    const placed = this.clampOffset(to, wanted, view);
    wrap.style.transform = `translate3d(${placed.x}px, ${placed.y}px, 0)`;
  }

  private heldOffset(): StagePoint {
    const transform = this.zoomWrap()?.style.transform;
    if (!transform) return { x: 0, y: 0 };

    const matrix = new DOMMatrix(transform);
    return { x: matrix.m41, y: matrix.m42 };
  }

  private clampOffset(scale: number, offset: StagePoint, view: ViewSize): StagePoint {
    const slackX = Math.max(0, (view.imageWidth * scale - view.slideWidth) / 2);
    const slackY = Math.max(0, (view.imageHeight * scale - view.slideHeight) / 2);

    return {
      x: Math.min(slackX, Math.max(-slackX, offset.x)),
      y: Math.min(slackY, Math.max(-slackY, offset.y)),
    };
  }

  private clampScale(scale: number): number {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  }

  private view(): ViewSize | null {
    return this.viewSize ?? this.measureView();
  }

  private measureView(): ViewSize | null {
    const slide = this.slideEl();
    const image = slide?.querySelector('img');

    if (!slide || !image || !image.offsetWidth || !image.offsetHeight) return null;

    return (this.viewSize = {
      slideWidth: slide.offsetWidth,
      slideHeight: slide.offsetHeight,
      imageWidth: image.offsetWidth,
      imageHeight: image.offsetHeight,
    });
  }

  private slideEl(): HTMLElement | null {
    const swiper = this.swiper;
    return (swiper?.slides?.[swiper.activeIndex] as HTMLElement | undefined) ?? null;
  }

  private zoomWrap(): HTMLElement | null {
    return this.slideEl()?.querySelector('.swiper-zoom-container') ?? null;
  }

  private reclampView(): void {
    const swiper = this.swiper;
    const view = this.view();
    const wrap = this.zoomWrap();
    if (!swiper || !view || !wrap || swiper.zoom.scale <= MIN_SCALE) return;

    const placed = this.clampOffset(swiper.zoom.scale, this.heldOffset(), view);
    wrap.style.transform = `translate3d(${placed.x}px, ${placed.y}px, 0)`;
  }

  private eventPoint(event: MouseEvent | TouchEvent | PointerEvent): StagePoint {
    const touch = 'touches' in event ? (event.touches[0] ?? event.changedTouches[0]) : event;
    const rect = this.slideEl()?.getBoundingClientRect();
    if (!touch || !rect) return { x: 0, y: 0 };

    return {
      x: touch.clientX - rect.left - rect.width / 2,
      y: touch.clientY - rect.top - rect.height / 2,
    };
  }
}
