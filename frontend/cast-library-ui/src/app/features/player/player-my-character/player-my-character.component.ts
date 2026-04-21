import { Component, OnInit, OnDestroy, signal, computed, inject, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../../shared/components/campaign-dropdown/campaign-dropdown.component';
import { CharacterEditorComponent } from '../../../shared/components/character-editor/character-editor.component';
import { CharacterInfoEditorComponent, PlayerCardInfoUpdate } from '../../../shared/components/character-info-editor/character-info-editor.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerCampaignShellComponent } from '../player-campaign-shell/player-campaign-shell.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import {
  PlayerCard,
  PlayerCardWithDetails,
  PlayerCardCondition,
  PlayerCardSecret,
  PlayerMemory,
  PlayerTrait,
  PlayerCastPerception,
  DiscoveredCastResponse,
} from '../../../shared/models/player-card.model';

type Tab = 'chronicle' | 'cast' | 'soul' | 'secrets';
type CastFilter = 'all' | 'party' | 'people' | 'places';
const MEMORY_TYPE_META: Record<PlayerMemory['memoryType'], { icon: string; label: string }> = {
  KEY_EVENT:  { icon: '★', label: 'Key Event' },
  ENCOUNTER:  { icon: '⚔', label: 'Encounter' },
  DISCOVERY:  { icon: '🔍', label: 'Discovery' },
  DECISION:   { icon: '⚖', label: 'Decision' },
  LOSS:       { icon: '💀', label: 'Loss' },
  BOND:       { icon: '❤', label: 'Bond' },
};

@Component({
  selector: 'app-player-my-character',
  standalone: true,
  imports: [CommonModule, FormsModule, CardFlipComponent, CampaignDropdownComponent, CharacterEditorComponent, CharacterInfoEditorComponent],
  templateUrl: './player-my-character.component.html',
  styleUrl: './player-my-character.component.scss',
})
export class PlayerMyCharacterComponent implements OnInit, OnDestroy {
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
  showCharacterEditor = signal(false);
  showInfoEditor      = signal(false);

  portalColor = signal(this.transition.spineColor);

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  activeTab = signal<Tab>('cast');

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

  // ── Soul tab ─────────────────────────────────────────────────────────────────
  traits        = signal<PlayerTrait[]>([]);
  showAddTrait  = signal(false);
  newTraitType  = signal<PlayerTrait['traitType']>('GOAL');
  newTraitContent = signal('');

  goals  = computed(() => this.traits().filter(t => t.traitType === 'GOAL'));
  fears  = computed(() => this.traits().filter(t => t.traitType === 'FEAR'));
  flaws  = computed(() => this.traits().filter(t => t.traitType === 'FLAW'));

  // ── Secrets tab ──────────────────────────────────────────────────────────────
  secrets        = signal<PlayerCardSecret[]>([]);
  heldSecrets    = computed(() => this.secrets().filter(s => !s.isShared));
  partySecrets   = computed(() => this.secrets().filter(s => s.isShared));
  sharingSecretId = signal<string | null>(null);

  // ── View Secrets modal ───────────────────────────────────────────────────────
  viewingSecretsFor = signal<PlayerCardWithDetails | null>(null);
  memberSecrets     = signal<PlayerCardSecret[]>([]);
  secretsLoading    = signal(false);

  // ── Cast tab ─────────────────────────────────────────────────────────────────
  discoveredCast  = signal<DiscoveredCastResponse | null>(null);
  perceptions     = signal<PlayerCastPerception[]>([]);
  castFilter      = signal<CastFilter>('all');
  castSearch      = signal('');
  editingPerceptionKey = signal<string | null>(null);
  editingPerceptionText = signal('');

  filteredPeople = computed(() => {
    const cast = this.discoveredCast();
    if (!cast) return [];
    const q = this.castSearch().toLowerCase();
    const filter = this.castFilter();
    if (filter === 'party' || filter === 'places') return [];
    return cast.people.filter(p =>
      (filter === 'all' || filter === 'people') &&
      (!q || p.name.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q))
    );
  });

  filteredLocations = computed(() => {
    const cast = this.discoveredCast();
    if (!cast) return [];
    const q = this.castSearch().toLowerCase();
    const filter = this.castFilter();
    if (filter === 'party' || filter === 'people') return [];
    return cast.locations.filter(l =>
      (filter === 'all' || filter === 'places') &&
      (!q || l.name.toLowerCase().includes(q))
    );
  });

  filteredSublocations = computed(() => {
    const cast = this.discoveredCast();
    if (!cast) return [];
    const q = this.castSearch().toLowerCase();
    const filter = this.castFilter();
    if (filter === 'party' || filter === 'people') return [];
    return cast.sublocations.filter(l =>
      (filter === 'all' || filter === 'places') &&
      (!q || l.name.toLowerCase().includes(q))
    );
  });

  filteredParty = computed(() => {
    const cast = this.discoveredCast();
    if (!cast) return [];
    const q = this.castSearch().toLowerCase();
    const filter = this.castFilter();
    if (filter === 'people' || filter === 'places') return [];
    const myCardId = this.playerCardId();
    return cast.partyCards.filter(p =>
      p.id !== myCardId &&
      (filter === 'all' || filter === 'party') &&
      (!q || p.name.toLowerCase().includes(q))
    );
  });

  constructor() {
    effect(() => {
      const event = this.hub.playerSecretDeleted();
      if (!event) return;
      const myCardId = untracked(() => this.playerCardId());
      if (event.playerCardId !== myCardId) return;
      this.secrets.update(list => list.filter(s => s.id !== event.secretId));
    });

    effect(() => {
      const event = this.hub.secretDelivered();
      if (!event) return;
      const myUserId   = untracked(() => this.auth.currentUser()?.id);
      const campaignId = untracked(() => this.campaignId());
      if (!myUserId || event.playerUserId !== myUserId) return;
      this.loadSecrets(campaignId);
    });

    effect(() => {
      const event = this.hub.conditionAssigned();
      if (!event) return;
      const myCardId = untracked(() => this.playerCardId());
      if (event.playerCardId === myCardId) {
        this.conditions.update(list => [...list, {
          id: event.conditionId,
          playerCardId: event.playerCardId,
          conditionName: event.conditionName,
          assignedAt: event.assignedAt,
        }]);
      } else {
        this.discoveredCast.update(cast => {
          if (!cast) return cast;
          return {
            ...cast,
            partyCards: cast.partyCards.map(p =>
              p.id === event.playerCardId
                ? { ...p, conditions: [...p.conditions, { id: event.conditionId, playerCardId: event.playerCardId, conditionName: event.conditionName, assignedAt: event.assignedAt }] }
                : p
            ),
          };
        });
      }
    });

    effect(() => {
      const event = this.hub.conditionRemoved();
      if (!event) return;
      const myCardId = untracked(() => this.playerCardId());
      if (event.playerCardId === myCardId) {
        this.conditions.update(list => list.filter(c => c.id !== event.conditionId));
      } else {
        this.discoveredCast.update(cast => {
          if (!cast) return cast;
          return {
            ...cast,
            partyCards: cast.partyCards.map(p =>
              p.id === event.playerCardId
                ? { ...p, conditions: p.conditions.filter(c => c.id !== event.conditionId) }
                : p
            ),
          };
        });
      }
    });
  }

  ngOnInit() {
    this.transition.hide();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.shellService.setCrumbs([
      { label: '← Locations', action: () => this.goBack() }
    ]);
    this.shellService.setTitle('My Character');

    this.loadPlayerCard(id);
    this.loadCast(id);

    const tab = this.route.snapshot.queryParamMap.get('tab') as Tab | null;
    if (tab) this.activeTab.set(tab);
  }

  ngOnDestroy() {
    if (this.newMemoryDebounce) clearTimeout(this.newMemoryDebounce);
  }

  private loadPlayerCard(id: string) {
    this.http.get<PlayerCard & { conditions: PlayerCardCondition[] }>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/mine`
    ).subscribe({
      next: card => {
        this.playerCardId.set(card.id);
        this.playerCard.set(card);
        this.conditions.set(card.conditions ?? []);
        this.loadPerceptions(id, card.id);
        if (this.activeTab() === 'secrets' && this.secrets().length === 0) this.loadSecrets(id);
      },
      error: () => {
        this.playerCard.set(null);
      },
    });
  }

  private loadPerceptions(campaignId: string, playerCardId: string) {
    this.http.get<PlayerCastPerception[]>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/perceptions`
    ).subscribe(p => this.perceptions.set(p));
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    const id = this.campaignId();
    if (tab === 'chronicle' && this.memories().length === 0) this.loadMemories(id);
    if (tab === 'soul'      && this.traits().length === 0)   this.loadTraits(id);
    if (tab === 'secrets'   && this.secrets().length === 0)  this.loadSecrets(id);
    if (tab === 'cast'      && !this.discoveredCast())       this.loadCast(id);
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

  // ── Soul ─────────────────────────────────────────────────────────────────────
  private loadTraits(campaignId: string) {
    const playerCardId = this.playerCardId();
    this.http.get<PlayerTrait[]>(`${environment.apiUrl}/api/campaigns/${campaignId}/player-cards/${playerCardId}/traits`)
      .subscribe(t => this.traits.set(t));
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

  // ── Cast ─────────────────────────────────────────────────────────────────────
  private loadCast(id: string) {
    this.http.get<PlayerCardWithDetails[]>(`${environment.apiUrl}/api/campaigns/${id}/player-cards/party`)
      .subscribe(cards => this.discoveredCast.set({
        partyCards: cards,
        people: [],
        locations: [],
        sublocations: [],
      }));
  }

  perceptionFor(key: string): string {
    return this.perceptions().find(p =>
      p.castInstanceId === key || p.locationInstanceId === key || p.sublocationInstanceId === key
    )?.impression ?? '';
  }

  startEditPerception(key: string) {
    this.editingPerceptionKey.set(key);
    this.editingPerceptionText.set(this.perceptionFor(key));
  }

  cancelEditPerception() {
    this.editingPerceptionKey.set(null);
    this.editingPerceptionText.set('');
  }

  savePerception(instanceId: string, entityType: 'cast' | 'location' | 'sublocation') {
    const id = this.campaignId();
    const impression = this.editingPerceptionText().trim();
    const body: any = { impression };
    if (entityType === 'cast')        body.castInstanceId        = instanceId;
    if (entityType === 'location')    body.locationInstanceId    = instanceId;
    if (entityType === 'sublocation') body.sublocationInstanceId = instanceId;

    const playerCardId = this.playerCardId();
    this.http.post<PlayerCastPerception>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${playerCardId}/perceptions`, body
    ).subscribe(p => {
      this.perceptions.update(list => {
        const idx = list.findIndex(x =>
          x.castInstanceId === instanceId ||
          x.locationInstanceId === instanceId ||
          x.sublocationInstanceId === instanceId
        );
        return idx >= 0 ? list.map((x, i) => i === idx ? p : x) : [...list, p];
      });
      this.editingPerceptionKey.set(null);
    });
  }

  // ── View Secrets modal ───────────────────────────────────────────────────────
  viewSecrets(member: PlayerCardWithDetails) {
    this.viewingSecretsFor.set(member);
    this.secretsLoading.set(true);
    const id = this.campaignId();
    this.http.get<PlayerCardSecret[]>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/${member.id}/secrets/shared`
    ).subscribe({
      next: s => { this.memberSecrets.set(s); this.secretsLoading.set(false); },
      error: () => this.secretsLoading.set(false),
    });
  }

  closeSecretsModal() {
    this.viewingSecretsFor.set(null);
    this.memberSecrets.set([]);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  goBack() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }

  onPortraitUploaded(url: string) {
    const card = this.playerCard();
    if (card) this.playerCard.set({ ...card, imageUrl: url });
  }

  onInfoSaved(data: PlayerCardInfoUpdate) {
    const card = this.playerCard();
    if (card) this.playerCard.set({ ...card, name: data.name, race: data.race, class: data.class, description: data.description ?? undefined });
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
