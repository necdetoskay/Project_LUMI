import {
  type ContextRequest,
  type ContextSourceResult,
  type OriginPackageItem,
  type OriginPackageSource,
} from "../ports";
import { originPackageToItems } from "../application";

export class InMemoryOriginPackageAdapter implements OriginPackageSource {
  constructor(private readonly origin: OriginPackageItem) {}

  async fetch(
    _request: ContextRequest,
  ): Promise<ContextSourceResult<OriginPackageItem>> {
    void _request;
    return {
      sourceRelevance: 0.8,
      items: originPackageToItems(this.origin),
    };
  }
}
