import { Component, OnInit, OnDestroy, signal, computed, inject, effect, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { type CampaignDropdownOption } from '../../../shared/components/campaign-dropdown/campaign-dropdown.component';
import { CharacterInfoEditorComponent, PlayerCardInfoUpdate } from '../../../shared/components/character-info-editor/character-info-editor.component';
import { LockIconComponent } from '../../../shared/components/lock-icon/lock-icon.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerCampaignShellComponent } from '../player-campaign-shell/player-campaign-shell.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import {
  PlayerCard,
  PlayerCardCondition,
  PlayerCardSecret,
  PlayerMemory,
  PlayerTrait,
} from '../../../shared/models/player-card.model';

type Tab = 'motive' | 'secrets';
const MEMORY_TYPE_META: Record<PlayerMemory['memoryType'], { icon: string; label: string }> = {
  KEY_EVENT:  { icon: '/icons/chronicle/key_event.svg',  label: 'Key Event' },
  ENCOUNTER:  { icon: '/icons/chronicle/encounter.svg',  label: 'Encounter' },
  DISCOVERY:  { icon: '/icons/chronicle/discovery.svg',  label: 'Discovery' },
  DECISION:   { icon: '/icons/chronicle/decision.svg',   label: 'Decision' },
  LOSS:       { icon: '/icons/chronicle/loss.svg',       label: 'Loss' },
  BOND:       { icon: '/icons/chronicle/bond.svg',       label: 'Bond' },
};

@Component({
  selector: 'app-player-character',
  standalone: true,
  imports: [CommonModule, FormsModule, CharacterInfoEditorComponent, LockIconComponent],
  templateUrl: './player-character.component.html',
  styleUrl: './player-character.component.scss',
})
export class PlayerCharacterComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private hub        = inject(CampaignHubService);
  private shell      = inject(PlayerCampaignShellComponent);
  private shellService = inject(PlayerCampaignShellService);
  auth               = inject(AuthService);

  campaignId   = signal('');
  playerCardId = signal('');

  // ── Player card ──────────────────────────────────────────────────────────────
  playerCard          = signal<PlayerCard | null>(null);
  conditions          = signal<PlayerCardCondition[]>([]);
  showCharacterEditor     = signal(false);
  showInfoEditor          = signal(false);
  descriptionExpanded     = signal(false);
  portraitUploading       = signal(false);

  portalColor = signal(this.transition.spineColor);

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  activeTab = signal<Tab>('secrets');

  // ── Chronicle tab ────────────────────────────────────────────────────────────
  memories      = signal<PlayerMemory[]>([]);
  showAddMemory = signal(false);
  memorySearch  = signal('');
  memoryTypes   = Object.keys(MEMORY_TYPE_META) as PlayerMemory['memoryType'][];
  memoryTypeMeta = MEMORY_TYPE_META;

  memoryTypeOptions: CampaignDropdownOption[] = this.memoryTypes.map(t => ({
    value: t,
    label: MEMORY_TYPE_META[t].label,
    icon: MEMORY_TYPE_META[t].icon,
  }));

  traitTypeOptions: CampaignDropdownOption[] = [
    { value: 'GOAL', label: 'Goal' },
    { value: 'FEAR', label: 'Fear' },
    { value: 'FLAW', label: 'Flaw' },
  ];

  filteredMemories = computed(() => {
    const q = this.memorySearch().toLowerCase().trim();
    if (!q) return this.memories();
    return this.memories().filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.detail ?? '').toLowerCase().includes(q) ||
      this.formatMemoryDate(m.memoryDate).toLowerCase().includes(q)
    );
  });

  newMemoryType: PlayerMemory['memoryType'] = 'KEY_EVENT';
  newMemoryTitle = '';
  newMemoryDetail = '';

  private memoryNextSession = computed(() => this.memories().length + 1);
  private newMemoryDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Motive tab ─────────────────────────────────────────────────────────────────
  traits        = signal<PlayerTrait[]>([]);
  showAddTrait  = signal(false);
  newTraitType  = signal<PlayerTrait['traitType']>('GOAL');
  newTraitContent = signal('');
  isEditingMotive = signal(false);
  motiveSaving    = signal(false);
  motiveSaveError = signal<string | null>(null);

  // Inline add for goals, fears, flaws
  addingGoal    = signal(false);
  newGoalContent = signal('');
  addingFear    = signal(false);
  newFearContent = signal('');
  addingFlaw    = signal(false);
  newFlawContent = signal('');

  goals  = computed(() => this.traits().filter(t => t.traitType === 'GOAL'));
  fears  = computed(() => this.traits().filter(t => t.traitType === 'FEAR'));
  flaws  = computed(() => this.traits().filter(t => t.traitType === 'FLAW'));

  // ── Secrets tab ──────────────────────────────────────────────────────────────
  secrets        = signal<PlayerCardSecret[]>([]);
  heldSecrets    = computed(() => this.secrets().filter(s => !s.isShared));
  partySecrets   = computed(() => this.secrets().filter(s => s.isShared));
  sharingSecretId = signal<string | null>(null);

  private hubSubscriptions: Subscription[] = [];

  constructor() {
    this.hubSubscriptions.push(
      this.hub.playerSecretDeleted$.subscribe(event => {
        if (!event) return;
        const myCardId = untracked(() => this.playerCardId());
        if (event.playerCardId !== myCardId) return;
        this.secrets.update(list => list.filter(s => s.id !== event.secretId));
      })
    );

    this.hubSubscriptions.push(
      this.hub.secretDelivered$.subscribe(event => {
        if (!event) return;
        const myUserId   = untracked(() => this.auth.currentUser()?.id);
        const campaignId = untracked(() => this.campaignId());
        if (!myUserId || event.playerUserId !== myUserId) return;
        this.loadSecrets(campaignId);
      })
    );

    this.hubSubscriptions.push(
      this.hub.conditionAssigned$.subscribe(event => {
        if (!event) return;
        const myCardId = untracked(() => this.playerCardId());
        if (event.playerCardId === myCardId) {
          this.conditions.update(list => [...list, {
            id: event.conditionId,
            playerCardId: event.playerCardId,
            conditionName: event.conditionName,
            assignedAt: event.assignedAt,
          }]);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.conditionRemoved$.subscribe(event => {
        if (!event) return;
        const myCardId = untracked(() => this.playerCardId());
        if (event.playerCardId === myCardId) {
          this.conditions.update(list => list.filter(c => c.id !== event.conditionId));
        }
      })
    );
  }

  ngOnInit() {
    this.transition.hide();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.shellService.setTitleContext({ pageType: 'player-party', campaignId: id, campaignName: this.shellService.campaign()?.name, baseRoute: '/player/campaign', location: null });

    this.loadPlayerCard(id);

    const tab = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (tab) this.activeTab.set(tab);
  }

  ngOnDestroy() {
    if (this.newMemoryDebounce) clearTimeout(this.newMemoryDebounce);
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadPlayerCard(id: string) {
    this.http.get<PlayerCard & { conditions: PlayerCardCondition[] }>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/mine`
    ).subscribe({
      next: card => {
        this.playerCardId.set(card.id);
        this.playerCard.set(card);
        this.conditions.set(card.conditions ?? []);
        if (this.activeTab() === 'secrets' && this.secrets().length === 0) this.loadSecrets(id);
      },
      error: () => {
        this.playerCard.set(null);
      },
    });
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    const id = this.campaignId();
    if (tab === 'motive'      && this.traits().length === 0)   this.loadTraits(id);
    if (tab === 'secrets'   && this.secrets().length === 0)  this.loadSecrets(id);
  }

  // ── Chronicle ────────────────────────────────────────────────────────────────
  private loadMemories(campaignId: string) {
    const playerCardId = this.playerCardId();
    this.http.get<PlayerMemory[]>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/memories`)
      .subscribe(m => this.memories.set(m));
  }

  onMemoryTitleInput(value: string) {
    this.newMemoryTitle = value;
  }

  onMemoryDetailInput(value: string) {
    this.newMemoryDetail = value;
  }

  get nextSessionNumber(): number {
    return this.memoryNextSession();
  }

  addMemory() {
    if (!this.newMemoryTitle.trim()) return;
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    const today = new Date();
    const memoryDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.http.post<PlayerMemory>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/memories`, {
      memoryType:    this.newMemoryType,
      sessionNumber: this.nextSessionNumber,
      title:         this.newMemoryTitle.trim(),
      detail:        this.newMemoryDetail.trim() || null,
      memoryDate,
    }).subscribe(m => {
      this.memories.update(list => [m, ...list]);
      this.newMemoryType = 'KEY_EVENT';
      this.newMemoryTitle = '';
      this.newMemoryDetail = '';
      this.showAddMemory.set(false);
    });
  }

  deleteMemory(memoryId: string) {
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    this.http.delete(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/memories/${memoryId}`)
      .subscribe(() => this.memories.update(list => list.filter(m => m.id !== memoryId)));
  }

  memoryIcon(type: PlayerMemory['memoryType']): string {
    return MEMORY_TYPE_META[type].icon;
  }

  memoryLabel(type: PlayerMemory['memoryType']): string {
    return MEMORY_TYPE_META[type].label;
  }

  formatMemoryDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Motive ─────────────────────────────────────────────────────────────────────
  private loadTraits(campaignId: string) {
    const playerCardId = this.playerCardId();
    this.http.get<PlayerTrait[]>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/traits`)
      .subscribe(t => this.traits.set(t));
  }

  showAddTraitForm(type: PlayerTrait['traitType']) {
    this.newTraitType.set(type);
    this.showAddTrait.set(true);
  }

  // Inline add methods for goals, fears, flaws
  startAddingGoal() {
    this.newGoalContent.set('');
    this.addingGoal.set(true);
  }

  cancelAddingGoal() {
    this.addingGoal.set(false);
  }

  confirmAddGoal() {
    const content = this.newGoalContent().trim();
    if (!content) return;
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    this.http.post<PlayerTrait>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/traits`, {
      traitType: 'GOAL',
      content,
    }).subscribe(t => {
      this.traits.update(list => [...list, t]);
      this.newGoalContent.set('');
      this.addingGoal.set(false);
    });
  }

  startAddingFear() {
    this.newFearContent.set('');
    this.addingFear.set(true);
  }

  cancelAddingFear() {
    this.addingFear.set(false);
  }

  confirmAddFear() {
    const content = this.newFearContent().trim();
    if (!content) return;
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    this.http.post<PlayerTrait>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/traits`, {
      traitType: 'FEAR',
      content,
    }).subscribe(t => {
      this.traits.update(list => [...list, t]);
      this.newFearContent.set('');
      this.addingFear.set(false);
    });
  }

  startAddingFlaw() {
    this.newFlawContent.set('');
    this.addingFlaw.set(true);
  }

  cancelAddingFlaw() {
    this.addingFlaw.set(false);
  }

  confirmAddFlaw() {
    const content = this.newFlawContent().trim();
    if (!content) return;
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    this.http.post<PlayerTrait>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/traits`, {
      traitType: 'FLAW',
      content,
    }).subscribe(t => {
      this.traits.update(list => [...list, t]);
      this.newFlawContent.set('');
      this.addingFlaw.set(false);
    });
  }

  addTrait() {
    const content = this.newTraitContent().trim();
    if (!content) return;
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    this.http.post<PlayerTrait>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/traits`, {
      traitType: this.newTraitType(),
      content,
    }).subscribe(t => {
      this.traits.update(list => [...list, t]);
      this.newTraitContent.set('');
      this.newTraitType.set('GOAL');
      this.showAddTrait.set(false);
    });
  }

  deleteTrait(traitId: string) {
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    this.http.delete(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/traits/${traitId}`)
      .subscribe(() => this.traits.update(list => list.filter(t => t.id !== traitId)));
  }

  toggleGoal(trait: PlayerTrait) {
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    this.http.post(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/traits/${trait.id}/toggle`, {})
      .subscribe(() => {
        this.traits.update(list =>
          list.map(t => t.id === trait.id ? { ...t, isCompleted: !t.isCompleted } : t)
        );
      });
  }

  // ── Secrets ──────────────────────────────────────────────────────────────────
  private loadSecrets(campaignId: string) {
    const playerCardId = this.playerCardId();
    this.http.get<PlayerCardSecret[]>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/secrets`)
      .subscribe(s => this.secrets.set(s));
  }

  shareSecret(secretId: string) {
    const campaignId   = this.campaignId();
    const playerCardId = this.playerCardId();
    this.sharingSecretId.set(secretId);
    this.http.post(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/secrets/${secretId}/share`, {})
      .subscribe({
        next: () => {
          this.secrets.update(list =>
            list.map(s => s.id === secretId
              ? { ...s, isShared: true, sharedBy: 'PLAYER', sharedAt: new Date().toISOString() }
              : s
            )
          );
          this.sharingSecretId.set(null);
        },
        error: () => this.sharingSecretId.set(null),
      });
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  goToParty() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'the-party']);
  }

  onPortraitFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.portraitUploading.set(true);
    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ imageUrl: string }>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${this.playerCardId()}/image`,
      formData
    ).subscribe({
      next: res => {
        this.portraitUploading.set(false);
        this.onPortraitUploaded(res.imageUrl);
      },
      error: () => this.portraitUploading.set(false),
    });
  }

  onPortraitUploaded(url: string) {
    const card = this.playerCard();
    if (card) {
      const cacheBustedUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
      this.playerCard.set({ ...card, imageUrl: cacheBustedUrl });
    }
  }

  onInfoSaved(data: PlayerCardInfoUpdate) {
    const card = this.playerCard();
    if (card) this.playerCard.set({ ...card, name: data.name, race: data.race, class: data.class, description: data.description ?? undefined });
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
