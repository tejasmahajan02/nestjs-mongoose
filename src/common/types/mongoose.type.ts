import { SchemaOptions, Types } from 'mongoose';

export type MongoId = Types.ObjectId;


export type BaseSchemaOptions = {
  toJSON?: SchemaOptions['toJSON'];
  toObject?: SchemaOptions['toObject'];
  timestamps?: boolean;
}

export type BaseFields = {
    _id: MongoId;
    createdAt: Date;
    updatedAt: Date;
};

export type HasVirtualId = {
    id: string;
}

export type WithBaseFields<T> = T &
    BaseFields &
    HasVirtualId;

export type Transformed<T> = Omit<T, '_id' | '__v'> & HasVirtualId;
