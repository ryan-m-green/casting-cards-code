# CQRS Rules (No Mediator Version)

---

## Command Rules

Commands:
- Modify state
- Use write repositories
- May call:
  - Other commands
  - Queries
- Must not:
  - Modify multiple aggregates
  - Contain mapping logic
  - Contain validation outside handler
- Must return:
  - Result<T>
  - Or Result

---

## Query Rules

Queries:
- Read state
- Use read repositories
- May call:
  - Other queries
- Must not:
  - Call commands
  - Mutate domain objects
  - Perform writes
- Must return:
  - DTOs
  - Or domain objects

---

## Controller Rules

Controllers must:
- Inject only the commands/queries needed
- Validate input
- Call command/query
- Map to DTO
- Return response

Controllers must not:
- Contain business logic
- Contain repository calls
- Contain mapping logic
