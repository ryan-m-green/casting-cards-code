# Domain Model Overview

This file summarizes the core domain objects used throughout the Cast Library backend.

---

## CampaignDomain
- Id: Guid
- Name: string
- Status: CampaignStatus
- Description: string
- OwnerId: Guid

---

## CastDomain
- Id: Guid
- Name: string
- Race: string
- DmUserId: Guid
- VoiceNotes: string
- ImageUrl: string (derived, not stored)

---

## LocationDomain
- Id: Guid
- Name: string
- Description: string
- OwnerId: Guid
- ImageUrl: string

---

## SubLocationDomain
- Id: Guid
- Name: string
- Description: string
- OwnerId: Guid
- ShopItems: ShopItemDomain[]

---

## PlayerCardDomain
- Id: Guid
- CampaignId: Guid
- UserId: Guid
- Name: string
- ImageUrl: string
- Conditions: ConditionDomain[]
- Memories: MemoryDomain[]
- Traits: TraitDomain[]

---

## CastRelationshipDomain
- Id: Guid
- SourceCastId: Guid
- TargetCastId: Guid
- RelationshipType: string
- Description: string
- IsPublic: bool

---

## SecretDomain
- Id: Guid
- CampaignId: Guid
- Content: string
- IsRevealed: bool
- RevealedToPlayers: Guid[]
- EntityType: EntityType

---

## TimeOfDayDomain
- Id: Guid
- CampaignId: Guid
- DayLengthHours: decimal
- CursorPosition: decimal
- Slices: TimeSliceDomain[]
- CreatedAt: DateTime
