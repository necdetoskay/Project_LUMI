import type {
  LocationRecord,
  NewLocationConnectionRecord,
  NewLocationRecord,
} from "../../schema/world";

export interface LocationRepository {
  findById(id: string): Promise<LocationRecord | null>;
  create(input: NewLocationRecord): Promise<LocationRecord>;
  connect(input: NewLocationConnectionRecord): Promise<void>;
}
