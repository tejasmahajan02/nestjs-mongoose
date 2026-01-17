import { Injectable } from '@nestjs/common';
import {
    DeleteResult,
    HydratedDocument,
    Model,
    ProjectionType,
    QueryFilter,
    QueryOptions,
    UpdateResult,
} from 'mongoose';

@Injectable()
export abstract class BaseRepository<T> {
    constructor(protected readonly model: Model<T>) { }

    async create(data: Partial<T>): Promise<T> {
        return await this.model.create(data);
    }

    async createMany(dataArray: Partial<T>[]): Promise<T[]> {
        const createdDocs = await this.model.insertMany(dataArray);
        return createdDocs.map((doc) => this.model.hydrate(doc));
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

    async findOneAndUpdate(
        conditions: QueryFilter<T>,
        data: Partial<T>,
        options?: QueryOptions<T>,
    ): Promise<T | null> {
        return await this.model
            .findOneAndUpdate(conditions, data, { new: true, ...options })
            .exec();
    }


    async updateOne(
        conditions: QueryFilter<T>,
        data: Partial<T>,
    ): Promise<UpdateResult> {
        return await this.model.updateOne(conditions, data).exec();
    }

    async updateMany(
        conditions: QueryFilter<T>,
        data: Partial<T>,
    ): Promise<UpdateResult> {
        return await this.model.updateMany(conditions, data).exec();
    }

    async deleteOne(conditions: QueryFilter<T>): Promise<DeleteResult> {
        return await this.model.deleteOne(conditions).exec();
    }

    async deleteMany(conditions: QueryFilter<T>): Promise<DeleteResult> {
        return await this.model.deleteMany(conditions).exec();
    }

    async findOneAndDelete(conditions: QueryFilter<T>): Promise<T | null> {
        return await this.model.findOneAndDelete(conditions).exec();
    }

    async upsert(
        conditions: QueryFilter<T>,
        data: Partial<T>,
    ): Promise<T | null> {
        return await this.model
            .findOneAndUpdate(conditions, data, {
                new: true,
                upsert: true,
            })
            .exec();
    }

    async bulkWrite(
        operations: Array<{
            insertOne?: { document: Partial<T> };
            updateOne?: { filter: QueryFilter<T>; update: Partial<T> };
            deleteOne?: { filter: QueryFilter<T> };
        }>,
    ): Promise<any> {
        return await this.model.bulkWrite(operations as any);
    }

}
