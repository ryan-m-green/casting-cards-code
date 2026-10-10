import {
  Component, ChangeDetectionStrategy, input, output, signal, computed, inject,
  ViewChild, ElementRef, afterNextRender, effect, Injector, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { PlayerCardSecret } from '../../../../models/player-card.model';
import { CcWhisperCardComponent } from '../../carddeck/cc-whisper-card/cc-whisper-card.component';
import { CcCardSpotlightComponent } from '../../Shared/cc-card-spotlight/cc-card-spotlight.component';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';

@Component({
  selector: 'cc-secrets-whisper-row',
  standalone: true,
  imports: [CommonModule, FormsModule, CcWhisperCardComponent, CcCardSpotlightComponent, CcTextboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-secrets-whisper-row.component.html',
  styleUrl: './cc-secrets-whisper-row.component.scss',
})
export class CcSecretsWhisperRowComponent implements OnDestroy {
  private http = inject(HttpClient);
  private injector = inject(Injector);
  private shellSvc = inject(CampaignShellService);

  readonly secrets = input.required<PlayerCardSecret[]>();
  readonly campaignId = input.required<string>();
  readonly playerCardId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');
  readonly mode = input<'player' | 'dm'>('player');
  readonly recipientLabel = input<string>('');

  /**
   * Whether this viewer may write a secret onto the card. The DM delivers to any player, and a
   * player writes only their own — so the caller states it (the card here is named by id alone,
   * which says nothing about whose it is). It stays false unless a caller says otherwise, so a
   * card with no claim on it offers no way to write.
   */
  readonly canAdd = input<boolean>(false);

  readonly secretsChange = output<PlayerCardSecret[]>();

  @ViewChild('secretsRow', { static: false }) secretsRowRef!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  readonly adding = signal(false);
  readonly newSecret = signal('');
  readonly busyId = signal<string | null>(null);
  readonly selectedSecret = signal<PlayerCardSecret | null>(null);
  readonly draftContent = signal('');

  readonly isDm = computed(() => this.mode() === 'dm');

  constructor() {
    afterNextRender(() => this.initSwiper(), { injector: this.injector });

    effect(() => {
      const count = this.secrets().length;
      if (count === 0) {
        if (this.swiper) {
          this.swiper.destroy(true, true);
          this.swiper = null;
        }
        return;
      }
      if (this.swiper) {
        this.swiper.update();
        return;
      }
      afterNextRender(() => this.initSwiper(), { injector: this.injector });
    });
  }

  private initSwiper(): void {
    if (!this.secretsRowRef?.nativeElement) return;
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
    this.swiper = new Swiper(this.secretsRowRef.nativeElement, {
      modules: [FreeMode, Mousewheel],
      slidesPerView: 'auto',
      spaceBetween: 14,
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
      observeParents: true,
      watchOverflow: true,
    });
  }

  ngOnDestroy(): void {
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
  }

  openSecret(secret: PlayerCardSecret): void {
    this.shellSvc.openSecretDetailDrawer(
      secret,
      this.campaignId(),
      this.playerCardId(),
      this.portalColor(),
      this.mode(),
    );
  }

  onCardClick(secret: PlayerCardSecret): void {
    if (this.isDm()) {
      this.selectedSecret.set(secret);
      this.draftContent.set(secret.content);
      return;
    }
    this.openSecret(secret);
  }

  openCreate(): void {
    this.shellSvc.openPlayerSecretCreateDrawer(
      this.campaignId(),
      this.playerCardId(),
      this.portalColor(),
    );
  }

  startAdding(): void {
    this.newSecret.set('');
    this.adding.set(true);
  }

  cancelAdding(): void {
    this.adding.set(false);
    this.newSecret.set('');
  }

  deliver(): void {
    const content = this.newSecret().trim();
    if (!content || !this.isDm()) return;
    this.busyId.set('__new__');
    this.http.post<PlayerCardSecret>(this.secretsUrl(), { content }).subscribe({
      next: created => {
        this.busyId.set(null);
        this.newSecret.set('');
        this.adding.set(false);
        this.secretsChange.emit([...this.secrets(), created]);
      },
      error: () => this.busyId.set(null),
    });
  }

  saveEdit(): void {
    const secret = this.selectedSecret();
    if (!secret || secret.isShared) return;
    const content = this.draftContent().trim();
    if (!content) return;
    this.busyId.set(secret.id);
    this.http.put<PlayerCardSecret>(`${this.secretsUrl()}/${secret.id}`, { content }).subscribe({
      next: updated => {
        this.busyId.set(null);
        this.selectedSecret.set(updated);
        this.draftContent.set(updated.content);
        this.secretsChange.emit(this.secrets().map(s => (s.id === updated.id ? updated : s)));
      },
      error: () => this.busyId.set(null),
    });
  }

  private secretsUrl(): string {
    return `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${this.playerCardId()}/secrets`;
  }
}
