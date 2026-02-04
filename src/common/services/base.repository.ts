import { Injectable } from '@nestjs/common';
import {
    CreateOptions,
    DeleteResult,
    Model,
    MongooseBaseQueryOptions,
    MongooseBulkWriteOptions,
    MongooseUpdateQueryOptions,
    ProjectionType,
    QueryFilter,
    QueryOptions,
    UpdateResult,
} from 'mongoose';
import { RequireSession, } from './transaction.service';

@Injectable()
export abstract class BaseRepository<T> {
    constructor(protected readonly model: Model<T>) { }

    @RequireSession()
    async create(
        data: Partial<T>,
        options?: CreateOptions,
    ): Promise<T> {
        const [doc] = await this.model.create([data as any], options);
        return doc;
    }

    @RequireSession()
    async createMany(dataArray: Partial<T>[], options?: CreateOptions): Promise<T[]> {
        return await this.model.create(dataArray as any[], options);
    }

    async findOne(
        conditions: QueryFilter<T>,
        projection?: ProjectionType<T>,
        options?: QueryOptions<T>,
    ): Promise<T | null> {
        return await this.model.findOne(conditions, projection, options).exec();
    }

    async findAll(
        conditions: QueryFilter<T> = {} as QueryFilter<T>,
        projection?: ProjectionType<T>,
        options?: QueryOptions<T>,
    ): Promise<T[]> {
        return await this.model.find(conditions, projection, options).exec();
    }

    async exists(conditions: QueryFilter<T>): Promise<boolean> {
        const result = await this.model.exists(conditions);
        return !!result;
    }

    @RequireSession()
    async findOneAndUpdate(
        conditions: QueryFilter<T>,
        data: Partial<T>,
        options?: QueryOptions<T>,
    ): Promise<T | null> {
        return await this.model
            .findOneAndUpdate(conditions, data, { new: true, ...options })
            .exec();
    }

    @RequireSession()
    async updateOne(
        conditions: QueryFilter<T>,
        data: Partial<T>,
        options?: MongooseUpdateQueryOptions
    ): Promise<UpdateResult> {
        return await this.model.updateOne(conditions, data, options).exec();
    }

    @RequireSession()
    async updateMany(
        conditions: QueryFilter<T>,
        data: Partial<T>,
        options?: MongooseUpdateQueryOptions
    ): Promise<UpdateResult> {
        return await this.model.updateMany(conditions, data, options).exec();
    }

    @RequireSession()
    async deleteOne(conditions: QueryFilter<T>, options?: MongooseBaseQueryOptions<T>): Promise<DeleteResult> {
        return await this.model.deleteOne(conditions, options).exec();
    }

    @RequireSession()
    async deleteMany(conditions: QueryFilter<T>, options?: MongooseBaseQueryOptions<T>): Promise<DeleteResult> {
        return await this.model.deleteMany(conditions, options).exec();
    }

    @RequireSession()
    async findOneAndDelete(conditions: QueryFilter<T>, options?: MongooseBaseQueryOptions<T>): Promise<T | null> {
        return await this.model.findOneAndDelete(conditions, options).exec();
    }

    @RequireSession()
    async upsert(
        conditions: QueryFilter<T>,
        data: Partial<T>,
        options?: MongooseUpdateQueryOptions
    ): Promise<T | null> {
        return await this.model
            .findOneAndUpdate(conditions, data, {
                new: true,
                upsert: true,
                ...options
            })
            .exec();
    }

    @RequireSession()
    async bulkWrite(
        operations: Array<{
            insertOne?: { document: Partial<T> };
            updateOne?: { filter: QueryFilter<T>; update: Partial<T> };
            deleteOne?: { filter: QueryFilter<T> };
        }>,
        options?: MongooseBulkWriteOptions
    ): Promise<any> {
        return await this.model.bulkWrite(operations as any, options);
    }

}
