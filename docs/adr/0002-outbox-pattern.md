
---

## The problem Outbox solves (real-world pain)

You have **one transaction** that:

1. Writes to your database
2. Sends a message / event (Kafka, RabbitMQ, SQS, webhook, email, etc.)

### Naive approach ❌

```ts
await userRepository.create(user);
await eventBus.publish('USER_CREATED', user);
```

What can go wrong?

* DB write succeeds ❌
* Message publish fails ❌
* Retry causes duplicate users
* Or worse: user exists but downstream systems never know

This is called **dual-write problem**.

---

## What is the Outbox Pattern?

**Instead of publishing events directly**, you:

1. Write business data
2. Write an **outbox record** (event)
3. **Both happen in the same DB transaction**
4. A background worker publishes the event later

> “If it’s in the DB, it *will* be published.”

---

## Visual flow

```
┌────────────┐
│ API / App  │
└─────┬──────┘
      │
      ▼
┌───────────────────────────┐
│ Mongo Transaction         │
│                           │
│ 1. Insert User            │
│ 2. Insert Outbox Event    │
│                           │
└────────────┬──────────────┘
             │ commit
             ▼
┌───────────────────────────┐
│ Outbox Worker             │
│                           │
│ - read unpublished events │
│ - publish to broker       │
│ - mark as sent            │
└───────────────────────────┘
```

---

## Minimal Mongo example (your stack fits perfectly)

### Outbox schema

```ts
{
  _id: ObjectId,
  type: 'USER_CREATED',
  payload: {...},
  status: 'PENDING' | 'SENT' | 'FAILED',
  createdAt: Date,
}
```

---

### Inside `@Transactional()`

```ts
@Transactional()
async createUser(data: CreateUserInput) {
  const session = this.session;

  const user = await this.userRepo.create(data, { session });

  await this.outboxRepo.create(
    {
      type: 'USER_CREATED',
      payload: { userId: user.id },
      status: 'PENDING',
      createdAt: new Date(),
    },
    { session }
  );

  return user;
}
```

🔥 If transaction fails → nothing is written
🔥 If transaction commits → event is guaranteed to exist

---

## Worker (publisher)

```ts
async processOutbox() {
  const events = await outboxRepo.find(
    { status: 'PENDING' },
    {},
    { limit: 100 }
  );

  for (const event of events) {
    try {
      await eventBus.publish(event.type, event.payload);
      await outboxRepo.updateOne(
        { _id: event._id },
        { status: 'SENT' }
      );
    } catch (e) {
      // retry later
    }
  }
}
```

This worker can:

* crash
* restart
* retry safely

No data loss.

---

## Why Outbox is so powerful

✅ No distributed transactions
✅ No 2PC
✅ No message loss
✅ Safe retries
✅ Works with Mongo, Postgres, MySQL
✅ Scales horizontally

This is how:

* Uber
* Netflix
* Stripe
* Amazon

avoid nightmares.

---

## Outbox vs direct publish

| Direct publish | Outbox              |
| -------------- | ------------------- |
| Simple         | Slightly more code  |
| Unsafe         | Bulletproof         |
| Loses events   | Guaranteed delivery |
| Hard retries   | Easy retries        |

---

## Relationship to your transaction design 👀

Your **explicit transaction boundary** is *perfect* for Outbox.

Because:

* You already enforce session correctness
* You already fail fast
* You already control write intent

Outbox **depends** on correct transactions.

---

## Variations you’ll see later

* **Transactional Outbox** (this one)
* **CDC-based outbox** (Debezium)
* **Inbox pattern** (consumer-side deduplication)
* **Exactly-once-ish delivery** (idempotent handlers)

---

## One-liner definition (for interviews 😄)

> *The Outbox Pattern guarantees reliable event publication by writing events to the database as part of the same transaction as business data, and publishing them asynchronously later.*

---

> “If my code is synchronous and I only emit **after** the DB write succeeds, why isn’t that enough?”

---

## Short answer

Because **“DB write succeeded” ≠ “transaction committed and observable”**, and because **process boundaries lie**.

`if (user) emitEvent()` only protects you from **coding mistakes**, not **system failures**.

---

## The illusion of safety

```ts
const user = await userRepo.create(data);
if (user) {
  eventBus.emit('USER_CREATED', user);
}
```

Looks safe, right?

But there are **four failure windows** you can’t see.

---

## Failure window #1: Commit happens *after* your code

In Mongo (and SQL):

```ts
await userRepo.create(...) // does NOT mean commit is durable yet
```

The actual commit:

* happens later
* may fail
* may be rolled back
* may be invisible to other readers

Your app can emit **before the DB guarantees durability**.

Outbox ties the event to the **same commit**.

---

## Failure window #2: Process crashes at the worst time

Timeline:

```
T1: DB insert succeeds
T2: Node process crashes
T3: emitEvent() never runs
```

User exists.
Event is gone forever.

No retry.
No log.
No alert.

Outbox survives crashes because the event is **persisted**.

---

## Failure window #3: Network / broker lies

```ts
await kafka.publish(event);
```

Possible outcomes:

* Broker received it ❌ but ACK lost
* ACK received ❌ but broker didn’t persist
* Publish timed out ❌ but message delivered

Now what?
Retry?
You’ll duplicate.

Outbox makes publishing **idempotent & retryable**.

---

## Failure window #4: Transactions + multiple writes

Your real code is never this simple:

```ts
await userRepo.create(...)
await profileRepo.create(...)
await walletRepo.create(...)
emitEvent()
```

If **any** write rolls back later:

* event is already gone
* consumers see a half-built system

Outbox guarantees **all-or-nothing visibility**.

---

## Why synchronous execution doesn’t save you

JavaScript is synchronous **inside one process**.

Your system is:

* async across DB
* async across network
* async across crashes
* async across deployments

Synchronous code ≠ synchronous system.

---

## The core rule (memorize this)

> **If an event represents a state change, it must be persisted with that state change.**

That’s it.
That’s the Outbox Pattern.

---

## When `if (user) emitEvent()` IS acceptable ✅

There *are* valid cases:

### Fire-and-forget side effects

* analytics
* metrics
* logs
* emails (sometimes)
* cache warming

Example:

```ts
await userRepo.create(...)
analytics.track('user_created')
```

If lost → nobody dies.

---

## When it is NOT acceptable ❌

* Inter-service communication
* Payment workflows
* Inventory updates
* Order lifecycle
* Anything that must be **eventually consistent**

---

## Mental model (this helps a lot)

### ❌ Direct emit

> “I *hope* the event goes out.”

### ✅ Outbox

> “If it’s committed, it *will* go out.”

Hope vs guarantee.

---

## Why big systems *always* use Outbox

Not because they love complexity —
but because **they’ve been burned**.

Outbox is not optimization.
It’s **scar tissue**.

---

## Final framing (very important)

You don’t use Outbox because:

* code is async
* Mongo is weird
* Node is unreliable

You use Outbox because:

> **Distributed systems fail in ways your `if` statement can’t observe.**

---
