import { Component, OnInit, OnDestroy, signal, inject, computed, effect, Injector, ElementRef, ViewChild, afterNextRender } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { Rule } from '../../../shared/models/rule.model';
import { RuleLibraryService } from '../../../core/rule-library.service';
import { CcRuleCardComponent } from '../../../shared/components/Campaign/Rules/cc-rule-card/cc-rule-card.component';
import { CcCardAddTileComponent } from '../../../shared/components/Shared/cc-card-add-tile/cc-card-add-tile.component';
import { CcEditButtonComponent } from '../../../shared/components/Shared/cc-edit-button/cc-edit-button.component';
import { CcDeleteButtonComponent } from '../../../shared/components/Shared/cc-delete-button/cc-delete-button.component';
import { CcKeywordFiltersComponent } from '../../../shared/components/Journal/cc-keyword-filters/cc-keyword-filters.component';
import { JournalTitleComponent } from '../../../shared/components/Shared/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/Journal/journal-watermark/journal-watermark.component';

/**
 * The Cheat Sheet Library: the DM's own entries — the cards the campaign's bottom-right grid area
 * draws — gathered in the journal. Each page holds every entry the DM owns, swept as a row, with
 * the ＋ tile at its end leading to the journal form that writes one.
 *
 * It follows the Conditions Library page: journal title, watermark, hashtag filters, a search, and
 * the snap-scrolling row of cards.
 */
@Component({
  selector: 'app-cheat-sheet-library',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CcRuleCardComponent,
    CcCardAddTileComponent,
    CcEditButtonComponent,
    CcDeleteButtonComponent,
    CcKeywordFiltersComponent,
    JournalTitleComponent,
    JournalWatermarkComponent,
  ],
  templateUrl: './cheat-sheet-library.component.html',
  styleUrl: './cheat-sheet-library.component.scss',
})
export class CheatSheetLibraryComponent implements OnInit, OnDestroy {
  private readonly library = inject(RuleLibraryService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly entries = computed(() => this.library.libraryRules());
  readonly loading = computed(() => this.library.isLoadingLibrary());
  readonly failed = computed(() => this.library.hasFailedLibrary());

  searchTerm = signal('');
  activeKeywords = signal<string[]>([]);

  /** The row of cards the library sweeps through — see `initSwiper`. */
  @ViewChild('entryRow', { static: false }) entryRowRef!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  readonly filtered = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const keywords = this.activeKeywords().map(k => k.toLowerCase());

    return this.entries().filter(entry => {
      const matchesSearch = !term || this.matches(entry, term);
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

  /** Opens the library's row — the same centred sweep the other library cards keep. */
  private initSwiper() {
    if (!this.entryRowRef?.nativeElement) return;

    this.destroySwiper();

    this.swiper = new Swiper(this.entryRowRef.nativeElement, {
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
    this.router.navigate(['/gm/cheat-sheets', id]);
  }

  remove(id: string) {
    this.library.removeFromLibrary(id).subscribe();
  }

  retry() {
    this.library.reloadLibrary().subscribe();
  }

  private matches(entry: Rule, term: string): boolean {
    if (entry.name.toLowerCase().includes(term)) return true;
    if (entry.definition.toLowerCase().includes(term)) return true;
    if (entry.keywords.some(keyword => keyword.toLowerCase().includes(term))) return true;

    return entry.children.some(child =>
      child.name.toLowerCase().includes(term) || child.definition.toLowerCase().includes(term)
    );
  }
}
