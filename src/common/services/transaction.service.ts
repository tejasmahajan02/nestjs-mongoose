import { AsyncLocalStorage } from 'node:async_hooks';
import { ClientSession } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export const MongoSessionContext =
  new AsyncLocalStorage<ClientSession>();

@Injectable()
export class TransactionService {
  constructor(
    @InjectConnection() private readonly connection: Connection
  ) { }

  get session(): ClientSession | undefined {
    return MongoSessionContext.getStore();
  }

  async run(
    work: () => Promise<any>,
    retries = 3,
  ) {
    const session = await this.connection.startSession();

    try {
      return await session.withTransaction(async () => {
        return MongoSessionContext.run(session, work);
      });
    } catch (err: any) {
      if (
        retries > 0 &&
        err?.hasErrorLabel?.('TransientTransactionError')
      ) {
        return this.run(work, retries - 1);
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

}

/**
 * Transactional boundary.
 *
 * Rules:
 * 1. All database writes inside this method MUST participate in the transaction.
 * 2. Repository write methods must receive { session }.
 * 3. Side effects (cache, email, queues, external APIs) are NOT allowed.
 *    Execute them after commit (Outbox pattern or post-commit hook).
 *
 * Violating these rules can cause data corruption.
 */
export function Transactional() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value;
    const className = this?.constructor?.name ?? 'UnknownClass';

    descriptor.value = async function (...args: any[]) {
      const tx: TransactionService = this.transactionService;

      if (!tx) {
        throw new Error(
          `@Transactional used on ${className}.${String(propertyKey)} but ` +
          `TransactionService was not found. Inject it as "transactionService".`
        );
      }

      return tx.run(() => original.apply(this, args));
    };

    return descriptor;
  };
}

export class TransactionSessionMissingError extends Error {
  constructor(methodPath: string) {
    super(
      `Write executed inside @Transactional() without session in ${methodPath}. ` +
      `Pass { session } explicitly to repository method.`
    );
    this.name = 'TransactionSessionMissingError';
  }
}

/**
 * Enforces transactional session propagation.
 *
 * Contract:
 * - If a MongoDB session exists (i.e. inside @Transactional()),
 *   the decorated method MUST be called with `{ session }`.
 *
 * Purpose:
 * - Prevents accidental writes outside the active transaction.
 *
 * Note:
 * - Intended for repository write methods only.
 */
export function RequireSession() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;
    const className = target.constructor?.name ?? 'UnknownClass';

    descriptor.value = async function (...args: any[]) {
      const session = MongoSessionContext.getStore();

      // Check if last argument is an options object with session
      const options = args[args.length - 1];
      const hasSessionOption = options?.session !== undefined;

      if (session && !hasSessionOption) {
        throw new TransactionSessionMissingError(
          `${className}.${String(propertyKey)}`
        );
      }

      return original.apply(this, args);
    };

    return descriptor;
  };
}
