# Removed tables — code cleanup list

## 1. SQL changes applied

**8 tables removed:**

| Table | Was defined in |
|---|---|
| `faction_relationships` | `init.sql` |
| `campaign_player_faction_relationships` | `init.sql` |
| `faction_participants` | `init.sql` |
| `admin_invite_codes` | `init.sql` |
| `campaign_sessions` | `init.sql` |
| `player_card_memories` | `init.sql` |
| `campaign_player_notes` | `init.sql` |
| `player_cast_notes` | `v2Alter.sql` |

**Edits made**

- `backend/CastLibrary.Initializer/init.sql` — removed the 7 table blocks above (+ their indexes/comments).
- `backend/CastLibrary.Initializer/v2Alter.sql` — removed the `player_cast_notes` section (header, table, index, `COMMENT`s).
- `backend/CastLibrary.Initializer/alter.sql` — removed the now-dead `campaign_sessions` column-drop `DO $$` block, and appended a "Retired tables" block:
  ```sql
  DROP TABLE IF EXISTS player_cast_notes CASCADE;
  DROP TABLE IF EXISTS campaign_player_notes CASCADE;
  DROP TABLE IF EXISTS player_card_memories CASCADE;
  DROP TABLE IF EXISTS campaign_sessions CASCADE;
  DROP TABLE IF EXISTS admin_invite_codes CASCADE;
  DROP TABLE IF EXISTS faction_participants CASCADE;
  DROP TABLE IF EXISTS campaign_player_faction_relationships CASCADE;
  DROP TABLE IF EXISTS faction_relationships CASCADE;
  ```
  (alter.sql runs after init.sql and before v2Alter.sql; since the `CREATE`s are gone, dropping here is
  correct for both fresh and existing databases.)

Backups of the three pre-edit files: `.tmp-preview/sql-backup/`.

## 2. Repositories to remove (12 files — each touches only a removed table)

| # | File | Interface | Class |
|---|---|---|---|
| 1 | `CastLibrary.Repository/Repositories/Read/SessionReadRepository.cs` | `ISessionReadRepository` | `SessionReadRepository` |
| 2 | `CastLibrary.Repository/Repositories/Insert/SessionInsertRepository.cs` | `ISessionInsertRepository` | `SessionInsertRepository` |
| 3 | `CastLibrary.Repository/Repositories/Update/SessionUpdateRepository.cs` | `ISessionUpdateRepository` | `SessionUpdateRepository` |
| 4 | `CastLibrary.Repository/Repositories/Delete/SessionDeleteRepository.cs` | `IActiveSessionDeleteRepository` | `SessionDeleteRepository` |
| 5 | `CastLibrary.Repository/Repositories/Read/PlayerCardMemoryReadRepository.cs` | `IPlayerCardMemoryReadRepository` | `PlayerCardMemoryReadRepository` |
| 6 | `CastLibrary.Repository/Repositories/Insert/PlayerCardMemoryInsertRepository.cs` | `IPlayerCardMemoryInsertRepository` | `PlayerCardMemoryInsertRepository` |
| 7 | `CastLibrary.Repository/Repositories/Delete/PlayerCardMemoryDeleteRepository.cs` | `IPlayerCardMemoryDeleteRepository` | `PlayerCardMemoryDeleteRepository` |
| 8 | `CastLibrary.Repository/Repositories/Read/PlayerNotesReadRepository.cs` | `IPlayerNotesReadRepository` | `PlayerNotesReadRepository` |
| 9 | `CastLibrary.Repository/Repositories/Delete/PlayerNotesDeleteRepository.cs` | `IPlayerNotesDeleteRepository` | `PlayerNotesDeleteRepository` |
| 10 | `CastLibrary.Repository/Repositories/Update/CampaignPlayerNotesUpdateRepository.cs` | `ICampaignPlayerNotesUpdateRepository` | `CampaignPlayerNotesUpdateRepository` |
| 11 | `CastLibrary.Repository/Repositories/Read/PlayerCastNoteReadRepository.cs` | `IPlayerCastNoteReadRepository` | `PlayerCastNoteReadRepository` |
| 12 | `CastLibrary.Repository/Repositories/Update/PlayerCastNoteUpdateRepository.cs` | `IPlayerCastNoteUpdateRepository` | `PlayerCastNoteUpdateRepository` |

## 3. Mappers that become unused (remove with the repos)

- `CastLibrary.Repository/Mappers/PlayerCardMemoryEntityMapper.cs` (`IPlayerCardMemoryEntityMapper`)
- `CastLibrary.Repository/Mappers/CampaignPlayerNotesEntityMapper.cs` (`ICampaignPlayerNotesEntityMapper`)
- `CastLibrary.Repository/Mappers/PlayerCastNoteEntityMapper.cs` (`IPlayerCastNoteEntityMapper`)

## 4. DI registrations to remove — `CastLibrary.WebHost/IoC/IOCRepository.cs`

Lines **66, 67, 68** (memory), **91, 92** (player cast note), **95, 96, 97** (player notes),
**108, 109, 110, 116** (session), **143, 149, 151** (mappers).

> Keep line **115** (`ISessionDeleteRepository → CampaignSessionArchivedDeleteRepository`) — it is a
> different repository for the **kept** `campaign_session_archived` table.

## 5. Tables with NO repository (SQL-only removal — nothing to delete in code)

`admin_invite_codes`, `campaign_player_faction_relationships`, `faction_participants`, `faction_relationships`.

## 6. Coupled consumers — EDIT, do not blindly delete

| File | Coupling |
|---|---|
| `CastLibrary.WebHost/Controllers/SessionsController.cs` | Also serves `GET /sessions/archived` from the **kept** `campaign_session_archived`; remove only the active-session endpoints + session repo/handler injections |
| `CastLibrary.Logic/Commands/Session/EndSessionCommandHandler.cs` | Writes `campaign_session_archived` (kept) and calls `IMigrateStorylineToChroniclesCommandHandler`; only the `ISessionUpdateRepository`/`ISessionReadRepository` use goes |
| `CastLibrary.Logic/Commands/CampaignChronicles/MigrateStorylineToChroniclesCommandHandler.cs` | Writes `campaign_session_chronicles` (kept); drop `IGetAllPlayerNotesQueryHandler` + `IPlayerNotesDeleteRepository` |
| `CastLibrary.Logic/Commands/PlayerNotes/MigratePlayerNoteToChronicleCommandHandler.cs` | Writes `campaign_session_chronicles` + reads archived sessions (kept); drop `ICampaignPlayerNotesUpdateRepository` |
| `CastLibrary.WebHost/Controllers/PlayerCardsController.cs` | Shared controller — remove only the `.../memories` endpoints and their injections |

## 7. Fully-removable consumers (dedicated to a removed table)

- `CastLibrary.Logic/Commands/PlayerCard/AddMemoryCommandHandler.cs`
- `CastLibrary.Logic/Commands/PlayerCard/DeleteMemoryCommandHandler.cs`
- `CastLibrary.Logic/Queries/PlayerCard/GetPlayerMemoriesQueryHandler.cs`
- `CastLibrary.Logic/Commands/Cast/UpsertMyPlayerCastNoteCommandHandler.cs`
- `CastLibrary.Logic/Queries/Cast/GetMyPlayerCastNotesQueryHandler.cs`
- `CastLibrary.WebHost/Controllers/PlayerCastNotesController.cs`
- `CastLibrary.Logic/Commands/Session/StartSessionCommandHandler.cs`, `UpdateSessionCommandHandler.cs`, `CancelSessionCommandHandler.cs` (+ their `*Command.cs`)
- `CastLibrary.Logic/Queries/PlayerNotes/GetAllPlayerNotesQuery.cs` + `GetAllPlayerNotesQueryHandler.cs` (unused once the migrate handler is edited)
- `CastLibrary.Logic/Factories/PlayerNoteChronicleFactory.cs`
- Shared domains: `PlayerNoteDomain.cs`, `CampaignPlayerNotesDomain.cs`, `PlayerCardMemoryDomain.cs`, `PlayerCastNoteDomain.cs`, `SessionDomain.cs`
- Shared entities: `CampaignPlayerNotesEntity.cs`, `PlayerCardMemoryEntity.cs`, `PlayerCastNoteEntity.cs`
- WebHost mappers: `PlayerCastNoteMapper.cs`; the memory section of `PlayerCardWebMapper.cs`
- Shared responses: `SessionResponse` / memory / player-cast-note response DTOs (if unused elsewhere)
- Frontend services now stranded: `core/session.service.ts`, `core/player-cast-note.service.ts`

---

## 8. Executed cleanup (reference tree removed up to the endpoints)

### Deleted — backend (56 files)

**Repositories (12)** — `CastLibrary.Repository/Repositories/`: `Read/SessionReadRepository.cs`, `Insert/SessionInsertRepository.cs`, `Update/SessionUpdateRepository.cs`, `Delete/SessionDeleteRepository.cs`, `Read/PlayerCardMemoryReadRepository.cs`, `Insert/PlayerCardMemoryInsertRepository.cs`, `Delete/PlayerCardMemoryDeleteRepository.cs`, `Read/PlayerNotesReadRepository.cs`, `Delete/PlayerNotesDeleteRepository.cs`, `Update/CampaignPlayerNotesUpdateRepository.cs`, `Read/PlayerCastNoteReadRepository.cs`, `Update/PlayerCastNoteUpdateRepository.cs`.

**Orphaned session-archive repositories (4)** — removed once their only callers (the session lifecycle / migration handlers) went: `Insert/CampaignSessionArchivedInsertRepository.cs`, `Insert/CampaignSessionChroniclesInsertRepository.cs`, `Read/CampaignSessionChroniclesReadRepository.cs`, `Mappers/CampaignSessionChroniclesEntityMapper.cs`.

**Repository mappers (3)** — `Mappers/PlayerCardMemoryEntityMapper.cs`, `Mappers/CampaignPlayerNotesEntityMapper.cs`, `Mappers/PlayerCastNoteEntityMapper.cs`.

**Logic (17)** — `Commands/Session/{StartSessionCommandHandler, UpdateSessionCommandHandler, UpdateSessionCommand.cs, CancelSessionCommandHandler, EndSessionCommandHandler, EndSessionCommand.cs}`, `Commands/PlayerCard/{AddMemoryCommandHandler, DeleteMemoryCommandHandler}`, `Queries/PlayerCard/GetPlayerMemoriesQueryHandler.cs`, `Commands/Cast/UpsertMyPlayerCastNoteCommandHandler.cs`, `Queries/Cast/GetMyPlayerCastNotesQueryHandler.cs`, `Commands/PlayerNotes/{MigratePlayerNoteToChronicleCommand.cs, MigratePlayerNoteToChronicleCommandHandler.cs}`, `Queries/PlayerNotes/{GetAllPlayerNotesQuery.cs, GetAllPlayerNotesQueryHandler.cs}`, `Commands/CampaignChronicles/MigrateStorylineToChroniclesCommandHandler.cs`, `Factories/PlayerNoteChronicleFactory.cs`, `Factories/StorylineChronicleFactory.cs`.

**Controller (1)** — `WebHost/Controllers/PlayerCastNotesController.cs`.
**Mapper (1)** — `WebHost/Mappers/PlayerCastNoteMapper.cs`.

**Shared (17)** — Domain: `SessionDomain.cs`, `PlayerCardMemoryDomain.cs`, `PlayerNoteDomain.cs`, `CampaignPlayerNotesDomain.cs`, `PlayerCastNoteDomain.cs`. Entities: `CampaignPlayerNotesEntity.cs`, `PlayerCardMemoryEntity.cs`, `PlayerCastNoteEntity.cs`. Enums: `MemoryType.cs`. Requests: `AddMemoryRequest.cs`, `UpsertPlayerCastNoteRequest.cs`, `MigratePlayerNoteToChronicleRequest.cs`, `StartSessionRequest.cs`, `EndSessionRequest.cs`, `UpdateSessionRequest.cs`. Responses: `PlayerCardMemoryResponse.cs`, `PlayerCastNoteResponse.cs`.

### Deleted — frontend (4 files)
`core/session.service.ts`, `core/session-context.service.ts`, `core/player-cast-note.service.ts`, `shared/models/session.model.ts`.

### Edited
| File | Change |
|---|---|
| `WebHost/Controllers/SessionsController.cs` | Rewritten: only `GET /sessions/archived` remains (reads kept `campaign_session_archived`) |
| `WebHost/Controllers/PlayerCardsController.cs` | Removed `.../memories` GET/POST/DELETE + the 3 memory injections |
| `WebHost/Controllers/CampaignChroniclesController.cs` | Removed `POST migrate-player-note` + its injection + `using` |
| `WebHost/Mappers/PlayerCardWebMapper.cs` | Rewritten without the memory mapping method |
| `Shared/Responses/SessionResponse.cs` | Removed `SessionResponse`; kept `ArchivedSessionResponse` |
| `WebHost/IoC/IOCRepository.cs` | Removed 12 repo + 3 mapper + 4 session-archive registrations |
| `WebHost/IoC/IOCLogic.cs` | Removed 9 handler/factory registrations + 3 dead `using`s |
| `shared/models/player-card.model.ts` | Removed `PlayerMemory` interface |

### Verification
- `dotnet build CastLibrary.slnx` → **Build succeeded, 0 errors**.
- `npx ng build --configuration development` → **Application bundle generation complete**.

### Consequence to note
`campaign_session_archived` / `campaign_session_chronicles` are still **read** (by `CampaignChroniclesReadRepository`
and `CampaignSessionArchivedReadRepository`), but nothing **writes** them any more — the writers were the
session lifecycle (`EndSession`) and the two migrate handlers. They now contain only pre-existing rows.

---

## 9. Second pass — `campaign_session_archived` / `campaign_session_chronicles` retired

### SQL
- **`init.sql`** — removed both `CREATE TABLE` blocks (+ indexes), the two `keywords` `ALTER TABLE`s, and the two trigram (GIN) indexes for these tables.
- **`alter.sql`** — removed the `keywords`-migration blocks (`DO $$` / `ALTER` / indexes / trigram) for both tables; added to the Retired-tables block:
  ```sql
  DROP TABLE IF EXISTS campaign_session_chronicles CASCADE;
  DROP TABLE IF EXISTS campaign_session_archived CASCADE;
  ```
- **`v2Alter.sql`** — untouched (no references).

### Backend deleted (23 files)

**Repositories (4):** `Read/CampaignChroniclesReadRepository.cs`, `Read/CampaignSessionArchivedReadRepository.cs`, `Update/CampaignChroniclesUpdateRepository.cs`, `Update/CampaignSessionArchivedDeleteRepository.cs`.

**Logic (8):** `Queries/CampaignChronicles/{GetChroniclesQuery, GetChroniclesSessionsQuery, GetChroniclesSessionsPagedQuery}.cs`, `Commands/CampaignChronicles/{UpdateChronicleCommand, UpdateChronicleCommandHandler, DeleteSessionCommand, DeleteSessionCommandHandler}.cs`, `Factories/ChroniclesFactory.cs`.

**Shared (9):** `Domain/{CampaignSessionArchivedDomain, CampaignSessionChroniclesDomain}.cs`, `Entities/CampaignSessionChroniclesEntity.cs`, `Requests/UpdateChronicleRequest.cs`, `Responses/{ChroniclesResponse, ChroniclesRowEntity, ChroniclesSessionResponse, SessionRowEntity, SessionResponse}.cs`.

**Controllers (2):** `SessionsController.cs` (deleted), `CampaignChroniclesController.cs` (rewritten down to `GET /chronicles/feed` + `POST /chronicles`).

### DI
- `IOCRepository.cs`: removed `ICampaignSessionArchivedReadRepository`, `ICampaignChroniclesReadRepository`, `ICampaignChroniclesUpdateRepository`, `ISessionDeleteRepository`.
- `IOCLogic.cs`: removed `IUpdateChronicleCommandHandler`, `IGetChroniclesQuery*Handler` (3), `IDeleteSessionCommandHandler`, `IChroniclesFactory`.

### Kept (the live v2 standalone chronicle)
`campaign_chronicles` table; `CampaignChroniclesInsertRepository`, `CampaignChroniclesFeedReadRepository`, `CampaignChronicleFeedFactory`, `AddChronicleCommandHandler`, `GetChronicleFeedQueryHandler`, `ChronicleMapper`, `CreateChronicleRequest`, `CampaignChroniclesDomain/Entity`.

### Verification
- `dotnet build CastLibrary.slnx` → **Build succeeded, 0 errors**.
- No frontend caller for any removed endpoint (`/chronicles` paged/sessions, `PATCH /chronicles/{id}`, `DELETE /chronicles/sessions/{id}`, `/sessions/*`).



