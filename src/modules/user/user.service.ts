import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/services/base.repository';
import { UserDocument } from './schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { USER_MODEL } from 'src/common/constants/model-names.constant';
import { Model } from 'mongoose';

@Injectable()
export class UserService extends BaseRepository<UserDocument> {
  constructor(
    @InjectModel(USER_MODEL) private userModel: Model<UserDocument>
  ) {
    super(userModel)
  }
}
