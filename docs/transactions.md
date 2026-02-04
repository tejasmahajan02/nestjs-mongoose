## Explicit Transaction Boundary (Fail-Fast)
Transactions are explicit and enforced at runtime. No silent writes.

---

```md
# MongoDB Transactions – Project Rules & Patterns

This project uses **explicit, fail-fast MongoDB transactions** with Mongoose.
Transactions are **opt-in, explicit, and enforced at runtime**.

This document defines **when**, **how**, and **why** transactions must be used.

---

## Core Principles

1. **Transactions are explicit**
   - No repository method automatically attaches a session.
   - Developers must *consciously* opt into transactional behavior.

2. **No silent transactions**
   - If a write happens inside a transaction **without a session**, the app fails fast.

3. **Service layer owns transaction boundaries**
   - Repositories never start or manage transactions.
   - Transactions are defined at service boundaries only.

4. **Reads are non-transactional by default**
   - `find`, `findOne`, etc. do NOT automatically participate in transactions.

---

## Architecture Overview

```

Controller
↓
Service  ← Transaction boundary (@Transactional)
↓
Repository (explicit session passing)
↓
Mongoose / MongoDB

````

---

## Transaction Boundary

Transactions are created using the `@Transactional()` decorator.

```ts
@Transactional()
async createUser(input: CreateUserInput) {
  const session = MongoSessionContext.getStore();

  await this.userRepo.create(input, { session });
  await this.profileRepo.create({ userId: ... }, { session });

  return ...
}
````

### What `@Transactional()` does

* Creates a MongoDB session
* Starts a transaction
* Stores the session in `AsyncLocalStorage`
* Commits on success
* Aborts on error
* Retries on transient transaction errors

---

## Repository Rules

### ❌ Repositories MUST NOT

* Start transactions
* Commit or abort transactions
* Auto-inject sessions
* Read session context implicitly

### ✅ Repositories MUST

* Accept `session` explicitly via options
* Fail fast if a write happens inside a transaction without a session

---

## Write Enforcement Rule (Fail-Fast)

Any write operation executed inside `@Transactional()` **must** explicitly receive `{ session }`.

### Example Guard

```ts
async create(data: Partial<T>, options?: CreateOptions) {
  const session = MongoSessionContext.getStore();

  if (session && !options?.session) {
    throw new Error(
      'Write executed inside @Transactional() without session. ' +
      'Pass { session } explicitly to repository method.'
    );
  }

  return (await this.model.create([data], options))[0];
}
```

### Why this exists

* Prevents accidental partial commits
* Makes transactional intent obvious
* Avoids hidden coupling via AsyncLocalStorage
* Surfaces bugs immediately

---

## Read Operations & Transactions

### Default rule

* **Reads do NOT require transactions**
* Reads do NOT automatically receive sessions

```ts
await this.userRepo.findOne({ email });
```

### When reads SHOULD use transactions

Use `{ session }` for reads **only when**:

* Read-modify-write logic depends on isolation
* Implementing counters, sequences, or invariants
* Preventing race conditions

```ts
const counter = await this.counterRepo.findOne(
  { name: 'user' },
  null,
  { session }
);
```

---

## Example: Correct Usage

```ts
@Transactional()
async createUser(input: CreateUserInput) {
  const session = MongoSessionContext.getStore();

  const counter = await this.counterRepo.findOne(
    { name: 'user' },
    null,
    { session }
  );

  await this.counterRepo.updateOne(
    { name: 'user' },
    { $inc: { value: 1 } },
    { session }
  );

  await this.userRepo.create(
    { ...input, userId: counter.value },
    { session }
  );
}
```

---

## Example: ❌ Incorrect Usage

```ts
@Transactional()
async createUser(input: CreateUserInput) {
  // ❌ missing session
  await this.userRepo.create(input);
}
```

**Result:**
➡ Runtime error
➡ Transaction aborted
➡ No partial writes

---

## Error Handling Philosophy

* Internal transaction violations throw `Error`
* These errors:

  * Abort the transaction
  * Are logged internally
  * Are converted to `500 Internal Server Error`
* Sensitive details are NOT exposed to clients

This is intentional.

---

## Why We Do NOT Auto-Inject Sessions

We intentionally avoid:

* Mongoose plugins that attach sessions implicitly
* Decorators that mutate repository arguments
* Hidden AsyncLocalStorage magic

Because:

* It hides transactional behavior
* Makes debugging extremely difficult
* Encourages accidental coupling
* Breaks predictability

**Explicit > Clever**

---

## Pattern Name

This project follows the:

> **Explicit Transaction Boundary with Runtime Enforcement**

Also known as:

* Fail-Fast Transaction Pattern
* No-Silent-Transactions Pattern

---

## Checklist for Developers

Before writing transactional code, ask:

* [ ] Is this operation truly atomic?
* [ ] Is `@Transactional()` applied at service level?
* [ ] Are ALL writes passed `{ session }`?
* [ ] Are reads using session only when needed?
* [ ] Would this be safe without a transaction?

If unsure — ask.

---

## Final Notes

* Transactions are powerful — and dangerous when hidden
* Explicitness beats abstraction
* Failing fast is a feature, not a bug

**When in doubt: be explicit.**

```
---

* code inside the callback runs **before durability**
* code after `withTransaction` runs **after durability**

---

## Your final mental model (keep this forever)

### Think in **three zones**

#### 1️⃣ Pre-transaction

* Validation
* Input parsing
* Authorization

#### 2️⃣ Transaction callback (DB-only zone)

* DB writes
* Outbox insert
* Counters

#### 3️⃣ Post-commit zone

* Tokens
* Emails
* Events
* Webhooks
* Cache

If something is in the wrong zone → bug.

---

## What counts as a “write” (decorate these)

Decorate **all of these**:

* `create`
* `insertOne / insertMany`
* `updateOne / updateMany`
* `replaceOne`
* `deleteOne / deleteMany`
* `findOneAndUpdate`
* `findOneAndDelete`
* `bulkWrite`
* `save`
* any custom method that mutates state

Example:

```ts
@WriteOperation()
async updateById(id: string, data: UpdateDto, options?: UpdateOptions) {
  return this.model.updateOne({ _id: id }, data, options);
}
```

---

## What does NOT need decoration

Do **not** decorate pure reads:

* `find`
* `findOne`
* `findById`
* `count`
* `aggregate` (read-only pipelines)
* projections

These don’t require a session for correctness.

---

## Why this is necessary (the “why” in one paragraph)

When `@Transactional()` is active:

* MongoDB tracks changes **only through the session**
* A write without `{ session }`:

  * executes outside the transaction
  * commits immediately
  * breaks atomicity
  * corrupts intent

Your decorator is the **last line of defense** against this.

---

## Best structure (recommended)

```ts
export abstract class BaseRepository<T> {
  @WriteOperation()
  async create(...) {}

  @WriteOperation()
  async update(...) {}

  @WriteOperation()
  async delete(...) {}
}
```

---

## Final mental model (remember this)

> **If a method can change data, it must scream “I require a session.”**

That scream is `@RequireSession()` / `@WriteOperation()`.

---

