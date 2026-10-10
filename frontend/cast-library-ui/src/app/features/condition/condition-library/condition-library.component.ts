import { Component, OnInit, OnDestroy, signal, inject, computed, effect, Injector, ElementRef, ViewChild, afterNextRender } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { ConditionLibraryService } from '../../../core/condition-library.service';
import { CcConditionCardComponent } from '../../../shared/components/Campaign/Conditions/cc-condition-card/cc-condition-card.component';
import { CcCardAddTileComponent } from '../../../shared/components/Shared/cc-card-add-tile/cc-card-add-tile.component';
import { CcKeywordFiltersComponent } from '../../../shared/components/Journal/cc-keyword-filters/cc-keyword-filters.component';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/Journal/journal-watermark/journal-watermark.component';

@Component({
  selector: 'app-condition-library',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CcConditionCardComponent,
    CcCardAddTileComponent,
    CcKeywordFiltersComponent,
    JournalTitleComponent,
    JournalWatermarkComponent,
  ],
  templateUrl: './condition-library.component.html',
  styleUrl: './condition-library.component.scss',
})
export class ConditionLibraryComponent implements OnInit, OnDestroy {
  private readonly library = inject(ConditionLibraryService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly conditions = computed(() => this.library.libraryConditions());
  readonly loading = computed(() => this.library.isLoadingLibrary());
  readonly failed = computed(() => this.library.hasFailedLibrary());

  searchTerm = signal('');
  activeKeywords = signal<string[]>([]);
  pendingDeleteId = signal<string | null>(null);

  /** The row of cards the library sweeps through — see `initSwiper`. */
  @ViewChild('conditionRow', { static: false }) conditionRowRef!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  readonly filtered = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const keywords = this.activeKeywords().map(k => k.toLowerCase());

    return this.conditions().filter(entry => {
      const matchesSearch = !term
        || entry.name.toLowerCase().includes(term)
        || entry.consequence.toLowerCase().includes(term)
        || entry.keywords.some(k => k.toLowerCase().includes(term));

      const matchesKeywords = keywords.length === 0
        || entry.keywords.some(k => keywords.includes(k.toLowerCase()));

      return matchesSearch && matchesKeywords;
    });
  });

  constructor() {
    /*
     * The library is swept as a row (see `initSwiper`), so the Swiper has to be told about the
     * cards as they arrive: the page is drawn empty, the fetch fills it, and a search can empty it
     * again. A row with nothing in it is left un-swept, and Swiper is rebuilt rather than patched
     * when the cards come back.
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
    this.library.loadLibrary().subscribe();
  }

  ngOnDestroy() {
    this.destroySwiper();
  }

  /** Opens the library's row — the same centred sweep the cast library's cards keep. */
  private initSwiper() {
    if (!this.conditionRowRef?.nativeElement) return;

    this.destroySwiper();

    this.swiper = new Swiper(this.conditionRowRef.nativeElement, {
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

  edit(id: string) {
    this.router.navigate(['/gm/conditions', id]);
  }

  confirmDelete(id: string) {
    this.pendingDeleteId.set(id);
  }

  cancelDelete() {
    this.pendingDeleteId.set(null);
  }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.library.removeFromLibrary(id).subscribe({
      next: () => this.pendingDeleteId.set(null),
      error: () => this.pendingDeleteId.set(null),
    });
  }
}