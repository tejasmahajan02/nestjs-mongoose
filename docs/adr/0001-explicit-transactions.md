# ADR-001: Explicit Transaction Boundaries in MongoDB

## Status
Accepted

## Context
We use MongoDB with Mongoose and require multi-document transactions.
Implicit session propagation caused silent non-transactional writes.

## Decision
We will:
- Use @Transactional() to define transaction boundaries
- Require explicit `{ session }` for write operations
- Fail fast at runtime if a write occurs inside a transaction without a session

## Alternatives Considered
1. Auto-attach session via AsyncLocalStorage (rejected: too implicit)
2. Pass session everywhere manually (rejected: too verbose)
3. Mongoose global plugin (rejected: hard to reason about)

## Consequences
- Slightly more explicit code
- Clear transactional intent
- Easier debugging and onboarding
