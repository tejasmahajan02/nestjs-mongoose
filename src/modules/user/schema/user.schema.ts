import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseModel } from 'src/common/schema/base.schema';
import { applyBaseSchemaOptions } from 'src/common/utils/schema.helpers';

@Schema()
export class UserModel extends BaseModel {
  @Prop()
  email: string;

  @Prop()
  name: string;

  @Prop()
  dob: string;

  // virtuals
  age?: number;
}

export type UserDocument = HydratedDocument<UserModel>;

export const UserSchema = SchemaFactory.createForClass(UserModel);

UserSchema.index({ email: 1 });

UserSchema.virtual('age').get(function () {
  const today = new Date();
  const birthDate = new Date(this.dob);

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
});

applyBaseSchemaOptions(UserSchema, {
  toJSON: {
    transform: (_, ret: any) => {
      if (ret?._id) {
        ret.id = ret?._id?.toString();
        delete ret?._id;
      }

      return ret;
    },
  },
});
