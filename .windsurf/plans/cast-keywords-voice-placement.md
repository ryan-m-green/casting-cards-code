# Cast Keywords: Replace voice_placement + campaign_keywords table

## Decisions (confirmed)
- Rename `casts.voice_placement` -> `casts.keywords` (TEXT[]) in the **library cast** only.
  - Leave `campaign_cast_instances.voice_placement` as-is.
- New `campaign_keywords` table (do NOT touch `users.keywords`).
- New `cc-keyword-tags` component (not extending `cc-campaign-dropdown`).
- "Journal page" = `/gm/cast/new` cast form, GM Eyes Only section.

## Backend

### 1. Schema
- `init.sql`: rename `casts.voice_placement` -> `casts.keywords`.
- `init.sql` + `alter.sql`: add:
```sql
CREATE TABLE IF NOT EXISTS campaign_keywords (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dm_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_type  VARCHAR(20) NOT NULL CHECK (card_type IN ('location','sublocation','cast','faction')),
    keyword    VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dm_user_id, card_type, keyword)
);

CREATE INDEX IF NOT EXISTS idx_campaign_keywords_keyword_trgm
    ON campaign_keywords USING gin (keyword gin_trgm_ops);
```
- `alter.sql`: rename existing `casts.voice_placement` -> `casts.keywords` (preserve data).

### 2. Library cast rename (`VoicePlacement` -> `Keywords`)
Files:
- `CastLibrary.Shared/Entities/CastEntity.cs`
- `CastLibrary.Shared/Domain/CastDomain.cs`
- `CastLibrary.Repository/Mappers/CastEntityMapper.cs`
- `CastLibrary.Shared/Requests/CreateCastRequest.cs`
- `CastLibrary.Shared/Responses/CastResponse.cs`
- `CastLibrary.WebHost/Mappers/CastWebMapper.cs`
- `CastLibrary.Logic/Factories/CastFactory.cs`
- `CastLibrary.Logic/Commands/Cast/UpdateCastCommandHandler.cs`
- `CastLibrary.Repository/Repositories/Insert/CastInsertRepository.cs`
- `CastLibrary.Repository/Repositories/Update/CastUpdateRepository.cs`
- `CastLibrary.Repository/Repositories/Read/CastReadRepository.cs`
- `CastLibrary.Shared/Requests/LibraryBundle.cs` (`CastCard`)
- `CastLibrary.Logic/Factories/CastCardFactory.cs`
- `CastLibrary.Logic/Factories/LibraryBundleTemplateFactory.cs`
- `CastLibrary.Logic/Commands/Library/ImportLibraryCommandHandler.cs`
- `CastLibrary.Logic/Factories/CastInstanceFactory.cs` (copy `source.Keywords` -> instance `Keywords`; set `VoicePlacement = []`)

### 3. campaign_keywords persistence + query
- `CastLibrary.Repository/Repositories/Read/CampaignKeywordReadRepository.cs`
  - `Task<string[]> GetKeywordsAsync(Guid dmUserId, string? cardType)`
- `CastLibrary.Repository/Repositories/Insert/CampaignKeywordInsertRepository.cs`
  - `Task MergeKeywordsAsync(Guid dmUserId, string cardType, string[] keywords)`
- `CastLibrary.Logic/Queries/Campaign/GetCampaignKeywordsQueryHandler.cs`
- `CastLibrary.WebHost/Controllers/CampaignKeywordsController.cs`
  - `GET /api/campaign-keywords?cardType=cast` -> `{ keywords: string[] }`
- DI: register repos in `IOCRepository`, query handler in `IOCLogic`.

### 4. Wire persistence
- `CreateCastCommandHandler` + `UpdateCastCommandHandler`: after cast save, merge keywords into `campaign_keywords` with `cardType = "cast"`.
- Existing campaign instance keyword handlers (`UpdateLocationInstanceKeywordsCommandHandler`, `UpdateCastInstanceKeywordsCommandHandler`, `UpdateSublocationInstanceKeywordsCommandHandler`): also merge into `campaign_keywords` with their card type (leave existing `users.keywords` calls untouched).

## Frontend

### 5. Model
- `cast.model.ts`: rename `Cast.voicePlacement` -> `keywords`; add explicit `voicePlacement` to `CampaignCastInstance`.

### 6. New component
- `shared/components/v2/cc-keyword-tags/`
  - Inputs: `options: string[]`, `label`, `placeholder`, `disabled`.
  - Output: `keywordsChange: string[]`.
  - CVA for `string[]`; chips + free-text input (Enter/comma) + dropdown select from existing.

### 7. Cast form integration
- `cast-form.component.ts`: replace `voicePlacement` with `keywords`; load distinct keywords from `GET /api/campaign-keywords?cardType=cast`; add `cc-keyword-tags` to GM Eyes Only fieldset.
- `cast-form.component.html`: add `<cc-keyword-tags>` in the fieldset.