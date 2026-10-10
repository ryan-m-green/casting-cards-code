# Rules Grid Area (v2 shell, bottom-right)

A shelf of rule cards. A card is a rule with a definition, and a rule may hold nested
rules (rule = definition, or rule = (rule = definition)). Two nodes deep, never three.

## Decisions (confirmed)

- The area is the DM's **bottom-right** slot, which currently holds `cc-v2-placeholder`
  ("More To Come"). The radial nav needs no change: the panel publishes the area's mark,
  so "Bot R" takes the Rules title and icon on its own.
- The grid is fixed at 3 x 3 (300vw / 300vh, one 100vw x 100vh area each), so a "new area"
  means claiming a free slot, not adding a tenth. Bottom-right is the only free one.
- Players keep `cc-player-inventory` in bottom-right; the rules shelf is DM-side for now.
- Depth is capped by the **type**, not by a runtime check: `Rule.children` holds
  `RuleDefinition`, and `RuleDefinition` has no children of its own.
- Cards are cast-card sized (150 x 220, 138 x 202 under 768px) so the shelf reads as the
  same deck as the rest of the board.
- Editing happens in the drawer, in place: read first, `Edit` turns the same panel into a
  form with Save / Cancel in a sticky bar.

## Data

`shared/models/rule.model.ts`

```ts
interface RuleDefinition { id, name, definition }
interface Rule { id, name, definition, children: readonly RuleDefinition[], keywords: readonly string[] }
```

Vocabulary, and it is used everywhere: a **Rule** is a name and a definition with nothing
under it; a **Rule group** is a rule that holds rules. "Nested" is never used in the UI.

`core/rule-library.service.ts` — per-campaign shelf as a signal, so the shelf, the card, the
detail drawer and the editor share one source of truth and an edit lands on the card
immediately.

- `load(campaignId)` GETs `/api/campaigns/{id}/rules`, `reload` refetches, `hasFailed` holds
  the error state (the shelf is never faked with starter data).
- `create/update/remove` POST/PUT/DELETE the same route and fold the server's answer back
  into the shelf.
- Every payload is normalised (`toShelf/toRule/toChildren/toKeywords`), so a body of the
  wrong shape can never become junk cards.


## Vocabulary

The area is the **Cheat Sheet** (its area mark title) and everything in it is an **entry** —
never a "rule" in the UI. An entry that holds entries holds **sub-entries**. The code keeps its
`Rule` / `cc-rule-*` / `rule-library.service` names; only the words the DM reads changed.

## Components

`shared/components/v2/Rules/`

| Component | Job |
| --- | --- |
| `cc-rule-card` | One rule: gold frame, red name banner, chapter line ("Contains 3 rules"), the definition on the parchment, the rules it holds in the foot. Emits `open`. |
| `cc-rules` | The area: count + search toolbar, the snap-scrolling shelf of cards, the `＋ New rule` tile at the end of the row (the same tile `cc-card-navigation` uses), loading / empty / failed states with a retry, and the `CampaignRulesChanged` hub subscription. Publishes the area mark ("Rules", `open_book_diamond_bookmark.svg`) and reports the grid-load piece. Emits `requestOpen` and `requestAdd`. |
| `cc-rule-editor` | **The one shared component for a rule or a rule group**, creating or editing: name, definition (a group's reads as optional), the keywords, and the subrules with an add / remove. There are no shape tiles and no shape to choose — a rule **is** a group once it holds subrules, so `grouped` is `children().length > 0` and the subrule list starts empty behind `＋ Add subrule`. It owns the save — POST when it was handed no rule, PUT when it was — so dropping `&lt;cc-rule-editor [campaignId]&gt;` into any drawer is all it takes. Inputs `campaignId`, `rule` (null = new), `cancelLabel`; outputs `saved`, `cancel`. |
| `cc-rule-add` | The add drawer, tabs in the `cc-location-picker` idiom: **Entry Library** first, **New Entry** second. The library tab is the DM's entries that are not on this cheat sheet — search, keyword chips (`#keyword` + count) that take or release every entry carrying that keyword in one tap, the selectable `cc-rule-card`s, and an `Add N to campaign` bar. The New Entry tab is `cc-rule-editor`. Each tab is a `.picker-panel`: its chrome (tabs, chips, search, action bar) holds still and only the `.picker-scroll` region inside it scrolls, so the tab strip can never scroll out of reach. Inputs `campaignId`, `portalColor`; outputs `saved`, `added`, `cancel`. |
| `cc-rule-detail-content` | The drawer for one entry: the definition, keywords, the sub-entries it holds, `Edit`, `Delete`, and `＋ Add sub-entries` when it stands alone (it opens the same editor). Edit mode hands the whole panel to `cc-rule-editor`. |

## Backend

`campaign_rules` (see `v2Alter.sql`): id, `dm_user_id`, name, definition, `children` jsonb
(the subrules under a group, one level deep by design), `keywords TEXT[]` (the rule types, the
organising key of the library), timestamps.

`campaign_rule_links`: campaign_id, rule_id, sort_order — **the link, not the rule, belongs to
a campaign.** A rule is owned by its DM, so the same card is worn by any number of that DM's
campaigns, and the order it sits in is the link's business. The migration keeps old rows: it
takes `dm_user_id` from the campaign the rule was written in, turns that campaign into a link,
and only then drops `campaign_id` / `sort_order` from `campaign_rules` (guarded by a `DO` block
that checks the column still exists, so the script stays re-runnable).

- `GET    /api/campaigns/{id}/rules` — the linked rules, in link order. Members and the owner.
- `GET    /api/campaigns/{id}/rules/available` — the DM's rules not on this campaign yet (the picker). DM only.
- `POST   /api/campaigns/{id}/rules` — writes a rule and links it. DM only.
- `POST   /api/campaigns/{id}/rules/link` — `{ ruleIds }` **bulk** link, the multi-select path; the insert joins `campaign_rules` on `dm_user_id`, so a DM can only ever add their own. DM only.
- `PUT    /api/campaigns/{id}/rules/{ruleId}` — DM only, and owner-scoped in SQL (`AND dm_user_id = @DmUserId`).
- `DELETE /api/campaigns/{id}/rules/{ruleId}` — DM only. This **unlinks** the rule from the campaign; the rule itself stays in the library.
- Each write broadcasts `CampaignRulesChanged` to the campaign group, and `cc-rules` reloads on it.
- A rule added inside a group carries a real GUID: `CampaignRuleDefinitionRequest.Id` is
  `Guid?`, so the browser mints GUIDs for the rows it creates (`newGuid()` in `rule.model.ts`).
  A readable local id would be refused by model binding before any of the slice runs.

The slice follows the quicknote slice exactly: entity → mapper → read/insert/update/delete
repositories → create/update/delete commands + get query → request/response DTOs → web
mapper → controller, registered in `IOCRepository`, `IOCLogic` and `IOCWebhost`.

## Shell wiring

- `v2-campaign-shell.component.html`: `cc-rules` in the DM branch of `.grid-area.bottom-right`
  with `(requestOpen)` and `(requestAdd)`; `#ruleDetailContentTemplate` and
  `#ruleAddContentTemplate` beside the other drawer templates.
- `v2-campaign-shell.component.ts`: `CcRulesComponent`, `CcRuleDetailContentComponent` and
  `CcRuleAddComponent` in `imports`; both viewChilds; the `selectedRule` signal;
  `openRuleDrawer(rule)` (drawer title = `Entry: <rule name>`) and `openRuleAddDrawer()`
  (drawer title = `Add entries`, mirroring `Add locations`).
- `campaign-hub.service.ts`: the `CampaignRulesChanged` channel (payloads, subject,
  observable, channels map, `connection.on`) and `signalr-events.md`.
- Drawer chrome, worth knowing before nesting anything: `.drawer-body` pads 24px (16px under
  480px), so a component that sits **directly** in the drawer pulls its sticky bar out by that
  much (`top: -24px; margin: -24px -24px 0`) to sit flush. `cc-rule-editor` carries that as
  `--rule-editor-bar-pull` (fallback 24px / 16px on small screens) precisely so a host that puts
  its own chrome above the editor can zero it — `cc-rule-add` does, because a bar that still
  pulled 24px from under a tab strip rode up and cut the tab label in half.
- Scrolling contract: `.drawer-body` is a flex column and the **only** scroll container, so a
  template whose tabs must not scroll sets `:host { flex: 1 1 auto; min-height: 0 }` to fill it
  and hands `overflow-y: auto` to one child (`cc-rule-add` uses `.picker-scroll`). The body then
  never overflows, so it shows no scrollbar of its own. `overflow-y: hidden` is never needed and
  the host's flex-grow keeps a short tab's action bar pinned to the drawer's foot.

## Mobile

- The shelf already scrolls by touch: one row, `overflow-x: auto` with x-proximity scroll
  snapping, no library needed. Cards keep the deck's size, so two and a bit sit on a 360px
  screen and the row reads as a hand of cards.
- The drawer is full width under 768px and the shelf's toolbar goes full width under
  1024px, so nothing is lost at the edges.
- The drawer's action bar is sticky to the top of the scrolling body, so `Edit` and
  `Save`/`Cancel` stay in view in a long definition.
- Cards scale to 138 x 202 under 768px; the touch targets (edit, remove, add) are >= 28px.

## Follow-ups

- **Bundle budget**: `npm run build` now fails its initial-bundle budget (1.32 MB against
  1.20 MB; the last commit before this work built at 901 kB). The dev build and `ng serve` are
  clean — it is the production budget that trips. Either raise
  `budgets[].maximumError` in `angular.json` or load the Swiper row lazily; the row is the only
  heavy dependency the rules work added.
- The add drawer offers the library as a source: `From existing` reads
  `GET .../rules/available` and multi-selects by card (tap to toggle) or by keyword
  (a facet row takes / releases every rule of that keyword). That is what "apply the same rules
  to several campaigns" means in practice, and it is one `POST .../link` for the whole pick.
- Rules library page: its own table + page with `keywords` as the organising key and a
  `source_rule_id` so an added rule remembers where it came from.
- Players: give the shelf a seat for them too (a radial-nav drawer button, or a swap of the
  player bottom-right slot), reading the same service.
- Reorder: `sort_order` lives on the link and is written (new links append) but nothing changes
  it yet; a drag on
  the shelf would be the way to use it.
