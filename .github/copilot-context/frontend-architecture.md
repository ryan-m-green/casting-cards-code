# Frontend Architecture (Angular 17 + Signals)

---

## Structure

- Standalone components
- Feature modules with lazy loading
- Shared UI components
- Core services (auth, hub, api)
- Signals for state management

---

## State Rules

- Use Angular Signals for all reactive state.
- No RxJS unless required for interoperability.
- Hub events update signals directly.

---

## Hub Service Pattern

- Create HubConnection
- Register event listeners
- Update signals on events
- Expose signals to components

---

## DTO Rules

- Must match backend DTOs exactly.
- Use pure functions for mapping.

---

## Routing Rules

- Role-based guards
- Lazy-loaded feature modules
- DM-only routes protected
