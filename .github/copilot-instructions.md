# Cast Library — Copilot Instructions (No Mediator Architecture)

These instructions define how Copilot should generate backend and frontend code for the Cast Library application.

---

## 1. Architectural Principles

- The backend uses CQRS **without a mediator**.
- Controllers inject **only the specific command or query classes they need**.
- **Commands may call other commands or queries.**
- **Queries may call other queries, but never commands.**
- Commands must have single responsibility and modify one aggregate.
- Queries must be pure: no side effects, no domain mutations.
- Validation must occur inside command/query handlers, not controllers.

---

## 2. Backend Coding Rules

- Use .NET 10, C#, async/await, and dependency injection.
- Use Command classes and Query classes directly.
- Controllers must be thin:
  - Validate input
  - Call the correct command/query
  - Return DTOs
- Commands:
  - Modify state
  - Use write repositories
  - May call other commands or queries
  - Must return Result<T> or Result
- Queries:
  - Read state
  - Use read repositories
  - May call other queries
  - Must never call commands
  - Must return DTOs or domain objects
- Repositories:
  - Contain no logging, correlation, or business logic
  - Return consistent types
- Use factories for domain creation.
- Use mappers for DTO conversion.

---

## 3. SignalR Rules

- Use the exact event names defined in `signalr-events.md`.
- All broadcasts must target the campaign group:
  hub.Clients.Group(campaignId).SendAsync(eventName, payload)
- Angular clients must use Angular Signals, not RxJS.

---

## 4. Frontend Rules

- Angular 17 standalone components.
- Angular Signals for state.
- Feature modules with lazy loading.
- Strong typing for all DTOs.
- Hub service for SignalR.
- DTOs must match backend responses exactly.
- Use pure functions for mapping.
- Always add styles to stylesheets, never inline html.

---

## 5. Naming Conventions

- Commands end with `Command`
- Queries end with `Query`
- Handlers end with `Handler`
- Domain objects end with `Domain`
- Entities end with `Entity`
- Repositories end with `Repository`
- SignalR events use PascalCase

---

## 6. Code Generation Expectations

Copilot should:

- Prefer clean architecture
- Avoid mixing concerns
- Avoid injecting many handlers into controllers
- Use direct command/query injection
- Use async everywhere
- Use DTO mappers
- Use repository interfaces, not EF directly
- Use Angular Signals for state
- Use strict null checks
- Use pure functions for mappers

---

## 7. Never Run The Test Suite

**Do not run `ng test` (or any `npm test` / vitest invocation) in this repository.** It hangs or aborts
in this working environment and wastes a whole turn every time it is tried. The suite is configured —
the vitest runner and the unit-test builder are in `frontend/cast-library-ui/angular.json` — but
nothing runs it from here, and it must not be attempted. The same note sits in
`frontend/cast-library-ui/package.json`, beside the `test` script it is about.

Validate frontend work the way this repository does it:

- `cd frontend/cast-library-ui; npx ng build --configuration development` — a clean full build, which
  type-checks every template too (`strictTemplates` is on) and reports exactly what a spec run would
  have needed: errors and warnings, per file.
- Read the changed files back over once the build is clean.

Specs may still be *written* when new logic is added — just never executed from here.

---

## 8. Never Write Comments In Code

**No comments are written in this codebase — not in the front end, not in the back end.**

This applies to every file that is authored or edited:

- No `//` line comments, no `/* */` block comments, no `<!-- -->` template comments, no CSS
  comments.
- No JSDoc/TSDoc blocks, no TSDoc on types, interfaces, models or components, no C# XML doc
  comments.
- TypeScript, HTML, SCSS and CSS files, and every C# file: controllers, commands, queries, handlers,
  validators, repositories, mappers, domains, entities and requests/responses alike.

Meaning is carried by naming, types and small focused members — not by prose. If a line feels like it
needs a comment to be understood, rename or restructure it until it does not. Explanations belong in
the reply to the user, never in the source.

Comments already in the code are left exactly as they are; only comments authored as part of the
current work are the author's to remove.
