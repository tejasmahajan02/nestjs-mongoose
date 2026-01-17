import mongoose, { SchemaOptions } from 'mongoose';

type BaseSchemaOptions = {
  toJSON?: SchemaOptions['toJSON'];
  toObject?: SchemaOptions['toObject'];
  timestamps?: boolean;
}

const defaultTransform = ((_doc: any, ret: any) => {
  if (ret?._id) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
  return ret;
}) as any;

export function applyBaseSchemaOptions(
  schema: mongoose.Schema,
  options?: BaseSchemaOptions,
) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    ...options?.toJSON,
    transform: options?.toJSON?.transform ?? defaultTransform,
  });

  schema.set('toObject', {
    virtuals: true,
    ...options?.toObject,
    transform: options?.toObject?.transform ?? defaultTransform,
  });

  // Enable automatic timestamps.
  // By default, Mongoose uses `createdAt` and `updatedAt` fields.
  // Uncomment below to customize field names (e.g., 'created_on', 'updated_on').
  // ⚠️ If renamed, update related DTOs, queries, indexes, and transformations.
  // schema.set('timestamps', options?.timestamps ?? { createdAt: 'created_on', updatedAt: 'updated_on' });
  schema.set('timestamps', options?.timestamps ?? true);
}
