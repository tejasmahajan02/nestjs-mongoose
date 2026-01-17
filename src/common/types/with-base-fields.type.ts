import { MongoId } from './mongoose.type';

export type BaseFields = {
  _id: MongoId;
  createdAt: Date;
  updatedAt: Date;
};

export type SoftDeleteFields = {
  deletedAt: Date | null;
};

export interface HasVirtualId {
  id: string;
}

export type WithBaseFields<T> = T &
  BaseFields &
  SoftDeleteFields &
  HasVirtualId;
