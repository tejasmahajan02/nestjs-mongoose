import { Prop } from '@nestjs/mongoose';

export abstract class BaseModel {
  // NOTE:
  // `createdAt` and `updatedAt` are not defined here because we use Mongoose's built-in `timestamps: true`
  // via `@Schema({ timestamps: true })` or `schema.set('timestamps', true)` during schema setup.
  // These fields are automatically added and managed by Mongoose.

  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt: Date | null;
}