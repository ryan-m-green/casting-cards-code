# v1 (non-v2) API endpoints remaining, and the frontend areas that call them

A call is matched by HTTP verb + path; `_(none)_` means no frontend reference was found in `src/app`.
Callers are tagged with the frontend **area** they belong to.

## Controllers removed (had no frontend reference at all)

- `backend/CastLibrary.WebHost/Controllers/AuditController.cs`
- `backend/CastLibrary.WebHost/Controllers/CampaignPlayerNotesController.cs`
- `backend/CastLibrary.WebHost/Controllers/CampaignTrophiesController.cs`
- `backend/CastLibrary.WebHost/Controllers/CastPlayerNotesController.cs`
- `backend/CastLibrary.WebHost/Controllers/CastRelationshipsController.cs`
- `backend/CastLibrary.WebHost/Controllers/LocationPlayerNotesController.cs`
- `backend/CastLibrary.WebHost/Controllers/ScheduledWorkflowsController.cs`
- `backend/CastLibrary.WebHost/Controllers/SignalRTestController.cs`
- `backend/CastLibrary.WebHost/Controllers/SublocationPlayerNotesController.cs`

---

## AdminController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| PATCH | `/api/admin/campaigns/{campaignId}/demo` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |
| POST | `/api/admin/campaigns/{campaignId}/players/{userId}` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |
| GET | `/api/admin/campaigns/demo` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |
| GET | `/api/admin/campaigns/demo/players` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |
| GET | `/api/admin/users` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |
| POST | `/api/admin/users` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |
| DELETE | `/api/admin/users/{userId}` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |
| PATCH | `/api/admin/users/{userId}/password` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |
| PATCH | `/api/admin/users/{userId}/role` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |
| PATCH | `/api/admin/users/{userId}/subscription` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |

## AdminSignalRController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/admin/signalr/clear` | [v2 - diagnostics] 'shared\components\v2\Diagnostics\cc-signalr-inspector\cc-signalr-inspector.component.ts' - <cc-signalr-inspector> class CcSignalrInspectorComponent |
| GET | `/api/admin/signalr/state` | [v2 - diagnostics] 'shared\components\v2\Diagnostics\cc-signalr-inspector\cc-signalr-inspector.component.ts' - <cc-signalr-inspector> class CcSignalrInspectorComponent |

## AmbiancesController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/ambiances` | [v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtrack-content\cc-soundtrack-content.component.ts' - <cc-soundtrack-content> class CcSoundtrackContentComponent *(URL built dynamically)* |
| GET | `/api/campaigns/{campaignId}/ambiances` | [v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtracks\cc-soundtracks.component.ts' - <app-cc-soundtracks> class CcSoundtracksComponent |
| DELETE | `/api/campaigns/{campaignId}/ambiances/{ambianceId}` | [v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtrack-content\cc-soundtrack-content.component.ts' - <cc-soundtrack-content> class CcSoundtrackContentComponent *(URL built dynamically)*<br>[v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtracks\cc-soundtracks.component.ts' - <app-cc-soundtracks> class CcSoundtracksComponent |
| PATCH | `/api/campaigns/{campaignId}/ambiances/{ambianceId}` | [v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtrack-content\cc-soundtrack-content.component.ts' - <cc-soundtrack-content> class CcSoundtrackContentComponent *(URL built dynamically)* |

## AuthController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/auth/change-password` | [Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| POST | `/api/auth/forgot-password` | [Core services] 'core\auth\auth.interceptor.ts' - (no selector)<br>[Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| POST | `/api/auth/login` | [Core services] 'core\auth\auth.interceptor.ts' - (no selector)<br>[Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| POST | `/api/auth/logout` | _(none)_ |
| GET | `/api/auth/me` | [Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| POST | `/api/auth/register` | [Core services] 'core\auth\auth.interceptor.ts' - (no selector)<br>[Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| POST | `/api/auth/reset-password` | [Core services] 'core\auth\auth.interceptor.ts' - (no selector)<br>[Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| POST | `/api/auth/update-display-name` | [Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| POST | `/api/auth/update-email` | [Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| POST | `/api/auth/verify-email` | [Core services] 'core\auth\auth.interceptor.ts' - (no selector)<br>[Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |
| GET | `/api/auth/xsrf-token` | [Core services] 'core\auth\auth.service.ts' - class AuthService<br>used by: 'app.config.ts' ((no selector)); 'app.ts' (<app-root> class App); 'core\auth\auth.guard.ts' ((no selector)); 'core\auth\auth.interceptor.ts' ((no selector)); 'core\campaign-gm.service.ts' (class CampaignGmService); ... (+35 more) |

## BugReportsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| GET | `/api/bug-reports` | [Shared services] 'shared\services\bug-report.service.ts' - class BugReportService<br>used by: 'features\admin\admin-bug-reports\admin-bug-reports.component.ts' (<app-admin-bug-reports> class AdminBugReportsComponent); 'features\bug-report\bug-report.component.ts' (<app-bug-report> class BugReportComponent) |
| POST | `/api/bug-reports` | [Shared services] 'shared\services\bug-report.service.ts' - class BugReportService<br>used by: 'features\admin\admin-bug-reports\admin-bug-reports.component.ts' (<app-admin-bug-reports> class AdminBugReportsComponent); 'features\bug-report\bug-report.component.ts' (<app-bug-report> class BugReportComponent) |
| DELETE | `/api/bug-reports/{id:guid}` | [Shared services] 'shared\services\bug-report.service.ts' - class BugReportService<br>used by: 'features\admin\admin-bug-reports\admin-bug-reports.component.ts' (<app-admin-bug-reports> class AdminBugReportsComponent); 'features\bug-report\bug-report.component.ts' (<app-bug-report> class BugReportComponent) |
| PATCH | `/api/bug-reports/{id:guid}/mark-fixed` | [Shared services] 'shared\services\bug-report.service.ts' - class BugReportService<br>used by: 'features\admin\admin-bug-reports\admin-bug-reports.component.ts' (<app-admin-bug-reports> class AdminBugReportsComponent); 'features\bug-report\bug-report.component.ts' (<app-bug-report> class BugReportComponent) |
| PATCH | `/api/bug-reports/{id:guid}/severity` | [Shared services] 'shared\services\bug-report.service.ts' - class BugReportService<br>used by: 'features\admin\admin-bug-reports\admin-bug-reports.component.ts' (<app-admin-bug-reports> class AdminBugReportsComponent); 'features\bug-report\bug-report.component.ts' (<app-bug-report> class BugReportComponent) |
| DELETE | `/api/bug-reports/cleanup` | [Shared services] 'shared\services\bug-report.service.ts' - class BugReportService<br>used by: 'features\admin\admin-bug-reports\admin-bug-reports.component.ts' (<app-admin-bug-reports> class AdminBugReportsComponent); 'features\bug-report\bug-report.component.ts' (<app-bug-report> class BugReportComponent) |

## CampaignChroniclesController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/chronicles` | [v2 - quicknotes] 'shared\components\v2\Quicknotes\cc-quicknotes\cc-quicknotes.component.ts' - <cc-quicknotes> class CcQuicknotesComponent<br>[v2 - storyline] 'shared\components\v2\Storyline\cc-storyline\cc-storyline.component.ts' - <app-cc-storyline> class CcStorylineComponent |
| GET | `/api/campaigns/{campaignId}/chronicles` | _(none)_ |
| PATCH | `/api/campaigns/{campaignId}/chronicles/{chronicleId}` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/chronicles/feed` | [v2 - shell] 'shared\components\v2\Shell\cc-campaign-chronicle-content\cc-campaign-chronicle-content.component.ts' - <app-cc-campaign-chronicle-content> class CcCampaignChronicleContentComponent |
| POST | `/api/campaigns/{campaignId}/chronicles/migrate-player-note` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/chronicles/sessions` | _(none)_ |
| DELETE | `/api/campaigns/{campaignId}/chronicles/sessions/{sessionId}` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/chronicles/sessions-paged` | _(none)_ |

## CampaignEncountersController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaign/{campaignId}/encounters` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |
| GET | `/api/campaign/{campaignId}/encounters` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |
| DELETE | `/api/campaign/{campaignId}/encounters/{encounterId}` | _(none)_ |
| GET | `/api/campaign/{campaignId}/encounters/{encounterId}` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |
| POST | `/api/campaign/{campaignId}/encounters/{encounterId}/combatants` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |
| DELETE | `/api/campaign/{campaignId}/encounters/{encounterId}/combatants/{combatantId}` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |
| PATCH | `/api/campaign/{campaignId}/encounters/{encounterId}/combatants/{combatantId}` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |
| POST | `/api/campaign/{campaignId}/encounters/{encounterId}/end` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |
| POST | `/api/campaign/{campaignId}/encounters/{encounterId}/groups` | _(none)_ |
| PATCH | `/api/campaign/{campaignId}/encounters/{encounterId}/order` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |
| POST | `/api/campaign/{campaignId}/encounters/{encounterId}/turn` | [Core services] 'core\encounter.service.ts' - class EncounterService<br>used by: 'core\encounter-combatant.mapper.ts' ((no selector)); 'core\v2-campaign-shell.service.ts' (class V2CampaignShellService); 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' (<app-v2-campaign-shell> class V2CampaignShellComponent); 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' (<cc-combatant-details> class CcCombatantDetailsComponent); 'shared\components\v2\Encounters\cc-encounter-builder\cc-encounter-builder.component.ts' (<cc-encounter-builder> class CcEncounterBuilderComponent); ... (+6 more) *(URL built dynamically)* |

## CampaignEventsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/events` | [v2 - storyline] 'shared\components\v2\Storyline\cc-storyline-content\cc-storyline-content.component.ts' - <app-cc-storyline-content> class CcStorylineContentComponent |
| GET | `/api/campaigns/{campaignId}/events` | [v2 - storyline] 'shared\components\v2\Storyline\cc-storyline\cc-storyline.component.ts' - <app-cc-storyline> class CcStorylineComponent |
| PATCH | `/api/campaigns/{campaignId}/events/{eventId}` | _(none)_ |
| DELETE | `/api/campaigns/{campaignId}/events/{eventId}` | [v2 - storyline] 'shared\components\v2\Storyline\cc-storyline\cc-storyline.component.ts' - <app-cc-storyline> class CcStorylineComponent |
| PATCH | `/api/campaigns/{campaignId}/events/{eventId}/archive-mark` | _(none)_ |
| PATCH | `/api/campaigns/{campaignId}/events/{eventId}/details` | [v2 - storyline] 'shared\components\v2\Storyline\cc-storyline\cc-storyline.component.ts' - <app-cc-storyline> class CcStorylineComponent<br>[v2 - storyline] 'shared\components\v2\Storyline\cc-storyline-content\cc-storyline-content.component.ts' - <app-cc-storyline-content> class CcStorylineContentComponent |
| POST | `/api/campaigns/{campaignId}/events/{eventId}/handout-image` | [v2 - storyline] 'shared\components\v2\Storyline\cc-storyline-content\cc-storyline-content.component.ts' - <app-cc-storyline-content> class CcStorylineContentComponent |
| PATCH | `/api/campaigns/{campaignId}/events/{eventId}/visibility` | _(none)_ |
| POST | `/api/campaigns/{campaignId}/events/handout` | [v2 - storyline] 'shared\components\v2\Storyline\cc-storyline-content\cc-storyline-content.component.ts' - <app-cc-storyline-content> class CcStorylineContentComponent |
| GET | `/api/campaigns/{campaignId}/events/player` | _(none)_ |
| PATCH | `/api/campaigns/{campaignId}/events/reorder` | _(none)_ |

## CampaignKeywordsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaign-keywords` | [Journal - location library / form] 'features\location\location-form\location-form.component.ts' - <app-location-form> class LocationFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-cast-new-form\cc-cast-new-form.component.ts' - <cc-cast-new-form> class CcCastNewFormComponent<br>[v2 - shared] 'shared\components\v2\Shared\cc-keyword-editor\cc-keyword-editor.component.ts' - <cc-keyword-editor> class CcKeywordEditorComponent |
| GET | `/api/campaign-keywords` | [Journal - cast library / form] 'features\cast\cast-form\cast-form.component.ts' - <app-cast-form> class CastFormComponent<br>[Journal - faction library / form] 'features\faction\faction-form\faction-form.component.ts' - <app-faction-form> class FactionFormComponent<br>[Journal - location library / form] 'features\location\location-form\location-form.component.ts' - <app-location-form> class LocationFormComponent<br>[Journal - sublocation library / form] 'features\sublocations\sublocation-form\sublocation-form.component.ts' - <app-sublocation-form> class SublocationFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-cast-new-form\cc-cast-new-form.component.ts' - <cc-cast-new-form> class CcCastNewFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-cast-picker\cc-cast-picker.component.ts' - <cc-cast-picker> class CcCastPickerComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-location-new-form\cc-location-new-form.component.ts' - <cc-location-new-form> class CcLocationNewFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-location-picker\cc-location-picker.component.ts' - <cc-location-picker> class CcLocationPickerComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-sublocation-new-form\cc-sublocation-new-form.component.ts' - <cc-sublocation-new-form> class CcSublocationNewFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-sublocation-picker\cc-sublocation-picker.component.ts' - <cc-sublocation-picker> class CcSublocationPickerComponent<br>[v2 - faction navigation] 'shared\components\v2\FactionNavigation\cc-faction-new-form\cc-faction-new-form.component.ts' - <cc-faction-new-form> class CcFactionNewFormComponent<br>[v2 - shared] 'shared\components\v2\Shared\cc-keyword-editor\cc-keyword-editor.component.ts' - <cc-keyword-editor> class CcKeywordEditorComponent |
| DELETE | `/api/campaign-keywords/{keyword}` | [v2 - shared] 'shared\components\v2\Shared\cc-keyword-editor\cc-keyword-editor.component.ts' - <cc-keyword-editor> class CcKeywordEditorComponent |

## CampaignRulesController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/rules` | [Core services] 'core\rule-library.service.ts' - class RuleLibraryService<br>used by: 'shared\components\v2\Rules\cc-rule-add\cc-rule-add.component.ts' (<cc-rule-add> class CcRuleAddComponent); 'shared\components\v2\Rules\cc-rule-detail-content\cc-rule-detail-content.component.ts' (<cc-rule-detail-content> class CcRuleDetailContentComponent); 'shared\components\v2\Rules\cc-rule-editor\cc-rule-editor.component.ts' (<cc-rule-editor> class CcRuleEditorComponent); 'shared\components\v2\Rules\cc-rules\cc-rules.component.ts' (<cc-rules> class CcRulesComponent) *(URL built dynamically)* |
| GET | `/api/campaigns/{campaignId}/rules` | [Core services] 'core\rule-library.service.ts' - class RuleLibraryService<br>used by: 'shared\components\v2\Rules\cc-rule-add\cc-rule-add.component.ts' (<cc-rule-add> class CcRuleAddComponent); 'shared\components\v2\Rules\cc-rule-detail-content\cc-rule-detail-content.component.ts' (<cc-rule-detail-content> class CcRuleDetailContentComponent); 'shared\components\v2\Rules\cc-rule-editor\cc-rule-editor.component.ts' (<cc-rule-editor> class CcRuleEditorComponent); 'shared\components\v2\Rules\cc-rules\cc-rules.component.ts' (<cc-rules> class CcRulesComponent) *(URL built dynamically)* |
| PUT | `/api/campaigns/{campaignId}/rules/{id}` | [Core services] 'core\rule-library.service.ts' - class RuleLibraryService<br>used by: 'shared\components\v2\Rules\cc-rule-add\cc-rule-add.component.ts' (<cc-rule-add> class CcRuleAddComponent); 'shared\components\v2\Rules\cc-rule-detail-content\cc-rule-detail-content.component.ts' (<cc-rule-detail-content> class CcRuleDetailContentComponent); 'shared\components\v2\Rules\cc-rule-editor\cc-rule-editor.component.ts' (<cc-rule-editor> class CcRuleEditorComponent); 'shared\components\v2\Rules\cc-rules\cc-rules.component.ts' (<cc-rules> class CcRulesComponent) *(URL built dynamically)* |
| DELETE | `/api/campaigns/{campaignId}/rules/{id}` | [Core services] 'core\rule-library.service.ts' - class RuleLibraryService<br>used by: 'shared\components\v2\Rules\cc-rule-add\cc-rule-add.component.ts' (<cc-rule-add> class CcRuleAddComponent); 'shared\components\v2\Rules\cc-rule-detail-content\cc-rule-detail-content.component.ts' (<cc-rule-detail-content> class CcRuleDetailContentComponent); 'shared\components\v2\Rules\cc-rule-editor\cc-rule-editor.component.ts' (<cc-rule-editor> class CcRuleEditorComponent); 'shared\components\v2\Rules\cc-rules\cc-rules.component.ts' (<cc-rules> class CcRulesComponent) *(URL built dynamically)* |
| GET | `/api/campaigns/{campaignId}/rules/available` | [Core services] 'core\rule-library.service.ts' - class RuleLibraryService<br>used by: 'shared\components\v2\Rules\cc-rule-add\cc-rule-add.component.ts' (<cc-rule-add> class CcRuleAddComponent); 'shared\components\v2\Rules\cc-rule-detail-content\cc-rule-detail-content.component.ts' (<cc-rule-detail-content> class CcRuleDetailContentComponent); 'shared\components\v2\Rules\cc-rule-editor\cc-rule-editor.component.ts' (<cc-rule-editor> class CcRuleEditorComponent); 'shared\components\v2\Rules\cc-rules\cc-rules.component.ts' (<cc-rules> class CcRulesComponent) *(URL built dynamically)* |
| POST | `/api/campaigns/{campaignId}/rules/link` | [Core services] 'core\rule-library.service.ts' - class RuleLibraryService<br>used by: 'shared\components\v2\Rules\cc-rule-add\cc-rule-add.component.ts' (<cc-rule-add> class CcRuleAddComponent); 'shared\components\v2\Rules\cc-rule-detail-content\cc-rule-detail-content.component.ts' (<cc-rule-detail-content> class CcRuleDetailContentComponent); 'shared\components\v2\Rules\cc-rule-editor\cc-rule-editor.component.ts' (<cc-rule-editor> class CcRuleEditorComponent); 'shared\components\v2\Rules\cc-rules\cc-rules.component.ts' (<cc-rules> class CcRulesComponent) *(URL built dynamically)* |

## CampaignsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |
| GET | `/api/campaigns` | [Journal - campaign library / creator] 'features\campaign\campaign-library\campaign-library.component.ts' - <app-campaign-library> class CampaignLibraryComponent<br>[Journal - player campaigns] 'features\player\player-campaigns\player-campaigns.component.ts' - <app-player-campaigns> class PlayerCampaignsComponent |
| DELETE | `/api/campaigns/{id}` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent<br>[Journal - campaign library / creator] 'features\campaign\campaign-library\campaign-library.component.ts' - <app-campaign-library> class CampaignLibraryComponent<br>[v2 campaign shell] 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' - <app-v2-campaign-shell> class V2CampaignShellComponent |
| GET | `/api/campaigns/{id}` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent<br>[v2 campaign shell] 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' - <app-v2-campaign-shell> class V2CampaignShellComponent |
| PATCH | `/api/campaigns/{id}` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent<br>[v2 campaign shell] 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' - <app-v2-campaign-shell> class V2CampaignShellComponent |
| POST | `/api/campaigns/{id}/casts` | [v2 - card navigation] 'shared\components\v2\CardNavigation\cc-cast-new-form\cc-cast-new-form.component.ts' - <cc-cast-new-form> class CcCastNewFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-cast-picker\cc-cast-picker.component.ts' - <cc-cast-picker> class CcCastPickerComponent |
| PATCH | `/api/campaigns/{id}/casts/{instanceId}` | _(none)_ |
| DELETE | `/api/campaigns/{id}/casts/{instanceId}` | _(none)_ |
| PATCH | `/api/campaigns/{id}/casts/{instanceId}/custom-items` | _(none)_ |
| PATCH | `/api/campaigns/{id}/casts/{instanceId}/faction-symbols` | _(none)_ |
| PATCH | `/api/campaigns/{id}/casts/{instanceId}/keywords` | _(none)_ |
| PATCH | `/api/campaigns/{id}/casts/{instanceId}/player-faction-symbols` | _(none)_ |
| PATCH | `/api/campaigns/{id}/casts/{instanceId}/visibility` | _(none)_ |
| GET | `/api/campaigns/{id}/factions` | _(none)_ |
| POST | `/api/campaigns/{id}/factions` | _(none)_ |
| DELETE | `/api/campaigns/{id}/factions/{factionInstanceId}` | _(none)_ |
| PATCH | `/api/campaigns/{id}/factions/{factionInstanceId}` | _(none)_ |
| POST | `/api/campaigns/{id}/factions/{factionInstanceId}/cast/{castInstanceId}` | _(none)_ |
| DELETE | `/api/campaigns/{id}/factions/{factionInstanceId}/cast/{castInstanceId}` | _(none)_ |
| PATCH | `/api/campaigns/{id}/factions/{factionInstanceId}/cast/{castInstanceId}/primary` | _(none)_ |
| DELETE | `/api/campaigns/{id}/factions/{factionInstanceId}/cast/primary` | _(none)_ |
| POST | `/api/campaigns/{id}/factions/{factionInstanceId}/relationships` | _(none)_ |
| DELETE | `/api/campaigns/{id}/factions/{factionInstanceId}/relationships/{relationshipId}` | _(none)_ |
| DELETE | `/api/campaigns/{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}` | _(none)_ |
| POST | `/api/campaigns/{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}` | _(none)_ |
| PATCH | `/api/campaigns/{id}/factions/{factionInstanceId}/sublocations/{sublocationInstanceId}/primary` | _(none)_ |
| DELETE | `/api/campaigns/{id}/factions/{factionInstanceId}/sublocations/primary` | _(none)_ |
| PATCH | `/api/campaigns/{id}/factions/{instanceId}/visibility` | _(none)_ |
| GET | `/api/campaigns/{id}/factions/player` | _(none)_ |
| POST | `/api/campaigns/{id}/invite-code` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |
| POST | `/api/campaigns/{id}/locations` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-location-new-form\cc-location-new-form.component.ts' - <cc-location-new-form> class CcLocationNewFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-location-picker\cc-location-picker.component.ts' - <cc-location-picker> class CcLocationPickerComponent |
| DELETE | `/api/campaigns/{id}/locations/{instanceId}` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |
| PATCH | `/api/campaigns/{id}/locations/{instanceId}` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent<br>[Root drawer] 'shared\components\right-drawer\location-detail-content.component.ts' - <app-location-detail-content> class LocationDetailContentComponent *(URL built dynamically)* |
| PATCH | `/api/campaigns/{id}/locations/{instanceId}/keywords` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |
| PATCH | `/api/campaigns/{id}/locations/{instanceId}/sublocations/visibility` | _(none)_ |
| PATCH | `/api/campaigns/{id}/locations/{instanceId}/visibility` | _(none)_ |
| GET | `/api/campaigns/{id}/player` | [v2 campaign shell] 'layout\v2-campaign-shell\v2-campaign-shell.component.ts' - <app-v2-campaign-shell> class V2CampaignShellComponent<br>[v2 - shared] 'shared\components\v2\Shared\cc-secrets-manager\cc-secrets-manager.component.ts' - <cc-secrets-manager> class CcSecretsManagerComponent |
| DELETE | `/api/campaigns/{id}/players/{playerUserId}` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |
| POST | `/api/campaigns/{id}/secrets` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |
| DELETE | `/api/campaigns/{id}/secrets/{secretId}` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |
| PUT | `/api/campaigns/{id}/secrets/{secretId}` | _(none)_ |
| PATCH | `/api/campaigns/{id}/secrets/{secretId}/reseal` | _(none)_ |
| POST | `/api/campaigns/{id}/sublocations` | [v2 - card navigation] 'shared\components\v2\CardNavigation\cc-sublocation-new-form\cc-sublocation-new-form.component.ts' - <cc-sublocation-new-form> class CcSublocationNewFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-sublocation-picker\cc-sublocation-picker.component.ts' - <cc-sublocation-picker> class CcSublocationPickerComponent |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}` | [Core services] 'core\sublocation.service.ts' - class SublocationService<br>used by: 'shared\components\right-drawer\sublocation-detail-content.component.ts' (<app-sublocation-detail-content> class SublocationDetailContentComponent) *(URL built dynamically)* |
| DELETE | `/api/campaigns/{id}/sublocations/{instanceId}` | _(none)_ |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}/casts/visibility` | _(none)_ |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}/custom-items` | _(none)_ |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}/faction-symbol` | _(none)_ |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}/keywords` | _(none)_ |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}/player-faction-symbol` | _(none)_ |
| POST | `/api/campaigns/{id}/sublocations/{instanceId}/shop-items` | [Core services] 'core\sublocation.service.ts' - class SublocationService<br>used by: 'shared\components\right-drawer\sublocation-detail-content.component.ts' (<app-sublocation-detail-content> class SublocationDetailContentComponent) *(URL built dynamically)* |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}/shop-items/{shopItemId}` | [Core services] 'core\sublocation.service.ts' - class SublocationService<br>used by: 'shared\components\right-drawer\sublocation-detail-content.component.ts' (<app-sublocation-detail-content> class SublocationDetailContentComponent) *(URL built dynamically)* |
| DELETE | `/api/campaigns/{id}/sublocations/{instanceId}/shop-items/{shopItemId}` | [Core services] 'core\sublocation.service.ts' - class SublocationService<br>used by: 'shared\components\right-drawer\sublocation-detail-content.component.ts' (<app-sublocation-detail-content> class SublocationDetailContentComponent) *(URL built dynamically)* |
| POST | `/api/campaigns/{id}/sublocations/{instanceId}/shop-items/{shopItemId}/purchase` | [Root drawer] 'shared\components\right-drawer\shop-purchase-content.component.ts' - <app-shop-purchase-content> class ShopPurchaseContentComponent |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}/shop-items/{shopItemId}/scratch` | _(none)_ |
| PATCH | `/api/campaigns/{id}/sublocations/{instanceId}/visibility` | _(none)_ |
| GET | `/api/campaigns/joined` | [Journal - campaign library / creator] 'features\campaign\campaign-library\campaign-library.component.ts' - <app-campaign-library> class CampaignLibraryComponent |
| POST | `/api/campaigns/redeem` | [Journal - campaign library / creator] 'features\campaign\campaign-library\campaign-library.component.ts' - <app-campaign-library> class CampaignLibraryComponent<br>[Journal - player campaigns] 'features\player\player-campaigns\player-campaigns.component.ts' - <app-player-campaigns> class PlayerCampaignsComponent |

## CastsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/cast` | [Journal - cast library / form] 'features\cast\cast-form\cast-form.component.ts' - <app-cast-form> class CastFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-cast-new-form\cc-cast-new-form.component.ts' - <cc-cast-new-form> class CcCastNewFormComponent |
| GET | `/api/cast` | [Journal - cast library / form] 'features\cast\cast-library\cast-library.component.ts' - <app-cast-library> class CastLibraryComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-cast-picker\cc-cast-picker.component.ts' - <cc-cast-picker> class CcCastPickerComponent |
| DELETE | `/api/cast/{id}` | [Journal - cast library / form] 'features\cast\cast-library\cast-library.component.ts' - <app-cast-library> class CastLibraryComponent |
| PUT | `/api/cast/{id}` | [Journal - cast library / form] 'features\cast\cast-form\cast-form.component.ts' - <app-cast-form> class CastFormComponent |
| GET | `/api/cast/{id}` | [Journal - cast library / form] 'features\cast\cast-form\cast-form.component.ts' - <app-cast-form> class CastFormComponent |
| POST | `/api/cast/{id}/image` | [Journal - cast library / form] 'features\cast\cast-form\cast-form.component.ts' - <app-cast-form> class CastFormComponent |

## ConditionsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/conditions` | [Core services] 'core\condition-library.service.ts' - class ConditionLibraryService<br>used by: 'shared\components\v2\Conditions\cc-condition-add\cc-condition-add.component.ts' (<cc-condition-add> class CcConditionAddComponent); 'shared\components\v2\Conditions\cc-condition-form\cc-condition-form.component.ts' (<cc-condition-form> class CcConditionFormComponent) *(URL built dynamically)* |
| GET | `/api/campaigns/{campaignId}/conditions` | [Core services] 'core\condition-library.service.ts' - class ConditionLibraryService<br>used by: 'shared\components\v2\Conditions\cc-condition-add\cc-condition-add.component.ts' (<cc-condition-add> class CcConditionAddComponent); 'shared\components\v2\Conditions\cc-condition-form\cc-condition-form.component.ts' (<cc-condition-form> class CcConditionFormComponent) *(URL built dynamically)* |
| DELETE | `/api/campaigns/{campaignId}/conditions/{id}` | [Core services] 'core\condition-library.service.ts' - class ConditionLibraryService<br>used by: 'shared\components\v2\Conditions\cc-condition-add\cc-condition-add.component.ts' (<cc-condition-add> class CcConditionAddComponent); 'shared\components\v2\Conditions\cc-condition-form\cc-condition-form.component.ts' (<cc-condition-form> class CcConditionFormComponent) *(URL built dynamically)* |
| GET | `/api/campaigns/{campaignId}/conditions/available` | [Core services] 'core\condition-library.service.ts' - class ConditionLibraryService<br>used by: 'shared\components\v2\Conditions\cc-condition-add\cc-condition-add.component.ts' (<cc-condition-add> class CcConditionAddComponent); 'shared\components\v2\Conditions\cc-condition-form\cc-condition-form.component.ts' (<cc-condition-form> class CcConditionFormComponent) *(URL built dynamically)* |
| POST | `/api/campaigns/{campaignId}/conditions/link` | [Core services] 'core\condition-library.service.ts' - class ConditionLibraryService<br>used by: 'shared\components\v2\Conditions\cc-condition-add\cc-condition-add.component.ts' (<cc-condition-add> class CcConditionAddComponent); 'shared\components\v2\Conditions\cc-condition-form\cc-condition-form.component.ts' (<cc-condition-form> class CcConditionFormComponent) *(URL built dynamically)* |

## DashboardController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| GET | `/api/dashboard/export` | [Journal - dashboard] 'features\dashboard\dashboard.component.ts' - <app-dashboard> class DashboardComponent |
| POST | `/api/dashboard/import` | [Journal - dashboard] 'features\dashboard\dashboard.component.ts' - <app-dashboard> class DashboardComponent |
| GET | `/api/dashboard/import-template` | [Journal - dashboard] 'features\dashboard\dashboard.component.ts' - <app-dashboard> class DashboardComponent |
| GET | `/api/dashboard/stats` | [Journal - dashboard] 'features\dashboard\dashboard.component.ts' - <app-dashboard> class DashboardComponent |

## FactionPlayerNotesController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| PUT | `/api/campaigns/{campaignId}/faction-player-notes/{factionInstanceId}` | [Root drawer] 'shared\components\right-drawer\faction-detail-content.component.ts' - <app-faction-detail-content> class FactionDetailContentComponent |
| GET | `/api/campaigns/{campaignId}/faction-player-notes/{factionInstanceId}` | [Root drawer] 'shared\components\right-drawer\faction-detail-content.component.ts' - <app-faction-detail-content> class FactionDetailContentComponent |

## FactionsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/factions` | [Journal - faction library / form] 'features\faction\faction-form\faction-form.component.ts' - <app-faction-form> class FactionFormComponent<br>[v2 - faction navigation] 'shared\components\v2\FactionNavigation\cc-faction-new-form\cc-faction-new-form.component.ts' - <cc-faction-new-form> class CcFactionNewFormComponent |
| GET | `/api/factions` | [Journal - faction library / form] 'features\faction\faction-library\faction-library.component.ts' - <app-faction-library> class FactionLibraryComponent |
| DELETE | `/api/factions/{id}` | [Journal - faction library / form] 'features\faction\faction-library\faction-library.component.ts' - <app-faction-library> class FactionLibraryComponent |
| PUT | `/api/factions/{id}` | [Journal - faction library / form] 'features\faction\faction-form\faction-form.component.ts' - <app-faction-form> class FactionFormComponent |
| GET | `/api/factions/{id}` | [Journal - faction library / form] 'features\faction\faction-form\faction-form.component.ts' - <app-faction-form> class FactionFormComponent |
| POST | `/api/factions/{id}/image` | _(none)_ |

## FieldJournalController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| PUT | `/api/campaigns/{campaignId}/field-journal` | [Core services] 'core\player-field-journal.service.ts' - class PlayerFieldJournalService<br>used by: 'shared\components\v2\Encounters\cc-player-encounters\cc-player-encounters.component.ts' (<cc-player-encounters> class CcPlayerEncountersComponent); 'shared\components\v2\FieldJournal\cc-field-journal-entry-content\cc-field-journal-entry-content.component.ts' (<cc-field-journal-entry-content> class CcFieldJournalEntryContentComponent); 'shared\components\v2\FieldJournal\cc-player-field-journal\cc-player-field-journal.component.ts' (<cc-player-field-journal> class CcPlayerFieldJournalComponent) |
| GET | `/api/campaigns/{campaignId}/field-journal` | [Core services] 'core\player-field-journal.service.ts' - class PlayerFieldJournalService<br>used by: 'shared\components\v2\Encounters\cc-player-encounters\cc-player-encounters.component.ts' (<cc-player-encounters> class CcPlayerEncountersComponent); 'shared\components\v2\FieldJournal\cc-field-journal-entry-content\cc-field-journal-entry-content.component.ts' (<cc-field-journal-entry-content> class CcFieldJournalEntryContentComponent); 'shared\components\v2\FieldJournal\cc-player-field-journal\cc-player-field-journal.component.ts' (<cc-player-field-journal> class CcPlayerFieldJournalComponent) |

## LocationsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/locations` | [Journal - location library / form] 'features\location\location-form\location-form.component.ts' - <app-location-form> class LocationFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-location-new-form\cc-location-new-form.component.ts' - <cc-location-new-form> class CcLocationNewFormComponent |
| GET | `/api/locations` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent<br>[Journal - location library / form] 'features\location\location-form\location-form.component.ts' - <app-location-form> class LocationFormComponent<br>[Journal - location library / form] 'features\location\location-library\location-library.component.ts' - <app-location-library> class LocationLibraryComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-location-picker\cc-location-picker.component.ts' - <cc-location-picker> class CcLocationPickerComponent |
| DELETE | `/api/locations/{id}` | [Journal - location library / form] 'features\location\location-form\location-form.component.ts' - <app-location-form> class LocationFormComponent<br>[Journal - location library / form] 'features\location\location-library\location-library.component.ts' - <app-location-library> class LocationLibraryComponent |
| PUT | `/api/locations/{id}` | [Journal - location library / form] 'features\location\location-form\location-form.component.ts' - <app-location-form> class LocationFormComponent |
| GET | `/api/locations/{id}` | [Journal - location library / form] 'features\location\location-form\location-form.component.ts' - <app-location-form> class LocationFormComponent |
| POST | `/api/locations/{id}/image` | [Journal - location library / form] 'features\location\location-form\location-form.component.ts' - <app-location-form> class LocationFormComponent |

## PlayerCardsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/gold-award` | [v2 - the party] 'shared\components\v2\TheParty\cc-party-gold-content\cc-party-gold-content.component.ts' - <app-cc-party-gold-content> class CcPartyGoldContentComponent<br>[v2 - the party] 'shared\components\v2\TheParty\cc-player-secrets-content\cc-player-secrets-content.component.ts' - <app-cc-player-secrets-content> class CcPlayerSecretsContentComponent |
| POST | `/api/campaigns/{campaignId}/player-cards` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/player-cards` | [v2 - encounters] 'shared\components\v2\Encounters\cc-combatant-details\cc-combatant-details.component.ts' - <cc-combatant-details> class CcCombatantDetailsComponent<br>[v2 - encounters] 'shared\components\v2\Encounters\cc-encounter-circle\cc-encounter-circle.component.ts' - <cc-encounter-circle> class CcEncounterCircleComponent<br>[v2 - the party] 'shared\components\v2\TheParty\cc-party-panel\cc-party-panel.component.ts' - <app-cc-party-panel> class CcPartyPanelComponent |
| PUT | `/api/campaigns/{campaignId}/player-cards/{playerCardId}` | [v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-my-character-info-content.component.ts' - <cc-my-character-info-content> class CcMyCharacterInfoContentComponent |
| POST | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/image` | [v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-my-character-info-content.component.ts' - <cc-my-character-info-content> class CcMyCharacterInfoContentComponent |
| GET | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/memories` | _(none)_ |
| POST | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/memories` | _(none)_ |
| DELETE | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/memories/{memoryId}` | _(none)_ |
| POST | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/perceptions` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/perceptions` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets` | [v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-my-character.component.ts' - <cc-my-character> class CcMyCharacterComponent<br>[v2 - the party] 'shared\components\v2\TheParty\cc-player-secrets-content\cc-player-secrets-content.component.ts' - <app-cc-player-secrets-content> class CcPlayerSecretsContentComponent *(URL built dynamically)* |
| POST | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets` | [v2 - shared] 'shared\components\v2\Shared\cc-secrets-manager\cc-secrets-manager.component.ts' - <cc-secrets-manager> class CcSecretsManagerComponent *(URL built dynamically)*<br>[v2 - the party] 'shared\components\v2\TheParty\cc-player-secret-create-content\cc-player-secret-create-content.component.ts' - <cc-player-secret-create-content> class CcPlayerSecretCreateContentComponent<br>[v2 - the party] 'shared\components\v2\TheParty\cc-secrets-whisper-row\cc-secrets-whisper-row.component.ts' - <cc-secrets-whisper-row> class CcSecretsWhisperRowComponent *(URL built dynamically)* |
| PUT | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets/{secretId}` | [v2 - the party] 'shared\components\v2\TheParty\cc-secrets-whisper-row\cc-secrets-whisper-row.component.ts' - <cc-secrets-whisper-row> class CcSecretsWhisperRowComponent *(URL built dynamically)* |
| DELETE | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets/{secretId}` | [v2 - the party] 'shared\components\v2\TheParty\cc-secret-detail-content\cc-secret-detail-content.component.ts' - <cc-secret-detail-content> class CcSecretDetailContentComponent *(URL built dynamically)* |
| POST | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets/{secretId}/share` | [v2 - the party] 'shared\components\v2\TheParty\cc-secret-detail-content\cc-secret-detail-content.component.ts' - <cc-secret-detail-content> class CcSecretDetailContentComponent *(URL built dynamically)* |
| GET | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets/shared` | [v2 - the party] 'shared\components\v2\TheParty\cc-player-secrets-content\cc-player-secrets-content.component.ts' - <app-cc-player-secrets-content> class CcPlayerSecretsContentComponent *(URL built dynamically)* |
| POST | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits` | [v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-motivations-content.component.ts' - <cc-motivations-content> class CcMotivationsContentComponent |
| GET | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits` | [v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-motivations-content.component.ts' - <cc-motivations-content> class CcMotivationsContentComponent<br>[v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-my-character.component.ts' - <cc-my-character> class CcMyCharacterComponent |
| DELETE | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits/{traitId}` | [v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-motivations-content.component.ts' - <cc-motivations-content> class CcMotivationsContentComponent |
| POST | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits/{traitId}/toggle` | [v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-motivations-content.component.ts' - <cc-motivations-content> class CcMotivationsContentComponent |
| POST | `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits/{traitId}/toggle-shared` | [v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-motivations-content.component.ts' - <cc-motivations-content> class CcMotivationsContentComponent |
| GET | `/api/campaigns/{campaignId}/player-cards/cast-instance/{castInstanceId}/perceptions` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/player-cards/inventory/{playerUserId}` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/player-cards/inventory/mine` | [v2 - inventory] 'shared\components\v2\Inventory\cc-player-inventory\cc-player-inventory.component.ts' - <cc-player-inventory> class CcPlayerInventoryComponent |
| POST | `/api/campaigns/{campaignId}/player-cards/inventory/use` | [v2 - inventory] 'shared\components\v2\Inventory\cc-player-inventory\cc-player-inventory.component.ts' - <cc-player-inventory> class CcPlayerInventoryComponent<br>[v2 - inventory] 'shared\components\v2\Inventory\cc-player-inventory-content\cc-player-inventory-content.component.ts' - <cc-player-inventory-content> class CcPlayerInventoryContentComponent |
| GET | `/api/campaigns/{campaignId}/player-cards/mine` | [v2 - inventory] 'shared\components\v2\Inventory\cc-player-inventory\cc-player-inventory.component.ts' - <cc-player-inventory> class CcPlayerInventoryComponent<br>[v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-motivations-content.component.ts' - <cc-motivations-content> class CcMotivationsContentComponent<br>[v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-my-character.component.ts' - <cc-my-character> class CcMyCharacterComponent<br>[v2 - the party] 'shared\components\v2\TheParty\cc-my-character\cc-my-character-info-content.component.ts' - <cc-my-character-info-content> class CcMyCharacterInfoContentComponent |
| GET | `/api/campaigns/{campaignId}/player-cards/party` | _(none)_ |

## PlayerCastNotesController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| PUT | `/api/campaigns/{campaignId}/player-cast-notes/mine` | [Core services] 'core\player-cast-note.service.ts' - class PlayerCastNoteService *(URL built dynamically)* |
| GET | `/api/campaigns/{campaignId}/player-cast-notes/mine` | [Core services] 'core\player-cast-note.service.ts' - class PlayerCastNoteService *(URL built dynamically)* |

## QuicknoteQueueController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/quicknote-queue` | [v2 - quicknotes] 'shared\components\v2\Quicknotes\cc-quicknotes\cc-quicknotes.component.ts' - <cc-quicknotes> class CcQuicknotesComponent |
| GET | `/api/campaigns/{campaignId}/quicknote-queue` | [v2 - quicknotes] 'shared\components\v2\Quicknotes\cc-quicknotes\cc-quicknotes.component.ts' - <cc-quicknotes> class CcQuicknotesComponent |
| DELETE | `/api/campaigns/{campaignId}/quicknote-queue/{id}` | [v2 - quicknotes] 'shared\components\v2\Quicknotes\cc-quicknotes\cc-quicknotes.component.ts' - <cc-quicknotes> class CcQuicknotesComponent *(URL built dynamically)* |
| PUT | `/api/campaigns/{campaignId}/quicknote-queue/{id}` | [v2 - quicknotes] 'shared\components\v2\Quicknotes\cc-quicknotes\cc-quicknotes.component.ts' - <cc-quicknotes> class CcQuicknotesComponent *(URL built dynamically)* |

## SessionsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/sessions` | [Core services] 'core\session.service.ts' - class SessionService<br>used by: 'core\session-context.service.ts' (class SessionContextService) |
| PATCH | `/api/campaigns/{campaignId}/sessions/{sessionId}` | [Core services] 'core\session.service.ts' - class SessionService<br>used by: 'core\session-context.service.ts' (class SessionContextService) |
| GET | `/api/campaigns/{campaignId}/sessions/active` | [Core services] 'core\session.service.ts' - class SessionService<br>used by: 'core\session-context.service.ts' (class SessionContextService) |
| GET | `/api/campaigns/{campaignId}/sessions/archived` | [Core services] 'core\session.service.ts' - class SessionService<br>used by: 'core\session-context.service.ts' (class SessionContextService) |
| DELETE | `/api/campaigns/{campaignId}/sessions/cancel` | [Core services] 'core\session.service.ts' - class SessionService<br>used by: 'core\session-context.service.ts' (class SessionContextService) |
| GET | `/api/campaigns/{campaignId}/sessions/completed` | _(none)_ |
| GET | `/api/campaigns/{campaignId}/sessions/count` | [Core services] 'core\session.service.ts' - class SessionService<br>used by: 'core\session-context.service.ts' (class SessionContextService) |
| PATCH | `/api/campaigns/{campaignId}/sessions/end` | [Core services] 'core\session.service.ts' - class SessionService<br>used by: 'core\session-context.service.ts' (class SessionContextService) |

## SiteConfigurationController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| PUT | `/api/site-configuration` | [Admin] 'features\admin\configuration-settings\configuration-settings.component.ts' - <app-configuration-settings> class ConfigurationSettingsComponent |
| GET | `/api/site-configuration` | [Admin] 'features\admin\configuration-settings\configuration-settings.component.ts' - <app-configuration-settings> class ConfigurationSettingsComponent |
| GET | `/api/site-configuration/pricing` | [Core services] 'core\stripe.service.ts' - class StripeService<br>used by: 'features\campaign\campaign-library\campaign-library.component.ts' (<app-campaign-library> class CampaignLibraryComponent); 'features\cast\cast-library\cast-library.component.ts' (<app-cast-library> class CastLibraryComponent); 'features\faction\faction-library\faction-library.component.ts' (<app-faction-library> class FactionLibraryComponent); 'features\location\location-library\location-library.component.ts' (<app-location-library> class LocationLibraryComponent); 'features\sublocations\sublocation-library\sublocation-library.component.ts' (<app-sublocation-library> class SublocationLibraryComponent); ... (+6 more) |
| GET | `/api/site-configuration/users/{userId}/card-counts` | [Admin] 'features\admin\user-management\user-management.component.ts' - <app-user-management> class UserManagementComponent |

## SoundtracksController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/campaigns/{campaignId}/soundtracks` | [v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtracks\cc-soundtracks.component.ts' - <app-cc-soundtracks> class CcSoundtracksComponent |
| GET | `/api/campaigns/{campaignId}/soundtracks` | [v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtrack-content\cc-soundtrack-content.component.ts' - <cc-soundtrack-content> class CcSoundtrackContentComponent<br>[v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtracks\cc-soundtracks.component.ts' - <app-cc-soundtracks> class CcSoundtracksComponent |
| DELETE | `/api/campaigns/{campaignId}/soundtracks/{soundtrackId}` | [v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtracks\cc-soundtracks.component.ts' - <app-cc-soundtracks> class CcSoundtracksComponent |
| PATCH | `/api/campaigns/{campaignId}/soundtracks/{soundtrackId}` | [v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtrack-content\cc-soundtrack-content.component.ts' - <cc-soundtrack-content> class CcSoundtrackContentComponent<br>[v2 - soundtracks] 'shared\components\v2\Soundtracks\cc-soundtracks\cc-soundtracks.component.ts' - <app-cc-soundtracks> class CcSoundtracksComponent |
| POST | `/api/campaigns/{campaignId}/soundtracks/{soundtrackId}/trigger` | _(none)_ |

## StripeController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/stripe/create-checkout-session` | [Core services] 'core\stripe.service.ts' - class StripeService<br>used by: 'features\campaign\campaign-library\campaign-library.component.ts' (<app-campaign-library> class CampaignLibraryComponent); 'features\cast\cast-library\cast-library.component.ts' (<app-cast-library> class CastLibraryComponent); 'features\faction\faction-library\faction-library.component.ts' (<app-faction-library> class FactionLibraryComponent); 'features\location\location-library\location-library.component.ts' (<app-location-library> class LocationLibraryComponent); 'features\sublocations\sublocation-library\sublocation-library.component.ts' (<app-sublocation-library> class SublocationLibraryComponent); ... (+6 more) |
| POST | `/api/stripe/create-customer-portal-session` | [Core services] 'core\stripe.service.ts' - class StripeService<br>used by: 'features\campaign\campaign-library\campaign-library.component.ts' (<app-campaign-library> class CampaignLibraryComponent); 'features\cast\cast-library\cast-library.component.ts' (<app-cast-library> class CastLibraryComponent); 'features\faction\faction-library\faction-library.component.ts' (<app-faction-library> class FactionLibraryComponent); 'features\location\location-library\location-library.component.ts' (<app-location-library> class LocationLibraryComponent); 'features\sublocations\sublocation-library\sublocation-library.component.ts' (<app-sublocation-library> class SublocationLibraryComponent); ... (+6 more) |
| POST | `/api/stripe/webhook` | [Core services] 'core\auth\auth.interceptor.ts' - (no selector) |

## SubLocationsController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| POST | `/api/sublocations` | [Journal - sublocation library / form] 'features\sublocations\sublocation-form\sublocation-form.component.ts' - <app-sublocation-form> class SublocationFormComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-sublocation-new-form\cc-sublocation-new-form.component.ts' - <cc-sublocation-new-form> class CcSublocationNewFormComponent |
| GET | `/api/sublocations` | [Journal - sublocation library / form] 'features\sublocations\sublocation-library\sublocation-library.component.ts' - <app-sublocation-library> class SublocationLibraryComponent<br>[v2 - card navigation] 'shared\components\v2\CardNavigation\cc-sublocation-picker\cc-sublocation-picker.component.ts' - <cc-sublocation-picker> class CcSublocationPickerComponent |
| DELETE | `/api/sublocations/{id}` | [Journal - sublocation library / form] 'features\sublocations\sublocation-library\sublocation-library.component.ts' - <app-sublocation-library> class SublocationLibraryComponent |
| PUT | `/api/sublocations/{id}` | [Journal - sublocation library / form] 'features\sublocations\sublocation-form\sublocation-form.component.ts' - <app-sublocation-form> class SublocationFormComponent |
| GET | `/api/sublocations/{id}` | [Journal - sublocation library / form] 'features\sublocations\sublocation-form\sublocation-form.component.ts' - <app-sublocation-form> class SublocationFormComponent |
| POST | `/api/sublocations/{id}/image` | [Journal - sublocation library / form] 'features\sublocations\sublocation-form\sublocation-form.component.ts' - <app-sublocation-form> class SublocationFormComponent |

## SubscriptionController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| GET | `/api/subscription/entity-limits` | [Core services] 'core\stripe.service.ts' - class StripeService<br>used by: 'features\campaign\campaign-library\campaign-library.component.ts' (<app-campaign-library> class CampaignLibraryComponent); 'features\cast\cast-library\cast-library.component.ts' (<app-cast-library> class CastLibraryComponent); 'features\faction\faction-library\faction-library.component.ts' (<app-faction-library> class FactionLibraryComponent); 'features\location\location-library\location-library.component.ts' (<app-location-library> class LocationLibraryComponent); 'features\sublocations\sublocation-library\sublocation-library.component.ts' (<app-sublocation-library> class SublocationLibraryComponent); ... (+6 more) |
| POST | `/api/subscription/free-trial` | [Core services] 'core\stripe.service.ts' - class StripeService<br>used by: 'features\campaign\campaign-library\campaign-library.component.ts' (<app-campaign-library> class CampaignLibraryComponent); 'features\cast\cast-library\cast-library.component.ts' (<app-cast-library> class CastLibraryComponent); 'features\faction\faction-library\faction-library.component.ts' (<app-faction-library> class FactionLibraryComponent); 'features\location\location-library\location-library.component.ts' (<app-location-library> class LocationLibraryComponent); 'features\sublocations\sublocation-library\sublocation-library.component.ts' (<app-sublocation-library> class SublocationLibraryComponent); ... (+6 more) |
| GET | `/api/subscription/user` | [Core services] 'core\stripe.service.ts' - class StripeService<br>used by: 'features\campaign\campaign-library\campaign-library.component.ts' (<app-campaign-library> class CampaignLibraryComponent); 'features\cast\cast-library\cast-library.component.ts' (<app-cast-library> class CastLibraryComponent); 'features\faction\faction-library\faction-library.component.ts' (<app-faction-library> class FactionLibraryComponent); 'features\location\location-library\location-library.component.ts' (<app-location-library> class LocationLibraryComponent); 'features\sublocations\sublocation-library\sublocation-library.component.ts' (<app-sublocation-library> class SublocationLibraryComponent); ... (+6 more) |

## TimeOfDayController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| PUT | `/api/campaigns/{campaignId}/time-of-day` | [Journal - campaign library / creator] 'features\campaign\time-of-day-editor\time-of-day-editor.component.ts' - <app-time-of-day-editor> class TimeOfDayEditorComponent |
| GET | `/api/campaigns/{campaignId}/time-of-day` | [Journal - campaign library / creator] 'features\campaign\time-of-day-editor\time-of-day-editor.component.ts' - <app-time-of-day-editor> class TimeOfDayEditorComponent |
| PATCH | `/api/campaigns/{campaignId}/time-of-day/advance-day` | [v2 - world view] 'shared\components\v2\WorldView\cc-day-counter\cc-day-counter.component.ts' - <app-cc-day-counter> class CcDayCounterComponent |
| PATCH | `/api/campaigns/{campaignId}/time-of-day/cursor` | [v2 - world view] 'shared\components\v2\WorldView\cc-day-counter\cc-day-counter.component.ts' - <app-cc-day-counter> class CcDayCounterComponent |
| PATCH | `/api/campaigns/{campaignId}/time-of-day/rewind-day` | _(none)_ |
| PATCH | `/api/campaigns/{campaignId}/time-of-day/slices/{sliceId}/gm-notes` | _(none)_ |
| PATCH | `/api/campaigns/{campaignId}/time-of-day/slices/{sliceId}/player-notes` | _(none)_ |

## UsersController.cs

| Verb | Route | Frontend caller (area) |
| --- | --- | --- |
| GET | `/api/users/keywords` | [Journal - campaign library / creator] 'features\campaign\campaign-creator\campaign-creator.component.ts' - <app-campaign-creator> class CampaignCreatorComponent |

---

## By frontend area

### Admin

- DELETE `/api/admin/users/{userId}`
- GET `/api/admin/campaigns/demo/players`
- GET `/api/admin/campaigns/demo`
- GET `/api/admin/users`
- GET `/api/site-configuration/users/{userId}/card-counts`
- GET `/api/site-configuration`
- PATCH `/api/admin/users/{userId}/password`
- PATCH `/api/admin/users/{userId}/role`
- PATCH `/api/admin/users/{userId}/subscription`
- POST `/api/admin/campaigns/{campaignId}/players/{userId}`
- POST `/api/admin/users`
- PUT `/api/site-configuration`

### Core services

- DELETE `/api/campaign/{campaignId}/encounters/{encounterId}/combatants/{combatantId}`
- DELETE `/api/campaigns/{campaignId}/conditions/{id}`
- DELETE `/api/campaigns/{campaignId}/rules/{id}`
- DELETE `/api/campaigns/{campaignId}/sessions/cancel`
- DELETE `/api/campaigns/{id}/sublocations/{instanceId}/shop-items/{shopItemId}`
- GET `/api/auth/me`
- GET `/api/auth/xsrf-token`
- GET `/api/campaign/{campaignId}/encounters/{encounterId}`
- GET `/api/campaign/{campaignId}/encounters`
- GET `/api/campaigns/{campaignId}/conditions/available`
- GET `/api/campaigns/{campaignId}/conditions`
- GET `/api/campaigns/{campaignId}/field-journal`
- GET `/api/campaigns/{campaignId}/player-cast-notes/mine`
- GET `/api/campaigns/{campaignId}/rules/available`
- GET `/api/campaigns/{campaignId}/rules`
- GET `/api/campaigns/{campaignId}/sessions/active`
- GET `/api/campaigns/{campaignId}/sessions/archived`
- GET `/api/campaigns/{campaignId}/sessions/count`
- GET `/api/site-configuration/pricing`
- GET `/api/subscription/entity-limits`
- GET `/api/subscription/user`
- PATCH `/api/campaign/{campaignId}/encounters/{encounterId}/combatants/{combatantId}`
- PATCH `/api/campaign/{campaignId}/encounters/{encounterId}/order`
- PATCH `/api/campaigns/{campaignId}/sessions/{sessionId}`
- PATCH `/api/campaigns/{campaignId}/sessions/end`
- PATCH `/api/campaigns/{id}/sublocations/{instanceId}/shop-items/{shopItemId}`
- PATCH `/api/campaigns/{id}/sublocations/{instanceId}`
- POST `/api/auth/change-password`
- POST `/api/auth/forgot-password`
- POST `/api/auth/login`
- POST `/api/auth/register`
- POST `/api/auth/reset-password`
- POST `/api/auth/update-display-name`
- POST `/api/auth/update-email`
- POST `/api/auth/verify-email`
- POST `/api/campaign/{campaignId}/encounters/{encounterId}/combatants`
- POST `/api/campaign/{campaignId}/encounters/{encounterId}/end`
- POST `/api/campaign/{campaignId}/encounters/{encounterId}/turn`
- POST `/api/campaign/{campaignId}/encounters`
- POST `/api/campaigns/{campaignId}/conditions/link`
- POST `/api/campaigns/{campaignId}/conditions`
- POST `/api/campaigns/{campaignId}/rules/link`
- POST `/api/campaigns/{campaignId}/rules`
- POST `/api/campaigns/{campaignId}/sessions`
- POST `/api/campaigns/{id}/sublocations/{instanceId}/shop-items`
- POST `/api/stripe/create-checkout-session`
- POST `/api/stripe/create-customer-portal-session`
- POST `/api/stripe/webhook`
- POST `/api/subscription/free-trial`
- PUT `/api/campaigns/{campaignId}/field-journal`
- PUT `/api/campaigns/{campaignId}/player-cast-notes/mine`
- PUT `/api/campaigns/{campaignId}/rules/{id}`

### Journal - campaign library / creator

- DELETE `/api/campaigns/{id}/locations/{instanceId}`
- DELETE `/api/campaigns/{id}/players/{playerUserId}`
- DELETE `/api/campaigns/{id}/secrets/{secretId}`
- DELETE `/api/campaigns/{id}`
- GET `/api/campaigns/{campaignId}/time-of-day`
- GET `/api/campaigns/{id}`
- GET `/api/campaigns/joined`
- GET `/api/campaigns`
- GET `/api/locations`
- GET `/api/users/keywords`
- PATCH `/api/admin/campaigns/{campaignId}/demo`
- PATCH `/api/campaigns/{id}/locations/{instanceId}/keywords`
- PATCH `/api/campaigns/{id}/locations/{instanceId}`
- PATCH `/api/campaigns/{id}`
- POST `/api/campaigns/{id}/invite-code`
- POST `/api/campaigns/{id}/locations`
- POST `/api/campaigns/{id}/secrets`
- POST `/api/campaigns/redeem`
- POST `/api/campaigns`
- PUT `/api/campaigns/{campaignId}/time-of-day`

### Journal - cast library / form

- DELETE `/api/cast/{id}`
- GET `/api/campaign-keywords`
- GET `/api/cast/{id}`
- GET `/api/cast`
- POST `/api/cast/{id}/image`
- POST `/api/cast`
- PUT `/api/cast/{id}`

### Journal - dashboard

- GET `/api/dashboard/export`
- GET `/api/dashboard/import-template`
- GET `/api/dashboard/stats`
- POST `/api/dashboard/import`

### Journal - faction library / form

- DELETE `/api/factions/{id}`
- GET `/api/campaign-keywords`
- GET `/api/factions/{id}`
- GET `/api/factions`
- POST `/api/factions`
- PUT `/api/factions/{id}`

### Journal - location library / form

- DELETE `/api/locations/{id}`
- GET `/api/campaign-keywords`
- GET `/api/locations/{id}`
- GET `/api/locations`
- POST `/api/campaign-keywords`
- POST `/api/locations/{id}/image`
- POST `/api/locations`
- PUT `/api/locations/{id}`

### Journal - player campaigns

- GET `/api/campaigns`
- POST `/api/campaigns/redeem`

### Journal - sublocation library / form

- DELETE `/api/sublocations/{id}`
- GET `/api/campaign-keywords`
- GET `/api/sublocations/{id}`
- GET `/api/sublocations`
- POST `/api/sublocations/{id}/image`
- POST `/api/sublocations`
- PUT `/api/sublocations/{id}`

### Root drawer

- GET `/api/campaigns/{campaignId}/faction-player-notes/{factionInstanceId}`
- PATCH `/api/campaigns/{id}/locations/{instanceId}`
- POST `/api/campaigns/{id}/sublocations/{instanceId}/shop-items/{shopItemId}/purchase`
- PUT `/api/campaigns/{campaignId}/faction-player-notes/{factionInstanceId}`

### Shared services

- DELETE `/api/bug-reports/{id:guid}`
- DELETE `/api/bug-reports/cleanup`
- GET `/api/bug-reports`
- PATCH `/api/bug-reports/{id:guid}/mark-fixed`
- PATCH `/api/bug-reports/{id:guid}/severity`
- POST `/api/bug-reports`

### v2 - card navigation

- GET `/api/campaign-keywords`
- GET `/api/cast`
- GET `/api/locations`
- GET `/api/sublocations`
- POST `/api/campaign-keywords`
- POST `/api/campaigns/{id}/casts`
- POST `/api/campaigns/{id}/locations`
- POST `/api/campaigns/{id}/sublocations`
- POST `/api/cast`
- POST `/api/locations`
- POST `/api/sublocations`

### v2 - diagnostics

- GET `/api/admin/signalr/state`
- POST `/api/admin/signalr/clear`

### v2 - encounters

- GET `/api/campaigns/{campaignId}/player-cards`

### v2 - faction navigation

- GET `/api/campaign-keywords`
- POST `/api/factions`

### v2 - inventory

- GET `/api/campaigns/{campaignId}/player-cards/inventory/mine`
- GET `/api/campaigns/{campaignId}/player-cards/mine`
- POST `/api/campaigns/{campaignId}/player-cards/inventory/use`

### v2 - quicknotes

- DELETE `/api/campaigns/{campaignId}/quicknote-queue/{id}`
- GET `/api/campaigns/{campaignId}/quicknote-queue`
- POST `/api/campaigns/{campaignId}/chronicles`
- POST `/api/campaigns/{campaignId}/quicknote-queue`
- PUT `/api/campaigns/{campaignId}/quicknote-queue/{id}`

### v2 - shared

- DELETE `/api/campaign-keywords/{keyword}`
- GET `/api/campaign-keywords`
- GET `/api/campaigns/{id}/player`
- POST `/api/campaign-keywords`
- POST `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets`

### v2 - shell

- GET `/api/campaigns/{campaignId}/chronicles/feed`

### v2 - soundtracks

- DELETE `/api/campaigns/{campaignId}/ambiances/{ambianceId}`
- DELETE `/api/campaigns/{campaignId}/soundtracks/{soundtrackId}`
- GET `/api/campaigns/{campaignId}/ambiances`
- GET `/api/campaigns/{campaignId}/soundtracks`
- PATCH `/api/campaigns/{campaignId}/ambiances/{ambianceId}`
- PATCH `/api/campaigns/{campaignId}/soundtracks/{soundtrackId}`
- POST `/api/campaigns/{campaignId}/ambiances`
- POST `/api/campaigns/{campaignId}/soundtracks`

### v2 - storyline

- DELETE `/api/campaigns/{campaignId}/events/{eventId}`
- GET `/api/campaigns/{campaignId}/events`
- PATCH `/api/campaigns/{campaignId}/events/{eventId}/details`
- POST `/api/campaigns/{campaignId}/chronicles`
- POST `/api/campaigns/{campaignId}/events/{eventId}/handout-image`
- POST `/api/campaigns/{campaignId}/events/handout`
- POST `/api/campaigns/{campaignId}/events`

### v2 - the party

- DELETE `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets/{secretId}`
- DELETE `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits/{traitId}`
- GET `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets/shared`
- GET `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets`
- GET `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits`
- GET `/api/campaigns/{campaignId}/player-cards/mine`
- GET `/api/campaigns/{campaignId}/player-cards`
- POST `/api/campaigns/{campaignId}/gold-award`
- POST `/api/campaigns/{campaignId}/player-cards/{playerCardId}/image`
- POST `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets/{secretId}/share`
- POST `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets`
- POST `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits/{traitId}/toggle`
- POST `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits/{traitId}/toggle-shared`
- POST `/api/campaigns/{campaignId}/player-cards/{playerCardId}/traits`
- PUT `/api/campaigns/{campaignId}/player-cards/{playerCardId}/secrets/{secretId}`
- PUT `/api/campaigns/{campaignId}/player-cards/{playerCardId}`

### v2 - world view

- PATCH `/api/campaigns/{campaignId}/time-of-day/advance-day`
- PATCH `/api/campaigns/{campaignId}/time-of-day/cursor`

### v2 campaign shell

- DELETE `/api/campaigns/{id}`
- GET `/api/campaigns/{id}/player`
- GET `/api/campaigns/{id}`
- PATCH `/api/campaigns/{id}`

---

**Totals:** 231 endpoints across 29 non-v2 controller files; **64** with no frontend reference.
