# SignalR Events

This file defines all real-time events used in the Cast Library application.

---

## Visibility Events
- CardVisibilityChanged
- BulkCardVisibilityChanged

## Secret Events
- SecretRevealed
- SecretResealed
- SecretDelivered
- SecretShared

## Condition Events
- ConditionAssigned
- ConditionRemoved
- CampaignConditionsChanged

## Time Events
- TimeOfDayUpdated
- TimeCursorMoved
- PlayerNotesUpdated
- DmNotesUpdated

## Notes
- NoteUpdated

## Chronicle Events
- ChronicleAdded

## Encounter Events
- EncounterUpdated
- EncounterTurnChanged
- EncounterCombatantUpdated
- TrophyAwarded
- FieldJournalUpdated
- EncounterEnded

## Nav Events
- CampaignNavChanged

## Rule Events
- CampaignRulesChanged

## World Map Events
- WorldMapImageChanged

## Player Card Events
- PlayerCardTraitsChanged
- PlayerCardUpdated

---

## Broadcast Pattern

hub.Clients.Group(campaignId).SendAsync(eventName, payload)

---

## Angular Listener Pattern

connection.on(eventName, (payload) => {
  // update signals
});
