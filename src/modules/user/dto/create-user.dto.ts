import { CreateUserInput } from "../types/user.type";

export class CreateUserDto implements CreateUserInput {
    age: number;
    email: string;
    name: string;
}
