import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnInit, OnDestroy, afterNextRender, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { Rule } from '../../../../models/rule.model';
import { RuleLibraryService } from '../../../../../core/rule-library.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CcRuleCardComponent } from '../cc-rule-card/cc-rule-card.component';

@Component({
  selector: 'cc-rules',
  standalone: true,
  imports: [CcRuleCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-rules.component.html',
  styleUrl: './cc-rules.component.scss',
})
export class CcRulesComponent implements OnInit, OnDestroy {
  private readonly library = inject(RuleLibraryService);
  private readonly gridLoad = inject(CampaignGridLoadService);
  private readonly hub = inject(CampaignHubService);
  private readonly hubSubscriptions: Subscription[] = [];
  private readonly injector = inject(Injector);
  private readonly rulesSwiperRef = viewChild<ElementRef<HTMLElement>>('rulesSwiper');
  private swiper: Swiper | null = null;

  private readonly mark = publishGridAreaMark('bottom-right', 'content', {
    title: () => ['Cheat Sheet'],
    icon: { path: '/scroll_check_mark_icon.svg', width: 32, height: 40 },
  });

  readonly campaignId = input.required<string>();

  readonly portalColor = input<string>('#6e28d0');

  readonly requestOpen = output<Rule>();

  readonly requestAdd = output<void>();

  readonly draft = signal('');

  private loadedOnce = false;

  readonly total = computed(() => this.library.rules(this.campaignId()).length);

  readonly isLoading = computed(() => this.library.isLoading(this.campaignId()));

  readonly failed = computed(() => this.library.hasFailed(this.campaignId()));

  readonly rules = computed(() => {
    const query = this.draft().trim().toLowerCase();
    const held = this.library.rules(this.campaignId());
    if (!query) return held;

    return held.filter(rule => this.matches(rule, query));
  });

  readonly searched = computed(() => this.draft().trim() !== '');

  constructor() {
    effect(() => {
      const campaignId = this.campaignId();
      if (!campaignId || this.loadedOnce) return;

      this.loadedOnce = true;
      untracked(() => this.load(campaignId));
    });

    effect(() => {
      const count = this.rules().length + 1;

      if (this.swiper && this.swiper.slides.length === count) {
        this.swiper.update();
        return;
      }

      afterNextRender(() => this.initSwiper(), { injector: this.injector });
    });
  }

  ngOnInit(): void {
    this.hubSubscriptions.push(
      this.hub.on('CampaignRulesChanged', 'cc-rules', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.library.reload(this.campaignId()).subscribe();
      })
    );
  }

  ngOnDestroy(): void {
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    this.hubSubscriptions.forEach(subscription => subscription.unsubscribe());
  }

  @HostListener('wheel', ['$event'])
  onHorizontalWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
    }
  }

  private initSwiper(): void {
    const host = this.rulesSwiperRef()?.nativeElement;
    if (!host) return;

    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    this.swiper = new Swiper(host, {
      modules: [FreeMode, Mousewheel],
      slidesPerView: 'auto',
      spaceBetween: 12,
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

  retry(): void {
    this.library.reload(this.campaignId()).subscribe();
  }

  onDraft(value: string): void {
    this.draft.set(value);
  }

  private load(campaignId: string): void {
    this.library.load(campaignId).subscribe(() => this.gridLoad.report('bottom-right', 'content'));
  }

  private matches(rule: Rule, query: string): boolean {
    if (rule.name.toLowerCase().includes(query)) return true;
    if (rule.definition.toLowerCase().includes(query)) return true;
    if (rule.keywords.some(keyword => keyword.toLowerCase().includes(query))) return true;

    return rule.children.some(child =>
      child.name.toLowerCase().includes(query) || child.definition.toLowerCase().includes(query)
    );
  }
}
