import type {
  NewUserRecord,
  UserRecord,
} from "../../schema/identity";

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(input: NewUserRecord): Promise<UserRecord>;
  deactivate(id: string): Promise<void>;
}
