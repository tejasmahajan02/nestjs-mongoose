import { Error as MongooseError } from 'mongoose';

export function formatMongooseValidationErrors(
    error: MongooseError.ValidationError,
): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const err of Object.values(error.errors)) {
        const path = err.path;

        if (!result[path]) {
            result[path] = [];
        }

        result[path].push(err.message);
    }

    return result;
}

export function formatMongoDuplicateKeyError(
  exception: any,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(exception.keyValue)) {
    errors[key] = [`${key} already exists`];
  }

  return errors;
}