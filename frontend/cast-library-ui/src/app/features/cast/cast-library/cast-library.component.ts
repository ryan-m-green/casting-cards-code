import { Component, OnInit, OnDestroy, signal, inject, computed, effect, Injector, ElementRef, ViewChild, afterNextRender } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../environments/environment';
import { Cast } from '../../../shared/models/cast.model';
import { CcCastCardComponent } from '../../../shared/components/Shared/cc-cast-card/cc-cast-card.component';
import { CcCardAddTileComponent } from '../../../shared/components/Shared/cc-card-add-tile/cc-card-add-tile.component';
import { CcKeywordFiltersComponent } from '../../../shared/components/Journal/cc-keyword-filters/cc-keyword-filters.component';
import { CcKeywordEditorComponent } from '../../../shared/components/Journal/cc-keyword-editor/cc-keyword-editor.component';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/Journal/journal-watermark/journal-watermark.component';
import { UpgradeBadgeComponent } from '../../../shared/components/Journal/upgrade-badge/upgrade-badge.component';
import { StripeService, EntityLimitsResponse } from '../../../core/stripe.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';

@Component({
  selector: 'app-cast-library',
  standalone: true,
  imports: [CommonModule, FormsModule, CcCastCardComponent, CcCardAddTileComponent, CcKeywordFiltersComponent, JournalTitleComponent, JournalWatermarkComponent, UpgradeBadgeComponent, CcKeywordEditorComponent],
  templateUrl: './cast-library.component.html',
  styleUrl: './cast-library.component.scss'
})
export class CastLibraryComponent implements OnInit, OnDestroy {
  private http       = inject(HttpClient);
  router             = inject(Router);
  private stripe     = inject(StripeService);
  auth = inject(AuthService);
  private hub        = inject(CampaignHubService);
  private subscriptionDrawerService = inject(SubscriptionDrawerService);
  private injector   = inject(Injector);

  cast            = signal<Cast[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);
  castLimitReached = signal(false);
  private tiltMap = new Map<string, number>();

  /** The row of cards the library sweeps through — see `initSwiper`. */
  @ViewChild('castRow', { static: false }) castRowRef!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  readonly isCreateDisabled = computed(() => {
    if (this.auth.isExempt()) return false;
    if (this.auth.isFreeTrial()) return false;
    const level = this.auth.lockLevel();
    return level !== 'FullAccess';
  });

  /** The keywords the page is narrowing to, as the keyword bar above the search keeps them. */
  readonly activeKeywords = signal<string[]>([]);

  readonly filtered = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const keywords = this.activeKeywords().map(k => k.toLowerCase());

    return this.cast().filter(n => {
      const matchesSearch = !term
        || n.name.toLowerCase().includes(term)
        || n.race.toLowerCase().includes(term)
        || n.role.toLowerCase().includes(term);

      /* The keyword bar is a filter of its own rather than a second search: a card is kept while it
         carries any of the keywords that are on (see cc-keyword-filters). */
      const matchesKeywords = !keywords.length
        || (n.keywords ?? []).some(k => keywords.includes(k.toLowerCase()));

      return matchesSearch && matchesKeywords;
    });
  });

  constructor() {
    /*
     * The library is swept as a row (see `initSwiper`), so the Swiper has to be told about the cards
     * as they arrive: the page is drawn empty, the fetch fills it, and a search can empty it again.
     * A row with nothing in it is left un-swept, which is also what keeps the empty-state line
     * beside it legible — and Swiper is rebuilt rather than patched when the cards come back.
     */
    effect(() => {
      if (this.filtered().length === 0) {
        this.destroySwiper();
        return;
      }

      if (this.swiper) {
        this.swiper.update();
        return;
      }

      afterNextRender(() => this.initSwiper(), { injector: this.injector });
    });
  }

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.hub.connect().catch((err: unknown) => {});
    }

    this.http.get<Cast[]>(`${environment.apiUrl}/api/cast`)
      .subscribe(n => this.cast.set(n));
    this.loadEntityLimits();
  }

  ngOnDestroy() {
    this.destroySwiper();
  }

  /**
   * Opens the library's row: the cards are swept sideways, and the first of them stands in the
   * middle of the page with the rest of the stack trailing off to its right (`centeredSlides`) —
   * the same sweep the campaign's card rows keep. The row is as wide as the page, so the middle of
   * the row is the middle of the page.
   */
  private initSwiper() {
    if (!this.castRowRef?.nativeElement) return;

    this.destroySwiper();

    this.swiper = new Swiper(this.castRowRef.nativeElement, {
      modules: [FreeMode, Mousewheel],
      slidesPerView: 'auto',
      spaceBetween: 14,
      centeredSlides: true,
      observeParents: true,
      freeMode: {
        enabled: true,
        momentum: true,
        momentumRatio: 1,
        momentumBounceRatio: 1,
        sticky: false,
      },
      mousewheel: {
        enabled: true,
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: false,
      },
      grabCursor: true,
      resistance: true,
      resistanceRatio: 0.85,
      speed: 300,
      observer: true,
      watchOverflow: true,
      watchSlidesProgress: true,
    });
  }

  private destroySwiper() {
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
  edit(id: string)      { this.router.navigate(['/gm/cast', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/cast/${id}`)
      .subscribe(() => {
        this.cast.set(this.cast().filter(n => n.id !== id));
        this.pendingDeleteId.set(null);
      });
  }

  tiltFor(id: string): number {
    if (!this.tiltMap.has(id)) {
      this.tiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.tiltMap.get(id)!;
  }

  private loadEntityLimits() {
    this.stripe.getUserEntityLimits().subscribe({
      next: (limits: EntityLimitsResponse) => {
        this.castLimitReached.set(limits.cast.limitReached);
      },
      error: () => {
        this.castLimitReached.set(false);
      }
    });
  }

  openUpgradeDrawer() {
    this.subscriptionDrawerService.open();
  }
}
