import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/services/base.repository';
import { UserDocument } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { USER_MODEL } from 'src/common/constants/model-names.constant';
import { Model } from 'mongoose';
import { CreateUserInput } from './types/user.type';
import { Transactional, TransactionService } from 'src/common/services/transaction.service';

@Injectable()
export class UserService extends BaseRepository<UserDocument> {
  constructor(
    @InjectModel(USER_MODEL) private userModel: Model<UserDocument>,
    private readonly transactionService: TransactionService
  ) {
    super(userModel)
  }

  @Transactional()
  async createUserTx(data: CreateUserInput) {
    const session = this.transactionService.session;
    return await this.create(data, { session });
  }

  async createUser(data: CreateUserInput) {
    return await this.create(data);
  }
}
