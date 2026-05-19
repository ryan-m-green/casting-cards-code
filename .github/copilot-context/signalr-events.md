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

## Time Events
- TimeOfDayUpdated
- TimeCursorMoved
- PlayerNotesUpdated
- DmNotesUpdated

## Notes
- NoteUpdated

---

## Broadcast Pattern

hub.Clients.Group(campaignId).SendAsync(eventName, payload)

---

## Angular Listener Pattern

connection.on(eventName, (payload) => {
  // update signals
});
