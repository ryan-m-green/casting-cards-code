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

/** How far the map may be magnified, against the size it is fitted to at rest. */
const MAX_SCALE = 5;

/** The fitted size: what the map is put back to, and the floor every zoom is held above. */
const MIN_SCALE = 1;

/** What a double-tap (or a double-click) asks for: a comfortable read, not the whole way in. */
const TAP_SCALE = 2.5;

/**
 * How hard the wheel bites, per pixel of `deltaY`. A mouse notch is about 100px, which lands a
 * little under a fifth of the way to the next size; the bite is taken exponentially, so every notch
 * takes the same share of the size it finds rather than jumping further as the map grows.
 */
const WHEEL_BITE = 0.0018;

/** What one press of a zoom key takes the map by. */
const KEY_SCALE = 1.2;

/** How long after the last wheel notch the map is still said to be moving, in ms. */
const WHEEL_QUIET_MS = 180;

/**
 * The class a gesture is announced with on the page's own body, so the shell's breathing borders can
 * stand still while the map is worked (see `setGesturing`, and the rule in styles.scss).
 */
const GESTURING_CLASS = 'wm-gesturing';

/**
 * How long the Swiper's own transitions run, in ms — the module's `speed`, which is also the beat its
 * settle after a pinch and its own zoom steps use (see its `zoomIn`: it writes this onto the map's
 * boxes itself).
 */
const SWIPER_SPEED = 300;

/** A point of the map's window, measured from the window's centre (see `zoomTo`). */
interface StagePoint { x: number; y: number; }

/** The window's own measurements, what the clamp below is written against. */
interface ViewSize { slideWidth: number; slideHeight: number; imageWidth: number; imageHeight: number; }

/**
 * cc-worldmap-content
 *
 * The campaign's world map, read in the right drawer: the picture in a window of its own, worked with
 * the gestures a map is read with.
 *
 * The gestures themselves are Swiper's: the picture stands in a one-slide Swiper whose zoom module
 * owns the pinch, the drag that moves a magnified map about, the soft limits at its edges, the fling
 * after a drag, and the tap that asks for a zoom (`swiper/modules`, which the app already carries for
 * its rows). The module writes the casts straight onto the picture's two boxes — the picture is
 * scaled, the container its window is cut out of is held — so nothing here writes a transform for a
 * gesture, and nothing here is redrawn while one is running: this component's own state moves only
 * when the map is magnified or put back (see `zoomed`).
 *
 * What is here is the window itself — its dress, its measured size, the way back to the fitted map —
 * and the two paths the module is not asked to answer: the wheel and the zoom keys, which have no
 * fingers to carry a point and so are placed by `zoomTo` (see it for why the module's own placement
 * is not the map's).
 */
@Component({
  selector: 'app-cc-worldmap-content',
  standalone: true,
  imports: [],
  /**
   * OnPush: the map's own state is one signal — whether it stands magnified — so a gesture running in
   * the module's hands redraws nothing here, and the only redraws are the reset button coming and
   * going.
   */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-worldmap-content.component.html',
  styleUrl: './cc-worldmap-content.component.scss',
})
export class CcWorldmapContentComponent implements OnDestroy {
  private injector = inject(Injector);

  /** World map image URL (null when the campaign has none). */
  worldMapImageUrl = input<string | null>(null);

  /** Portal/campaign accent color. */
  portalColor = input('#6e28d0');

  @ViewChild('swiperEl') private swiperEl?: ElementRef<HTMLElement>;

  /** The map's Swiper, while the window is on screen: its zoom module owns the gestures. */
  private swiper: Swiper | null = null;

  /**
   * The window's measurements, taken when they can change — the drawer opening, a picture arriving,
   * the window being resized — rather than on every wheel notch: the wheel is the one path that has to
   * place the view itself, and it should not read layout to do it.
   */
  private viewSize: ViewSize | null = null;

  /** How many pointers are down on the map: a gesture is running while any of them is. */
  private pointersDown = 0;

  /** The wheel is still turning: what says the map is moving between the notches of one spin. */
  private wheelQuietTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether the map stands magnified: what the window's own dress and the reset button hang on. */
  readonly zoomed = signal(false);

  constructor() {
    /**
     * The map's Swiper is made for the window the drawer has drawn, and dropped with it: the window
     * stands behind an `@if` (a campaign with no map has none), so the instance is kept in step with
     * the markup here rather than in a lifecycle hook that runs before there is anything to hand it.
     * A second map arriving in the same window needs nothing done — the instance is already there,
     * and the module looks its picture up when it is asked to zoom (see `onImageLoaded`).
     */
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

  /**
   * Makes the map's Swiper: one slide the size of the window, and the zoom module doing the
   * magnifying. The module's own answer to a tap is to take the map the whole way to the ceiling
   * (`toggle`), which is more of a jump than a tap should be, so its toggle is off and the core's own
   * tap event is answered here (see `onDoubleTap`).
   */
  private createSwiper(): void {
    const el = this.swiperEl?.nativeElement;
    if (!el || this.swiper) return;

    this.swiper = new Swiper(el, {
      modules: [Zoom],
      zoom: { enabled: true, maxRatio: MAX_SCALE, minRatio: MIN_SCALE, toggle: false },
      slidesPerView: 1,
      spaceBetween: 0,
      speed: SWIPER_SPEED,
      // A mouse drags the map the way a finger does: the module's pan is answered from the same
      // touch events either way, and a desk-bound reader has no other way to move a magnified map.
      simulateTouch: true,
      // One picture in one window, so the Swiper is left to lock itself (its own overflow check sees a
      // single slide): a locked Swiper keeps its hands off the wrapper's transform, which is what
      // leaves the drag to the module's pan and keeps a resting map from being slid about in its frame.
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

  // ── The window's own side of the gestures ─────────────────────────────────────

  /** A pointer landed on the map: the module's handlers do the work, this only says so (see `setGesturing`). */
  onPointerDown(): void {
    this.pointersDown += 1;
    this.setGesturing(true);
  }

  /** A pointer lifted or was called off: the last one down is what ends the gesture. */
  onPointerUp(): void {
    this.pointersDown = Math.max(0, this.pointersDown - 1);
    if (this.pointersDown === 0) this.setGesturing(false);
  }

  /** The wheel magnifies about the pointer, the way a map is expected to answer it. */
  onWheel(event: WheelEvent): void {
    // A wheel over the map belongs to the map: the drawer behind it is not scrolled by it.
    event.preventDefault();
    this.setGesturing(true);

    const swiper = this.swiper;
    if (swiper) {
      // `deltaMode` is pixels in every browser that matters, but lines (1) and pages (2) are still on
      // the table: a line is worth the ~16px one is, and a page the map's own window.
      const page = this.view()?.slideHeight ?? 0;
      const bite =
        event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * page : event.deltaY;
      const next = swiper.zoom.scale * Math.exp(-bite * WHEEL_BITE);

      if (next <= MIN_SCALE) this.resetView();
      else this.zoomTo(this.eventPoint(event), next);
    }

    // A spin is many notches over a second or more: the map is still moving between them, and said to
    // be until the wheel has been quiet for a beat.
    if (this.wheelQuietTimer) clearTimeout(this.wheelQuietTimer);
    this.wheelQuietTimer = setTimeout(() => {
      this.wheelQuietTimer = null;
      this.setGesturing(false);
    }, WHEEL_QUIET_MS);
  }

  /** The zoom keys, for a keyboard: `+` (or `=`) in, `-` out, and `0` back to the fitted map. */
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

  /** Back to the map fitted to its window: the reset button, `0`, and the second half of a double-tap. */
  resetView(): void {
    this.swiper?.zoom.out();
  }

  /**
   * A picture has arrived: it opens fitted, whatever the last one was left at, and the window is
   * measured again — a map can be any shape, and the clamp below is written against the shape in hand.
   */
  onImageLoaded(): void {
    this.viewSize = null;
    this.resetView();
    this.measureView();
  }

  /**
   * The module's own word on how far the map stands. Signals take no notice of a value that has not
   * changed, so the map is redrawn as it is magnified or put back — never on a step of a pinch, which
   * the module writes straight onto the picture's own boxes.
   */
  private onZoomChange(scale: number): void {
    this.zoomed.set(scale > MIN_SCALE);
  }

  /**
   * A double-tap (or a double-click): the map is magnified about the point it landed on, or — if it is
   * already magnified — put back. The module's own answer to a tap is to take it to the ceiling, which
   * is more of a jump than a tap should be, so this answers the tap with the map's own `TAP_SCALE` and
   * the same placement every other point-led zoom uses (see `zoomTo`).
   */
  private onDoubleTap(event: MouseEvent | TouchEvent | PointerEvent): void {
    const swiper = this.swiper;
    if (!swiper) return;

    if (swiper.zoom.scale > MIN_SCALE) {
      this.resetView();
      return;
    }

    this.zoomTo(this.eventPoint(event), TAP_SCALE);
  }

  /** The window has changed size — a rotation, or the drawer re-measured: measure and place afresh. */
  @HostListener('window:resize')
  onResize(): void {
    this.viewSize = null;
    this.measureView();
    this.reclampView();
  }

  /**
   * Says, on the page's own body, that the map is being worked. It is a courtesy to the paint and
   * nothing else — the map's gestures do not wait on it: the shell's two breathing borders are inset
   * box-shadows across the whole screen, repainted every frame, and they are held still for the
   * gesture's duration (see the rule in styles.scss).
   */
  private setGesturing(moving: boolean): void {
    if (moving && this.wheelQuietTimer) {
      clearTimeout(this.wheelQuietTimer);
      this.wheelQuietTimer = null;
    }
    document.body.classList.toggle(GESTURING_CLASS, moving || this.pointersDown > 0);
  }

  // ── The window's own geometry ──────────────────────────────────────────────────

  /**
   * Takes the map to `scale` with the picture point standing at `at` (px from the window's centre) put
   * back under it, and lands it there over the module's own beat.
   *
   * The magnifying is the module's (`zoom.in`), and the placing is this: a pinch needs no placement —
   * the fingers carry their own midpoint, and the module's arithmetic stands the view on it — but a
   * wheel notch and a keypress have no point to stand on, and the module's ratio path is given none:
   * it places the view from the slide's corner, which for a map fitted into a window is a corner of
   * the map. Its pan for a step then keeps the previous translate proportionally, which drifts to that
   * clamp as the map shrinks. So the placement is asked for here, and the same arithmetic answers both
   * paths: what is under the point stays under the point.
   */
  private zoomTo(at: StagePoint, scale: number): void {
    const swiper = this.swiper;
    if (!swiper) return;

    const view = this.view();
    const from = swiper.zoom.scale;
    const to = this.clampScale(scale);

    // Where the map stands before the module is asked for the new size: the module writes its own
    // placement as part of that call, so the hold it is to be given back has to be read first.
    const held = this.heldOffset();

    swiper.zoom.in(to);

    if (!view) return;

    // What stands under the point is put back under it — and where the size did not move, that is the
    // hold it already had, which is what puts the module's own placement back too.
    const ratio = to / from;
    const wanted = { x: at.x - (at.x - held.x) * ratio, y: at.y - (at.y - held.y) * ratio };

    const wrap = this.zoomWrap();
    if (!wrap) return;

    const placed = this.clampOffset(to, wanted, view);
    wrap.style.transform = `translate3d(${placed.x}px, ${placed.y}px, 0)`;
  }

  /**
   * The map's hold, as the module last wrote it onto the window it is cut out of: read from the style
   * the module wrote rather than from the rendering, so a fast spin of the wheel measures the map's own
   * target rather than paying for a fresh layout on every notch.
   */
  private heldOffset(): StagePoint {
    const transform = this.zoomWrap()?.style.transform;
    if (!transform) return { x: 0, y: 0 };

    const matrix = new DOMMatrix(transform);
    return { x: matrix.m41, y: matrix.m42 };
  }

  /**
   * The hold, kept to what the picture can cover: while the magnified picture is smaller than its
   * window on an axis it is centred on it, and once it fills the window it may be held only as far as
   * its own edges allow — the same bounds the module keeps its own pan within (see its `onTouchMove`).
   */
  private clampOffset(scale: number, offset: StagePoint, view: ViewSize): StagePoint {
    const slackX = Math.max(0, (view.imageWidth * scale - view.slideWidth) / 2);
    const slackY = Math.max(0, (view.imageHeight * scale - view.slideHeight) / 2);

    return {
      x: Math.min(slackX, Math.max(-slackX, offset.x)),
      y: Math.min(slackY, Math.max(-slackY, offset.y)),
    };
  }

  /** The magnification, held between the fitted map and the ceiling. */
  private clampScale(scale: number): number {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  }

  /** The window's measurements, taken now if they are not in hand (see `viewSize`). */
  private view(): ViewSize | null {
    return this.viewSize ?? this.measureView();
  }

  /**
   * Measures the window and the picture: the slide the map is drawn in, and the picture's own box
   * inside it — the two sizes the clamp is written against. Nothing is kept before the picture has been
   * fitted (a map still on its way has no box of its own), so the placement is left to the module until
   * there is something to place.
   */
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

  /** The window's own slide: the map's whole frame, and what `StagePoint`s are measured from. */
  private slideEl(): HTMLElement | null {
    const swiper = this.swiper;
    return (swiper?.slides?.[swiper.activeIndex] as HTMLElement | undefined) ?? null;
  }

  /** The container the module holds when it moves the map about: what it writes its own pan onto. */
  private zoomWrap(): HTMLElement | null {
    return this.slideEl()?.querySelector('.swiper-zoom-container') ?? null;
  }

  /** The map the module holds, put back inside its bounds — what a window that changed size calls for. */
  private reclampView(): void {
    const swiper = this.swiper;
    const view = this.view();
    const wrap = this.zoomWrap();
    if (!swiper || !view || !wrap || swiper.zoom.scale <= MIN_SCALE) return;

    const placed = this.clampOffset(swiper.zoom.scale, this.heldOffset(), view);
    wrap.style.transform = `translate3d(${placed.x}px, ${placed.y}px, 0)`;
  }

  /**
   * Where a gesture's own point stands, measured from the centre of the map's window. The window is the
   * slide the map is drawn in, not the container the module holds: the container is what a magnified
   * map is held by, and it moves — the window does not.
   */
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
