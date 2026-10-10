# Campaign v2 — Database Tables by Grid Area, Chronicle & Right-Drawer Content

Derived by tracing: v2 component → HTTP endpoint (or core service) → WebHost controller →
Logic command/query handler → Repository → table (`Repo\Repositories\{Read,Insert,Update,Delete}`).

Frontend shell: `frontend/cast-library-ui/src/app/layout/v2-campaign-shell/v2-campaign-shell.component.{ts,html}`.
Grid areas are the `div.grid-area.*` blocks; right-drawer content is the `<ng-template>` set fed to
`<cc-content-drawer #rightDrawer>`.

---

## 0. Shell-wide load (applies to every area)

| Endpoint | Controller → handler | Tables |
|---|---|---|
| `GET /api/campaigns/{id}` (owner) and `GET /api/campaigns/{id}/player` | `CampaignsController` → `GetCampaignDetailQueryHandler` / `GetPlayerCampaignDetailQueryHandler` → `CampaignReadRepository` (+ `CampaignPlayerReadRepository`) | `campaigns`, `campaign_players`, `users`, `campaign_location_instances`, `campaign_sublocation_instances`, `campaign_cast_instances`, `campaign_faction_instances`, `campaign_faction_cast_members`, `campaign_faction_instance_relationships`, `campaign_faction_sublocations`, `casts`, `locations`, `sublocations`, `factions` |

This aggregate read supplies the party panel's companions, the card-link picker's cards, the
faction navigation's memberships, etc., so those tables reappear below wherever the shell data
is the source.

---

## 1. `top-left` — Quicknotes (`cc-quicknotes`)

| Endpoint | Controller → handler | Tables |
|---|---|---|
| `GET/POST /api/campaigns/{id}/quicknote-queue` | `QuicknoteQueueController` → `GetQuicknoteQueueQueryHandler`, `CreateQuicknoteQueueItemCommandHandler` | `player_quicknote_queue` |
| `PUT/DELETE /api/campaigns/{id}/quicknote-queue/{id}` | `UpdateQuicknoteQueueItemCommandHandler`, `DeleteQuicknoteQueueItemCommandHandler` | `player_quicknote_queue` |
| `POST /api/campaigns/{id}/chronicles` ("send to chronicles") | `CampaignChroniclesController` → `AddChronicleCommandHandler` (+ `TimeOfDayReadRepository` day stamp) | `campaign_chronicles`, `campaign_time_of_day`, `campaign_tod_slices` |

**Tables:** `player_quicknote_queue`, `campaign_chronicles`, `campaign_time_of_day`, `campaign_tod_slices`

---

## 2. `top-middle` — Day counter (`app-cc-day-counter`) + World map (`app-cc-world-map`)

Day counter → `TimeOfDayController` (`/api/campaigns/{id}/time-of-day`):

| Endpoint | Handler | Tables |
|---|---|---|
| `GET`, `PUT` | `GetTimeOfDayQueryHandler`, `UpsertTimeOfDayCommandHandler` → `TimeOfDayReadRepository`, `TimeOfDayWriteRepository` | `campaign_time_of_day`, `campaign_tod_slices` |
| `PATCH cursor`, `PATCH advance-day` | `UpdateCursorPositionCommandHandler`, `AdvanceDayCommandHandler` | `campaign_time_of_day` |
| `PATCH slices/{sliceId}/player-notes`, `gm-notes` | `UpdateSlicePlayerNotesCommandHandler`, `UpdateSliceDmNotesCommandHandler` | `campaign_tod_slices` |

World map:
- Read: `campaign()?.worldMapImageUrl` from the shell's campaign detail → `campaigns` (URL derived from the image key, not a stored column).
- Upload: `POST /api/campaign/{id}/worldmap-image` → `v2CampaignController` → `UploadCampaignWorldMapImageCommandHandler` → `CampaignReadRepository` (reads `campaigns` for `dm_user_id`); the image bytes live in blob storage, not the DB.

**Tables:** `campaign_time_of_day`, `campaign_tod_slices`, `campaigns`

---

## 3. `top-right` — Party panel (`app-cc-party-panel`)

| Endpoint | Controller → handler → repo | Tables |
|---|---|---|
| `GET /api/campaigns/{id}/player-cards` | `PlayerCardsController` → `GetAllPlayerCardsQueryHandler` → `PlayerCardReadRepository`, `CurrencyBalanceReadRepository`, `CampaignReadRepository` | `player_cards`, `currency_transactions`, `campaigns` |

Companions come from the shell campaign detail (`campaign_cast_instances`, filtered by the party
anchor sublocation). Realtime updates arrive over SignalR (`GoldAwarded`, `InventoryItemPurchased`,
`PlayerCardTraitsChanged`) — no extra tables.

**Tables:** `player_cards`, `currency_transactions`, `campaigns` (+ `campaign_cast_instances` for companions)

---

## 4. `middle-left` — Faction navigation (`app-cc-card-faction-navigation`)

`v2CampaignFactionsController` (`/api/campaign/{id}/factions`) and legacy `CampaignsController`
faction routes:

| Endpoint group | Handler / repo | Tables |
|---|---|---|
| `GET /factions`, `/factions/{fid}` | `GetCampaignFactionInstancesQueryHandler`, `GetPlayerCampaignFactionInstancesQueryHandler`, `GetPartyCampaignFactionInstancesQueryHandler` → `CampaignReadRepository` | `campaign_faction_instances`, `campaign_faction_cast_members`, `campaign_faction_instance_relationships`, `factions` |
| `GET /factions/library`, `/factions/library/keywords` | `GetCampaignFactionLibraryQueryHandler`, `GetCampaignFactionLibraryKeywordCountsQueryHandler` → `FactionReadRepository`, `CampaignKeywordReadRepository` | `factions`, `campaign_keywords` |
| `POST /factions`, `PUT/DELETE /factions/{fid}`, `/visibility` | `AddFactionToCampaignCommandHandler`, `UpdateFactionInstanceCommandHandler`, `UpdateFactionInstanceVisibilityCommandHandler`, `DeleteFactionInstanceCommandHandler` → `CampaignInsertRepository`, `CampaignUpdateRepository`, `CampaignDeleteRepository` | `campaign_faction_instances` |
| `POST/PUT .../{fid}/{party}cast/...` (members + primary) | `AddFactionCastMemberCommandHandler`, `RemoveFactionCastMemberCommandHandler`, `SetFactionCastMemberPrimaryCommandHandler`, `ClearFactionCastMemberPrimaryCommandHandler` | `campaign_faction_cast_members` (+ `campaign_cast_instances`) |
| `POST/DELETE .../relationships/...` | `AddFactionRelationshipCommandHandler`, `RemoveFactionRelationshipCommandHandler` | `campaign_faction_instance_relationships` |

**Tables:** `campaign_faction_instances`, `campaign_faction_cast_members`, `campaign_faction_instance_relationships`, `factions`, `campaign_keywords`, `campaign_cast_instances`

> Note: `campaign_faction_sublocations` exists in the schema but has **zero** references in
> backend C# — it is not read or written by v2 (or anywhere).

---

## 5. `middle-middle` — Card navigation (`app-cc-card-navigation`)

Instances lists + visibility:
`v2CampaignLocationsController` (`/api/campaign/{id}/locationinstances`),
`v2CampaignSublocationsController` (`/api/campaign/{id}/sublocationinstances`),
`v2CampaignCastsController` (`/api/campaign/{id}/castinstances`).

| Endpoint group | Handler / repo | Tables |
|---|---|---|
| `GET /locationinstances`, `/sublocationinstances`, `/castinstances` | `GetCampaignLocationInstancesQueryHandler`, `GetCampaignSublocationInstancesQueryHandler`, `GetCampaignCastInstancesQueryHandler` → `CampaignReadRepository` | `campaign_location_instances`, `campaign_sublocation_instances`, `campaign_cast_instances` |
| `PATCH .../{id}/visibility` | `Update*VisibilityCommandHandler` → `CampaignUpdateRepository` | `campaign_location_instances`, `campaign_sublocation_instances`, `campaign_cast_instances` |
| `PUT/DELETE .../{id}` | `Update*InstanceCommandHandler`, `Delete*InstanceCommandHandler` → `CampaignUpdateRepository`, `CampaignDeleteRepository` | same instance tables |
| New-card flows reached here (`cc-cast-new-form`, `cc-location-new-form`, `cc-sublocation-new-form`, `cc-shop-inventory`) | `POST /api/cast`, `POST /api/locations`, `POST /api/sublocations`; `POST /api/campaigns/{id}/casts|locations|sublocations`; `POST /api/campaign-keywords` | `casts`, `locations`, `sublocations`, `campaign_cast_instances`, `campaign_location_instances`, `campaign_sublocation_instances`, `campaign_keywords` |

**Tables:** `campaign_location_instances`, `campaign_sublocation_instances` (+ `campaign_sublocation_shop_items`, read with the instance), `campaign_cast_instances` (+ on library/picker+create flows: `casts`, `locations`, `sublocations`, `sublocation_shop_items`, `campaign_keywords`)

---

## 6. `middle-right` — DM: Soundtracks (`app-cc-soundtracks`) · Player: My Character (`cc-my-character`)

### DM — Soundtracks
`SoundtracksController` (`/api/campaigns/{id}/soundtracks`), `AmbiancesController` (`/api/campaigns/{id}/ambiances`) → `Soundtrack*Repository`, `Ambiance*Repository`.

**Tables:** `campaign_soundtracks`, `campaign_ambiances`, `campaign_ambiance_items`
(Deleting a soundtrack also clears `campaign_storyline.soundtrack_ids` via `StorylineUpdateRepository`.)

### Player — My Character
| Endpoint | Controller → handler → repo | Tables |
|---|---|---|
| `GET /api/campaigns/{id}/player-cards/mine` | `PlayerCardsController` → `GetPlayerCardQueryHandler` → `PlayerCardReadRepository` | `player_cards` |
| `GET .../player-cards/{id}/traits` | `GetPlayerTraitsQueryHandler` → `PlayerCardTraitReadRepository` | `player_card_traits` |
| `GET .../player-cards/{id}/secrets` | `GetPlayerSecretsQueryHandler` → `PlayerCardSecretReadRepository` | `player_card_secrets` |

**Tables:** `player_cards`, `player_card_traits`, `player_card_secrets`

---

## 7. `bottom-left` — DM: Encounter Builder (`cc-encounter-builder`) · Player: Player Encounters (`cc-player-encounters`)

Both drive `EncounterService` → `/api/campaign/{campaignId}/encounters` (`CampaignEncountersController`
+ `v2CampaignEncountersController`) and `CardConditionService`.

| Endpoint group | Handler / repo | Tables |
|---|---|---|
| `GET /encounters`, `/{id}` | `GetCampaignEncountersQueryHandler`, `GetEncounterDetailQueryHandler` → `EncounterReadRepository` | `campaign_encounters`, `encounter_spots`, `encounter_combatants`, `encounter_combatant_conditions`, `player_card_conditions`, `campaign_trophies` |
| `POST /encounters`, spots, combatants | `CreateEncounterCommandHandler`, `CreateEncounterGroupCommandHandler`, `AddCombatantToEncounterCommandHandler`, `CreateEncounterSpotCommandHandler` → `EncounterInsertRepository` | `campaign_encounters`, `encounter_spots`, `encounter_combatants`, `campaign_trophies` |
| `PATCH` combatants / spots / order / initiative / turn / rename | `UpdateEncounterCombatantCommandHandler`, `ReorderEncounterSpotsCommandHandler`, `SetEncounterInitiativeCommandHandler`, `AdvanceEncounterTurnCommandHandler` → `EncounterUpdateRepository` | `encounter_combatants`, `encounter_spots`, `campaign_encounters` |
| `DELETE` encounter/spot/combatant | `RemoveEncounterCombatantCommandHandler`, `DeleteEncounterSpotCommandHandler`, `DeleteEncounterCommandHandler` → `EncounterDeleteRepository` | `campaign_encounters`, `encounter_spots`, `encounter_combatants` |
| end encounter (trophies + condition clear) | `EndEncounterCommandHandler` → `EncounterInsertRepository`, `EncounterUpdateRepository` | `campaign_trophies`, `encounter_combatant_conditions`, `player_card_conditions`, `campaign_encounters` |
| `.../combatants/{id}/conditions` | `Assign/RemoveEncounterCombatantConditionCommandHandler`, `GetEncounterCombatantConditionsQueryHandler` → `EncounterCombatantCondition*Repository` | `encounter_combatant_conditions` |
| cast-source images / info | `CastReadRepository`, `PlayerCardReadRepository` | `casts`, `player_cards` |

Player encounters also uses `PlayerFieldJournalService` (`/api/campaigns/{id}/field-journal`) — see §8.

**Tables:** `campaign_encounters`, `encounter_spots`, `encounter_combatants`, `encounter_combatant_conditions`, `player_card_conditions`, `campaign_trophies`, `casts`, `player_cards` (+ `conditions` for condition-name joins)

---

## 8. `bottom-middle` — DM: Storyline (`app-cc-storyline`) · Player: Field Journal (`cc-player-field-journal`)

### DM — Storyline
`CampaignEventsController` (`/api/campaigns/{id}/events`) → `Storyline*Repository`.

| Endpoint | Handler | Tables |
|---|---|---|
| `GET /events` | `GetCampaignStorylineItemsQueryHandler` → `StorylineReadRepository` | `campaign_storyline` |
| `POST /events`, `/events/handout` | `CreateCampaignStorylineCommandHandler`, `UploadCampaignStorylineHandoutCommandHandler` → `StorylineInsertRepository` | `campaign_storyline` |
| `PATCH /events/{id}`, `/details`, `/visibility`, `/archive-mark`, `PUT reorder` | `UpdateCampaignEventBodyCommandHandler`, `UpdateCampaignEventDetailsCommandHandler`, `UpdateStorylineVisibilityCommandHandler`, `UpdateStorylineArchiveMarkCommandHandler`, `ReorderCampaignEventsCommandHandler` → `StorylineUpdateRepository` | `campaign_storyline` |
| `DELETE /events/{id}` | `DeleteCampaignEventCommandHandler` → `StorylineDeleteRepository` | `campaign_storyline` |
| `POST /events/{id}/handout-image` | `UploadCampaignEventHandoutImageCommandHandler` | none (blob storage) |
| "send to chronicle" `POST /api/campaigns/{id}/chronicles` | `AddChronicleCommandHandler` → `StorylineChronicleArchiveStrategy` (`StorylineReadRepository`, `StorylineUpdateRepository`) + `CampaignChroniclesInsertRepository` | `campaign_storyline`, `campaign_chronicles` |

Visibility resolution (which cast/location a scene points at) also reads the campaign aggregate
(`campaign_cast_instances`, `campaign_sublocation_instances`).

### Player — Field Journal
`FieldJournalController` (`/api/campaigns/{id}/field-journal`) → `GetFieldJournalEntriesQueryHandler`,
`UpsertFieldJournalEntryCommandHandler` → `PlayerFieldJournalEntryReadRepository`,
`PlayerFieldJournalEntryUpdateRepository`.

**Tables:** `player_field_journal_entries` (the board also loads encounters — §7)

---

## 9. `bottom-right` — DM: Rules (`cc-rules`) · Player: Inventory (`cc-player-inventory`)

### DM — Rules
`CampaignRulesController` (`/api/campaigns/{id}/rules`) → `CampaignRuleReadRepository`, `CampaignRuleInsertRepository`, `CampaignRuleUpdateRepository`, `CampaignRuleDeleteRepository`, `CampaignRuleLinkInsertRepository`.

**Tables:** `campaign_rules`, `campaign_rule_links`

### Player — Inventory
| Endpoint | Controller → handler → repo | Tables |
|---|---|---|
| `GET /api/campaigns/{id}/player-cards/inventory/mine` | `PlayerCardsController` → `GetPlayerInventoryQueryHandler` → `PlayerCampaignInventoryReadRepository` | `player_campaign_inventory` |
| `GET /api/campaigns/{id}/player-cards/mine` | `GetPlayerCardQueryHandler` → `PlayerCardReadRepository` | `player_cards` |
| `POST /api/campaigns/{id}/player-cards/inventory/use` | `UseInventoryItemCommandHandler` → `PlayerCampaignInventoryUpdateRepository` | `player_campaign_inventory` |

**Tables:** `player_campaign_inventory`, `player_cards`

---

## 10. Campaign Chronicle drawer (`chroniclesContentTemplate` → `app-cc-campaign-chronicle-content`)

Opened from the radial nav (`openChroniclesDrawer`).

| Endpoint | Controller → handler → repo | Tables |
|---|---|---|
| `GET /api/campaigns/{id}/chronicles/feed?limit=200` | `CampaignChroniclesController` → `GetChronicleFeedQueryHandler` → `CampaignChroniclesFeedReadRepository` | `campaign_chronicles` |

Related (same controller, session/search variants not used by the drawer's initial load):
`GET /chronicles`, `/chronicles/sessions`, `/chronicles/sessions-paged` → `CampaignChroniclesReadRepository`
→ `campaign_session_archived`, `campaign_session_chronicles`.

**Tables:** `campaign_chronicles` (feed); `campaign_session_archived` + `campaign_session_chronicles` for the session/search variants.

---

## 11. Right-drawer content (all `<ng-template>`s fed to `#rightDrawer`)

| Template | Component | Endpoint(s) | Tables |
|---|---|---|---|
| `playerSecretsContentTemplate` | `app-cc-player-secrets-content` | `GET /api/campaigns/{id}/player-cards/{memberId}/secrets`, `POST /api/campaigns/{id}/gold-award` | `player_card_secrets`, `currency_transactions` |
| `partyGoldContentTemplate` | `app-cc-party-gold-content` | `POST /api/campaigns/{id}/gold-award` (`AwardCurrencyCommandHandler`) | `currency_transactions` |
| `playerInventoryContentTemplate` | `cc-player-inventory-content` | `POST /api/campaigns/{id}/player-cards/inventory/use` | `player_campaign_inventory` |
| `fieldJournalEntryContentTemplate` | `cc-field-journal-entry-content` | `PUT /api/campaigns/{id}/field-journal`; `CardConditionService` (`.../players/{card}/conditions`, `.../encounters/{id}/combatants/{id}/conditions`) | `player_field_journal_entries`, `player_card_conditions`, `encounter_combatant_conditions` |
| `myCharacterInfoContentTemplate` | `cc-my-character-info-content` | `GET /player-cards/mine`, `PUT /player-cards/{id}`, `POST /player-cards/{id}/image` | `player_cards` |
| `myCharacterMotivationsContentTemplate` | `cc-motivations-content` | `GET /player-cards/mine`; traits `GET/POST/PUT .../traits`, `PATCH .../toggle`, `.../toggle-shared` | `player_cards`, `player_card_traits` |
| `secretDetailContentTemplate` | `cc-secret-detail-content` | `.../player-cards/{id}/secrets` (PUT/DELETE) | `player_card_secrets` |
| `playerSecretCreateContentTemplate` | `cc-player-secret-create-content` | `POST .../player-cards/{id}/secrets` | `player_card_secrets` |
| `ambianceEditorContentTemplate` | `cc-soundtrack-content` | `/soundtracks`, `/ambiances` (GET/POST/PUT/DELETE) | `campaign_soundtracks`, `campaign_ambiances`, `campaign_ambiance_items` |
| `storylineCreateContentTemplate` / `storylineEditContentTemplate` | `app-cc-storyline-content` | `POST /events`, `/events/handout`, `POST /events/{id}/handout-image`, `PUT /events/{id}/details` | `campaign_storyline` |
| `storylineViewContentTemplate` | `app-cc-storyline-view` | none (renders the passed item) | — |
| `ruleDetailContentTemplate` | `cc-rule-detail-content` | `RuleLibraryService` `/rules` (GET/PUT/DELETE) | `campaign_rules`, `campaign_rule_links` |
| `ruleAddContentTemplate` | `cc-rule-add` | `POST /rules`, `POST /rules/link`, `GET /rules/available` | `campaign_rules`, `campaign_rule_links` |
| `worldMapContentTemplate` | `app-cc-worldmap-content` | none (client-side zoom of the image URL) | — |
| `chroniclesContentTemplate` | `app-cc-campaign-chronicle-content` | `GET /chronicles/feed` | `campaign_chronicles` |
| `encounterGroupPickerContentTemplate` | `cc-encounter-group-picker` | `CastIndexService` → `GET /api/cast/index` (the whole library, page after page); pick result → encounter add | `casts` (+ `campaign_encounters`, `encounter_spots`, `encounter_combatants` on confirm) |
| `conditionLibraryContentTemplate` | `cc-condition-add` | `ConditionLibraryService` → `/conditions`, `/conditions/available`, `/conditions/link` | `conditions`, `campaign_condition_links` |
| `conditionDetailContentTemplate` | `cc-condition-detail` | `ConditionLibraryService` → `/conditions`, `PUT /conditions/{id}`, `DELETE /conditions/{id}` | `conditions`, `campaign_condition_links` |
| `factionPickerContentTemplate` | `cc-faction-picker` | `GET /factions/library`, `/library/keywords`, `POST /factions` | `factions`, `campaign_keywords` (+ `campaign_faction_instances` on add) |
| `factionCastPickerContentTemplate` | `cc-faction-cast-picker` | `POST/PUT /campaign/{id}/factions/{fid}/{party}cast/{castId}` | `campaign_faction_cast_members` (+ `campaign_cast_instances`) |
| `locationPickerContentTemplate` | `cc-location-picker` | `GET /api/locations`, `GET /campaign/{id}/locationinstances`, `POST /campaigns/{id}/locations` | `locations`, `campaign_location_instances` (+ `campaign_keywords`) |
| `sublocationPickerContentTemplate` | `cc-sublocation-picker` | `GET /api/sublocations`, `GET /campaign/{id}/sublocationinstances`, `POST /campaigns/{id}/sublocations` | `sublocations`, `sublocation_shop_items`, `campaign_sublocation_instances`, `campaign_sublocation_shop_items` (+ `campaign_keywords`) |
| `castPickerContentTemplate` | `cc-cast-picker` | `GET /api/cast`, `GET /campaign/{id}/castinstances`, `POST /campaigns/{id}/casts`, `POST /api/cast` | `casts`, `campaign_cast_instances` (+ `campaign_keywords`) |
| `castTravelPickerContentTemplate` | `cc-cast-travel-picker` | `POST /campaigns/{id}/casts/{castInstanceId}/travel` (`TravelCastInstanceCommandHandler`) | `campaign_cast_instances` (+ campaign read for party-anchor lookup) |
| `combatantDetailsContentTemplate` | `cc-combatant-details` | `GET /campaigns/{id}/player-cards`; `EncounterService` combatant update / conditions | `player_cards`, `encounter_combatants`, `encounter_combatant_conditions`, `player_card_conditions` |
| `cardLinkContentTemplate` | `cc-card-link-picker` | writes via the subject's own save callback (whoever opened it) | subject-dependent: `campaign_location_instances` / `campaign_sublocation_instances` / `campaign_cast_instances` / `campaign_faction_instances` (`linked_entities`), or `player_quicknote_queue`, `campaign_storyline` |
| `inspectorContentTemplate` | `cc-signalr-inspector` | `GET /api/admin/signalr/state`, `POST /api/admin/signalr/clear` | none (in-memory `SignalRInspector`) |
| `eventDetailContentTemplate` | `cc-signalr-event-detail` | none (renders a captured broadcast row) | — |

Left-side drawers in the same shell (for completeness, not "right"): `#inspectorDrawer`
(`cc-signalr-inspector`) and `#eventDrawer` (`cc-signalr-event-detail`) — both table-less.

---

## 12. Distinct table inventory (whole v2 shell)

`campaigns`, `campaign_players`, `users`, `campaign_location_instances`, `campaign_sublocation_instances`,
`campaign_sublocation_shop_items`, `campaign_cast_instances`, `campaign_faction_instances`,
`campaign_faction_cast_members`, `campaign_faction_instance_relationships`, `casts`, `locations`,
`sublocations`, `sublocation_shop_items`, `factions`, `campaign_keywords`, `player_cards`,
`player_card_traits`, `player_card_secrets`, `player_card_conditions`, `player_campaign_inventory`,
`currency_transactions`, `campaign_encounters`, `encounter_spots`, `encounter_combatants`,
`encounter_combatant_conditions`, `campaign_trophies`, `conditions`, `campaign_condition_links`,
`campaign_rules`, `campaign_rule_links`, `campaign_storyline`, `campaign_chronicles`,
`campaign_session_archived`, `campaign_session_chronicles`, `campaign_time_of_day`, `campaign_tod_slices`,
`player_field_journal_entries`, `player_quicknote_queue`, `campaign_soundtracks`, `campaign_ambiances`,
`campaign_ambiance_items`.

(43 tables. `campaign_faction_sublocations` is a schema-only table with no backend references, so it is
excluded.)

---

## 13. Diff vs. the supplied table set

Tables in the supplied set that are **not** used by v2 campaign (17):

1. `admin_invite_codes`
2. `audit_logs`
3. `bug_reports`
4. `campaign_invite_codes`
5. `campaign_player_faction_relationships`
6. `campaign_player_notes`
7. `campaign_secrets`
8. `campaign_sessions`
9. `castcards_configuration`
10. `faction_participants`
11. `faction_relationships`
12. `password_reset_tokens`
13. `player_card_memories`
14. `player_cast_notes`
15. `player_cast_perceptions`
16. `pricing_model`
17. `subscriptions`

Nothing in the v2 set is missing from the supplied set (v2 is a subset of it).

### Why each is not part of v2

| Table | Where it actually lives |
|---|---|
| `admin_invite_codes` | admin invitation flow — no backend references currently |
| `audit_logs` | `AuditLoggingMiddleware` (global) + `AdminController` / `AuthController` / `SubscriptionController`; infra, not a v2 feature |
| `bug_reports` | `BugReportsController` (global bug reporting, not campaign) |
| `campaign_invite_codes` | invite/settings endpoints on `CampaignsController` / `v2CampaignSettingsController` (campaign library), not the v2 shell |
| `campaign_player_faction_relationships` | no backend references (legacy/dead) |
| `campaign_player_notes` | v1 player notes on cards; only reached now via `EndSessionCommandHandler` → `MigrateStorylineToChroniclesCommandHandler` (session-end migration) |
| `campaign_secrets` | DM campaign secrets managed by the v2 component `cc-secrets-manager`, but that component is mounted only by the **legacy** root-drawer detail components (`shared/components/right-drawer/*-detail-content`) which the v2 cards open through the shared `DrawerService` — not the v2 shell's own grid/right drawer |
| `campaign_sessions` | v1 session journaling (`SessionsController`); the v2 shell only reads archived sessions/chronicles |
| `castcards_configuration` | site/card configuration (`SiteConfigurationController`) |
| `faction_participants` | no backend references (legacy/dead) |
| `faction_relationships` | no backend references (legacy/dead) |
| `password_reset_tokens` | auth (`AuthController`) |
| `player_card_memories` | v1 player sheet "memories" (`PlayerCardsController` memories endpoints); no v2 caller |
| `player_cast_notes` | `PlayerCastNotesController` v1 player cast notes; no v2 caller |
| `player_cast_perceptions` | v1 player cast perceptions; no v2 caller |
| `pricing_model` | subscription pricing (`SiteConfigurationController`) |
| `subscriptions` | account/subscription (`SubscriptionController`, Stripe) |

### Boundary calls worth a second look

- **`campaign_secrets`** — a *v2 component* (`cc-secrets-manager`) does call `GET/POST/PUT/DELETE /api/campaign/{id}/secrets`, but it is only instantiated inside the legacy card-detail drawers reached via the shared root drawer. If you count "any v2 component, wherever mounted", `campaign_secrets` moves into the v2 column.
- **`audit_logs`** — written by global middleware on essentially every API request, including v2 requests. It is infrastructure, not a v2 feature, so it is listed as not-v2 here.
- **`campaign_player_notes`** — reachable from v2 only indirectly through session-end migration, so listed as not-v2.
