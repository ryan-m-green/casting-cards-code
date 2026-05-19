# Cast Library — Project Summary (No Mediator Version)

This project is a D&D campaign management platform with:

- NPC library
- Location & sublocation library
- Campaign management
- Factions
- Secrets & reveal system
- Time-of-day clock
- Player character cards
- Real-time collaboration via SignalR
- Role-based access control

---

## Backend Overview

- ASP.NET Core (.NET 10)
- CQRS without mediator
- Commands and Queries injected directly
- Commands may call other commands or queries
- Queries may call other queries, but never commands
- PostgreSQL + EF Core
- SignalR hubs for real-time events
- Repositories for read/write separation
- Factories for domain creation
- Mappers for DTO conversion

---

## Frontend Overview

- Angular 17+
- Standalone components
- Angular Signals for state
- Feature modules with lazy loading
- SignalR hub service
- Strong typing for all DTOs
- Reusable UI components

---

## Key Real-Time Events

See `copilot-context/signalr-events.md` for full details.

Examples:
- CardVisibilityChanged
- SecretRevealed
- SecretResealed
- ConditionAssigned
- TimeCursorMoved
- QuicknoteAdded
- ShopItemScratched

---

## Domain Model Summary

See `copilot-context/domain-model.md` for full details.

Core domains include:

- Campaign
- Cast
- Location
- SubLocation
- PlayerCard
- Secret
- TimeOfDay
- CastRelationship
