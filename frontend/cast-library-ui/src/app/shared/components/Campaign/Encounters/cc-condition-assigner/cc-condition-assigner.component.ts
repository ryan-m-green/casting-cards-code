import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnDestroy, OnInit,
  afterNextRender, computed, effect, inject, input, output, signal, untracked, viewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { CardConditionService, ConditionSubject } from '../../../../../core/card-condition.service';
import { ConditionLibraryService } from '../../../../../core/condition-library.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { ConditionEntry } from '../../../../models/condition-entry.model';
import { CardCondition } from '../../../../models/condition.model';
import { CcConditionCardComponent } from '../../Conditions/cc-condition-card/cc-condition-card.component';

@Component({
  selector: 'cc-condition-assigner',
  standalone: true,
  imports: [CcConditionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-condition-assigner.component.html',
  styleUrl: './cc-condition-assigner.component.scss'
})
export class CcConditionAssignerComponent implements OnInit, OnDestroy {
  private readonly conditionsApi = inject(CardConditionService);
  private readonly library = inject(ConditionLibraryService);
  private readonly hub = inject(CampaignHubService);
  private readonly injector = inject(Injector);

  private readonly subs: Subscription[] = [];

  private readonly rowRef = viewChild<ElementRef<HTMLElement>>('conditionRow');

  private swiper: Swiper | null = null;

  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: 12,
    freeMode: { enabled: true, momentum: true, momentumRatio: 1, momentumBounceRatio: 1, sticky: false },
    mousewheel: { enabled: true, forceToAxis: true, sensitivity: 1, releaseOnEdges: false },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    watchOverflow: true,
    watchSlidesProgress: true,
  };

  readonly campaignId = input.required<string>();
  readonly subject = input.required<ConditionSubject>();
  readonly conditions = input<CardCondition[]>([]);

  readonly conditionsChanged = output<CardCondition[]>();

  readonly saving = signal(false);
  readonly error = signal('');

  /** The conditions this campaign holds — the only ones a card may be given. */
  readonly choices = computed<readonly ConditionEntry[]>(() =>
    this.library.conditions(this.campaignId()));

  constructor() {
    effect(() => {
      const campaignId = this.campaignId();
      untracked(() => this.library.load(campaignId).subscribe());
    });

    effect(() => {
      const count = this.choices().length;
      this.rowRef();

      afterNextRender(() => this.syncSwiper(count), { injector: this.injector });
    });
  }

  ngOnInit(): void {
    this.subs.push(
      this.hub.on('CampaignConditionsChanged', 'cc-condition-assigner', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.library.reload(this.campaignId()).subscribe();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(subscription => subscription.unsubscribe());
    this.destroySwiper();
  }

  /** Whether this card already carries the condition — what wears the purple check. */
  isOn(entry: ConditionEntry): boolean {
    return this.conditions().some(condition => condition.conditionName === entry.name);
  }

  toggle(entry: ConditionEntry): void {
    if (this.saving()) return;

    if (this.isOn(entry)) this.unassign(entry);
    else this.assign(entry);
  }

  private assign(entry: ConditionEntry): void {
    this.error.set('');
    this.saving.set(true);

    this.conditionsApi.assign(this.campaignId(), this.subject(), entry.name).subscribe({
      next: condition => {
        this.saving.set(false);
        this.conditionsChanged.emit([
          ...this.conditions().filter(read => read.id !== condition.id),
          condition,
        ]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not assign the condition.');
      },
    });
  }

  private unassign(entry: ConditionEntry): void {
    const held = this.conditions().find(condition => condition.conditionName === entry.name);
    if (!held) return;

    this.error.set('');
    this.saving.set(true);

    this.conditionsApi.remove(this.campaignId(), this.subject(), held.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.conditionsChanged.emit(this.conditions().filter(condition => condition.id !== held.id));
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not remove the condition.');
      },
    });
  }

  @HostListener('wheel', ['$event'])
  onHorizontalWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
    }
  }

  private syncSwiper(count: number): void {
    const host = this.rowRef()?.nativeElement ?? null;

    if (!host) {
      this.destroySwiper();
      return;
    }

    if (this.swiper && this.swiper.slides.length === count) {
      this.swiper.update();
      return;
    }

    this.destroySwiper();
    this.swiper = new Swiper(host, CcConditionAssignerComponent.SWIPER_OPTIONS);
  }

  private destroySwiper(): void {
    if (!this.swiper) return;

    this.swiper.destroy(true, true);
    this.swiper = null;
  }
}
