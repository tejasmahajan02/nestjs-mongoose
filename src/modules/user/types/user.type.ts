import { UserModel } from "../schema/user.schema";

export type User = InstanceType<typeof UserModel>;

export type CreateUserInput = Pick<User, 'email' | 'name' | 'age'>;