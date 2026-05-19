# Backend Architecture

---

## Project Structure

- CastLibrary.WebHost
  - Controllers
  - SignalR hubs
- CastLibrary.Logic
  - Commands
  - Queries
  - Handlers
  - Factories
  - Mappers
- CastLibrary.Repository
  - Read repositories
  - Write repositories
- CastLibrary.Shared
  - Domain objects
  - Entities
  - DTOs
  - Enums

---

## Handler Flow

Controller → Command/Query → Repository → Domain → DTO → Controller → Response

---

## Repository Rules

- Read repositories return domain objects or DTOs.
- Write repositories return domain objects or Result<T>.
- No logging, correlation, or business logic.

---

## SignalR Flow

Controller or Command → HubContext → Clients.Group(campaignId).SendAsync(eventName, payload)

---

## IoC Rules

- Commands and queries registered individually.
- No mediator.
- Controllers inject only what they need.
