import { Component, OnInit, OnDestroy, signal, inject, computed, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Cast } from '../../../shared/models/cast.model';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { KeywordInputComponent } from '../../../shared/components/keyword-input/keyword-input.component';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

interface CastSecret {
  id?: string;
  content: string;
  editing: boolean;
}

interface AddedCast {
  cast:       Cast;
  instanceId: string;
  secrets:    CastSecret[];
  keywords:   string[];
}

@Component({
  selector: 'app-campaign-cast-editor',
  standalone: true,
  imports: [CommonModule, CardFlipComponent, KeywordInputComponent, DmNavComponent],
  templateUrl: './campaign-cast-editor.component.html',
  styleUrl: './campaign-cast-editor.component.scss'
})
export class CampaignCastEditorComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private http   = inject(HttpClient);
  router = inject(Router);

  @ViewChild('mainCard')        mainCardRef!:       ElementRef<HTMLElement>;
  @ViewChild('mainCardWrapper') mainCardWrapperRef!: ElementRef<HTMLElement>;
  @ViewChild('selectedStack')   selectedStackRef!:  ElementRef<HTMLElement>;
  @ViewChild('deckStack')       deckStackRef!:      ElementRef<HTMLElement>;

  campaignId          = '';
  locationInstanceId  = '';
  sublocationInstanceId  = '';
  allCast              = signal<Cast[]>([]);
  addedCast            = signal<AddedCast[]>([]);
  allCampaignCastIds   = signal<Set<string>>(new Set());
  deckIdx   = signal(0);
  expandedIdx    = signal(0);
  loading        = signal(true);
  isSwapping     = false;
  allDmKeywords  = signal<string[]>([]);
  castSearch     = signal('');

  private keywordSaveTimer?: ReturnType<typeof setTimeout>;

  private readonly SEL_PEEK = 46;
  private readonly SEL_FULL = 220;

  deckCast = computed(() => {
    const usedIds = this.allCampaignCastIds();
    return this.allCast().filter(n => !usedIds.has(n.id));
  });

  filteredDeckCast = computed(() => {
    const term = this.castSearch().trim().toLowerCase();
    const deck = this.deckCast();
    if (!term) return deck;
    return deck.filter(n =>
      [n.name, n.role, n.race, n.alignment, n.posture, n.description]
        .some(f => f?.toLowerCase().includes(term))
    );
  });

  currentCard = computed(() => {
    const deck = this.filteredDeckCast();
    if (!deck.length) return null;
    return deck[this.deckIdx() % deck.length];
  });

  selTopsList = computed(() => {
    const n      = this.addedCast().length;
    const expIdx = this.expandedIdx();
    return Array.from({ length: n }, (_, j) =>
      j * this.SEL_PEEK + (expIdx !== -1 && j > expIdx ? this.SEL_FULL - this.SEL_PEEK : 0)
    );
  });

  selContainerHeight = computed(() => {
    const tops = this.selTopsList();
    const n    = tops.length;
    if (!n) return 0;
    return tops[n - 1] + this.SEL_FULL;
  });

  expandedAddedCast = computed(() => this.addedCast()[this.expandedIdx()] ?? null);

  ngOnInit() {
    this.campaignId         = this.route.snapshot.paramMap.get('id')                 ?? '';
    this.locationInstanceId = this.route.snapshot.paramMap.get('locationId')         ?? '';
    this.sublocationInstanceId = this.route.snapshot.paramMap.get('sublocationInstanceId') ?? '';

    this.http.get<{ keywords: string[] }>(`${environment.apiUrl}/api/users/keywords`)
      .subscribe(r => this.allDmKeywords.set(r.keywords));

    forkJoin({
      cast:     this.http.get<Cast[]>(`${environment.apiUrl}/api/cast`),
      campaign: this.http.get<any>(`${environment.apiUrl}/api/campaigns/${this.campaignId}`),
    }).subscribe(({ cast, campaign }) => {
      this.allCast.set(cast);

      const allCastInsts: any[] = campaign.casts ?? [];

      // Exclude cast already settled at any sublocation other than this one
      this.allCampaignCastIds.set(
        new Set(
          allCastInsts
            .filter((inst: any) => inst.sublocationInstanceId !== this.sublocationInstanceId)
            .map((inst: any) => inst.sourceCastId)
            .filter(Boolean)
        )
      );

      const added: AddedCast[] = allCastInsts
        .filter((inst: any) => inst.sublocationInstanceId === this.sublocationInstanceId)
        .map((inst: any) => {
          const foundCast = cast.find((n: Cast) => n.id === inst.sourceCastId);
          if (!foundCast) return null;
          const secrets: CastSecret[] = (campaign.secrets ?? [])
            .filter((s: any) => s.castInstanceId === inst.instanceId)
            .map((s: any) => ({ id: s.id, content: s.content, editing: false }));
          return { cast: foundCast, instanceId: inst.instanceId, secrets, keywords: inst.keywords ?? [] };
        })
        .filter(Boolean) as AddedCast[];
      this.addedCast.set(added);
      this.loading.set(false);
    });
  }

  setCastSearch(term: string) {
    this.castSearch.set(term);
    this.deckIdx.set(0);
  }

  swapCastCard() {
    if (this.isSwapping) return;
    const deck = this.filteredDeckCast();
    if (deck.length <= 1) return;
    this.isSwapping = true;
    const card = this.mainCardRef?.nativeElement;
    if (!card) { this.isSwapping = false; return; }

    card.style.transition = 'transform 0.27s cubic-bezier(0.4,0,1,1), opacity 0.22s ease-in';
    card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
    card.style.opacity    = '0';

    setTimeout(() => {
      this.deckIdx.update(i => (i + 1) % deck.length);
      card.style.transition = 'none';
      card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
      card.style.opacity    = '0';
      void card.offsetWidth;
      card.style.transition = 'transform 0.30s cubic-bezier(0,0,0.2,1), opacity 0.25s ease-out';
      card.style.transform  = 'translateX(0) scale(1) rotate(0deg)';
      card.style.opacity    = '1';
      setTimeout(() => { this.isSwapping = false; }, 300);
    }, 270);
  }

  addCastToSelected() {
    if (this.isSwapping) return;
    const cast = this.currentCard();
    if (!cast) return;
    this.isSwapping = true;
    const card = this.mainCardRef?.nativeElement;
    if (!card) { this.isSwapping = false; return; }

    const currentCount = this.addedCast().length;
    this._ghostSlideAdd(card, currentCount, () => { this.isSwapping = false; });

    card.style.opacity    = '0';
    card.style.transition = 'none';

    const newDeckLen = this.deckCast().length - 1;
    if (newDeckLen > 0) {
      this.deckIdx.update(i => i % newDeckLen);
      void card.offsetWidth;
      card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
      void card.offsetWidth;
      card.style.transition = 'transform 0.34s cubic-bezier(0,0,0.2,1), opacity 0.28s ease-out';
      card.style.transform  = 'translateX(0) scale(1) rotate(0deg)';
      card.style.opacity    = '1';
    }

    this.http.post<{ instanceId: string }>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/casts`,
      { castId: cast.id, locationInstanceId: this.locationInstanceId, sublocationInstanceId: this.sublocationInstanceId }
    ).subscribe({ next: resp => {
      this.allCampaignCastIds.update(ids => new Set([...ids, cast.id]));
      this.addedCast.update(list => [...list, { cast, instanceId: resp.instanceId, secrets: [], keywords: [] }]);
      this.expandedIdx.set(this.addedCast().length - 1);
    }});
  }

  removeCastSelected(index: number) {
    const added      = this.addedCast()[index];
    const card       = this._getSelCardEl(index);
    const deckIsEmpty = this.deckCast().length === 0;
    const target     = deckIsEmpty ? this.mainCardWrapperRef?.nativeElement
                                   : this.deckStackRef?.nativeElement;
    if (card) {
      this._ghostSlideRemove(card, target ?? null, () => this._doRemove(index, added));
    } else {
      this._doRemove(index, added);
    }
  }

  toggleExpanded(index: number) {
    this.expandedIdx.update(i => i === index ? -1 : index);
  }

  ngOnDestroy() {
    clearTimeout(this.keywordSaveTimer);
  }

  updateCastKeywords(keywords: string[]) {
    const added = this.expandedAddedCast();
    if (!added) return;
    this.addedCast.update(list =>
      list.map(a => a.instanceId === added.instanceId ? { ...a, keywords } : a)
    );
    this.allDmKeywords.update(pool => Array.from(new Set([...pool, ...keywords])));
    this._scheduleCastKeywordSave(added.instanceId);
  }

  goBack() {
    this.router.navigate([
      '/dm/campaigns', this.campaignId,
      'locations', this.locationInstanceId, 'sublocations',
    ]);
  }

  addCastSecret() {
    const added = this.expandedAddedCast();
    if (!added) return;
    this.addedCast.update(list =>
      list.map(a => a.instanceId === added.instanceId
        ? { ...a, secrets: [...a.secrets, { content: '', editing: true }] }
        : a)
    );
  }

  updateCastSecretContent(secretIndex: number, value: string) {
    const added = this.expandedAddedCast();
    if (!added) return;
    this.addedCast.update(list =>
      list.map(a => a.instanceId === added.instanceId
        ? { ...a, secrets: a.secrets.map((s, i) => i === secretIndex ? { ...s, content: value } : s) }
        : a)
    );
  }

  confirmCastSecret(secretIndex: number) {
    const added = this.expandedAddedCast();
    if (!added) return;
    const secret = added.secrets[secretIndex];
    if (!secret?.content.trim()) { this.cancelCastSecret(secretIndex); return; }
    if (secret.id) return;

    this.http.post<{ id: string }>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/secrets`, {
      entityType: 'Cast',
      instanceId: added.instanceId,
      content:    secret.content,
    }).subscribe({
      next: resp => {
        this.addedCast.update(list =>
          list.map(a => a.instanceId === added.instanceId
            ? { ...a, secrets: a.secrets.map((s, i) => i === secretIndex ? { ...s, id: resp.id, editing: false } : s) }
            : a)
        );
      },
      error: () => {
        // leave editing: true so user can retry
      },
    });
  }

  cancelCastSecret(secretIndex: number) {
    const added = this.expandedAddedCast();
    if (!added) return;
    this.addedCast.update(list =>
      list.map(a => a.instanceId === added.instanceId
        ? { ...a, secrets: a.secrets.filter((_, i) => i !== secretIndex) }
        : a)
    );
  }

  deleteCastSecret(secretIndex: number) {
    const added  = this.expandedAddedCast();
    if (!added) return;
    const secret = added.secrets[secretIndex];
    if (secret.id) {
      this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId}/secrets/${secret.id}`).subscribe();
    }
    this.addedCast.update(list =>
      list.map(a => a.instanceId === added.instanceId
        ? { ...a, secrets: a.secrets.filter((_, i) => i !== secretIndex) }
        : a)
    );
  }

  private _scheduleCastKeywordSave(instanceId: string) {
    clearTimeout(this.keywordSaveTimer);
    this.keywordSaveTimer = setTimeout(() => {
      const current = this.addedCast().find(a => a.instanceId === instanceId);
      if (!current) return;
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${this.campaignId}/casts/${instanceId}/keywords`,
        { keywords: current.keywords }
      ).subscribe();
    }, 600);
  }

  private _doRemove(index: number, added: AddedCast) {
    this.allCampaignCastIds.update(ids => { const next = new Set(ids); next.delete(added.cast.id); return next; });
    this.addedCast.update(list => list.filter((_, i) => i !== index));
    const newLen = this.addedCast().length;
    this.expandedIdx.update(i => Math.min(i, newLen - 1));
    const idx = this.deckCast().findIndex(n => n.id === added.cast.id);
    if (idx !== -1) this.deckIdx.set(idx);

    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId}/casts/${added.instanceId}`).subscribe();
  }

  private _getSelCardEl(index: number): HTMLElement | null {
    const stack = this.selectedStackRef?.nativeElement;
    if (!stack) return null;
    return stack.querySelector(`[data-sel-idx="${index}"]`) as HTMLElement | null;
  }

  private _ghostSlideAdd(card: HTMLElement, currentCount: number, onDone: () => void) {
    const r     = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: 'fixed', top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '1000', pointerEvents: 'none', transition: 'none',
    });
    document.body.appendChild(ghost);

    const stackEl  = this.selectedStackRef?.nativeElement;
    const stackR   = stackEl?.getBoundingClientRect();
    const destTop  = stackR ? stackR.top  + currentCount * this.SEL_PEEK : r.top  + 400;
    const destLeft = stackR ? stackR.left : r.left;
    const dx = destLeft - r.left;
    const dy = destTop  - r.top;

    void ghost.offsetWidth;
    ghost.style.transition = 'transform 0.52s cubic-bezier(0.4,0,0.55,1), opacity 0.15s ease 0.4s';
    ghost.style.transform  = `translate(${dx}px,${dy}px)`;
    ghost.style.opacity    = '0';
    setTimeout(() => { ghost.remove(); onDone(); }, 580);
  }

  private _ghostSlideRemove(card: HTMLElement, targetEl: HTMLElement | null, onDone: () => void) {
    const r     = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: 'fixed', top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '1000', pointerEvents: 'none', transition: 'none',
    });
    document.body.appendChild(ghost);

    card.style.transition    = 'none';
    card.style.opacity       = '0';
    card.style.pointerEvents = 'none';

    const targetR  = targetEl?.getBoundingClientRect();
    const destTop  = targetR ? targetR.top  + targetR.height * 0.1 : r.top  - 300;
    const destLeft = targetR ? targetR.left + targetR.width  * 0.05 : r.left - 300;
    const dx = destLeft - r.left;
    const dy = destTop  - r.top;

    void ghost.offsetWidth;
    ghost.style.transition = 'transform 0.46s cubic-bezier(0.4,0,0.55,1), opacity 0.15s ease 0.33s';
    ghost.style.transform  = `translate(${dx}px,${dy}px) scale(0.76)`;
    ghost.style.opacity    = '0';
    setTimeout(() => { ghost.remove(); onDone(); }, 520);
  }
}
