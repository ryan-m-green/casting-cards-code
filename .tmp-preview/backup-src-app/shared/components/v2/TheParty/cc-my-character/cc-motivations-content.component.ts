import { Component, input, output, signal, computed, inject, OnInit, OnDestroy, ViewChild, ElementRef, afterNextRender, effect, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { PlayerCard, PlayerTrait } from '../../../../models/player-card.model';
import { CcMotiveCardComponent } from '../../carddeck/cc-motive-card/cc-motive-card.component';
import { CcToggleSwitchComponent } from '../../Shared/cc-toggle-switch/cc-toggle-switch.component';

type TraitType = 'GOAL' | 'FEAR' | 'FLAW';

@Component({
  selector: 'cc-motivations-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcMotiveCardComponent, CcToggleSwitchComponent],
  templateUrl: './cc-motivations-content.component.html',
  styleUrl: './cc-motivations-content.component.scss',
})
export class CcMotivationsContentComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private injector = inject(Injector);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();
  readonly changed = output<void>();

  readonly loading = signal(true);
  readonly playerCardId = signal('');
  readonly traits = signal<PlayerTrait[]>([]);

  readonly addingType = signal<TraitType | null>(null);
  readonly newContent = signal('');

  readonly goals = computed(() => this.traits().filter(t => t.traitType === 'GOAL'));
  readonly fears = computed(() => this.traits().filter(t => t.traitType === 'FEAR'));
  readonly flaws = computed(() => this.traits().filter(t => t.traitType === 'FLAW'));

  readonly selectedId = signal<string | null>(null);
  readonly selectedTrait = computed<PlayerTrait | null>(
    () => this.traits().find(t => t.id === this.selectedId()) ?? null
  );

  @ViewChild('goalsSwiper', { static: false }) goalsSwiperRef!: ElementRef<HTMLElement>;
  @ViewChild('flawsSwiper', { static: false }) flawsSwiperRef!: ElementRef<HTMLElement>;
  @ViewChild('fearsSwiper', { static: false }) fearsSwiperRef!: ElementRef<HTMLElement>;

  private swipers: { goals: Swiper | null; flaws: Swiper | null; fears: Swiper | null } = {
    goals: null,
    flaws: null,
    fears: null,
  };

  constructor() {
    effect(() => {
      this.traits().length;
      afterNextRender(() => this.initAllSwipers(), { injector: this.injector });
    });
  }

  ngOnInit(): void {
    this.http.get<PlayerCard>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/mine`
    ).subscribe({
      next: card => {
        this.playerCardId.set(card.id);
        this.loadTraits(card.id);
      },
      error: () => this.loading.set(false),
    });
  }

  startAdd(type: TraitType): void {
    this.addingType.set(type);
    this.newContent.set('');
  }

  cancelAdd(): void {
    this.addingType.set(null);
    this.newContent.set('');
  }

  confirmAdd(): void {
    const type = this.addingType();
    const content = this.newContent().trim();
    const playerCardId = this.playerCardId();
    if (!type || !content || !playerCardId) return;

    this.http.post<PlayerTrait>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}/traits`,
      { traitType: type, content }
    ).subscribe(t => {
      this.traits.update(list => [...list, t]);
      this.newContent.set('');
      this.addingType.set(null);
      this.changed.emit();
    });
  }

  deleteTrait(traitId: string): void {
    const playerCardId = this.playerCardId();
    if (!playerCardId) return;
    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}/traits/${traitId}`
    ).subscribe(() => {
      this.traits.update(list => list.filter(t => t.id !== traitId));
      this.changed.emit();
    });
  }

  toggleGoal(trait: PlayerTrait): void {
    const playerCardId = this.playerCardId();
    if (!playerCardId) return;
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}/traits/${trait.id}/toggle`,
      {}
    ).subscribe(() => {
      this.traits.update(list =>
        list.map(t => (t.id === trait.id ? { ...t, isCompleted: !t.isCompleted } : t))
      );
      this.changed.emit();
    });
  }

  toggleShared(trait: PlayerTrait): void {
    const playerCardId = this.playerCardId();
    if (!playerCardId) return;
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}/traits/${trait.id}/toggle-shared`,
      {}
    ).subscribe(() => {
      this.traits.update(list =>
        list.map(t => (t.id === trait.id ? { ...t, isShared: !t.isShared } : t))
      );
      this.changed.emit();
    });
  }

  done(): void {
    this.closeDrawer.emit();
  }

  select(id: string): void {
    this.selectedId.update(cur => (cur === id ? null : id));
  }

  ngOnDestroy(): void {
    this.swipers.goals?.destroy(true, true);
    this.swipers.flaws?.destroy(true, true);
    this.swipers.fears?.destroy(true, true);
  }

  private initAllSwipers(): void {
    this.initSwiper('goals', this.goalsSwiperRef);
    this.initSwiper('flaws', this.flawsSwiperRef);
    this.initSwiper('fears', this.fearsSwiperRef);
  }

  private initSwiper(key: 'goals' | 'flaws' | 'fears', ref: ElementRef<HTMLElement>): void {
    if (!ref?.nativeElement) return;
    if (this.swipers[key]) {
      this.swipers[key]!.destroy(true, true);
      this.swipers[key] = null;
    }
    this.swipers[key] = new Swiper(ref.nativeElement, {
      modules: [FreeMode, Mousewheel],
      slidesPerView: 'auto',
      spaceBetween: 10,
      freeMode: { enabled: true, momentum: true, momentumRatio: 1, momentumBounceRatio: 1, sticky: false },
      mousewheel: { enabled: true, forceToAxis: true, sensitivity: 1, releaseOnEdges: false },
      grabCursor: true,
      resistance: true,
      resistanceRatio: 0.85,
      speed: 300,
      observer: true,
      observeParents: true,
      watchOverflow: true,
    });
  }

  private loadTraits(playerCardId: string): void {
    this.http.get<PlayerTrait[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}/traits`
    ).subscribe({
      next: traits => {
        this.traits.set(traits);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
