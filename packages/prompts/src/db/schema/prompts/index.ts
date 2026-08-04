export { promptsSchema } from "./schemas";
export { primaryId, timestampColumns } from "./common";

export { promptRegistries } from "./prompt-registries";
export type {
  PromptRegistryRecord,
  NewPromptRegistryRecord,
} from "./prompt-registries";

export { promptVersions } from "./prompt-versions";
export type {
  PromptVersionRecord,
  NewPromptVersionRecord,
} from "./prompt-versions";

export { promptActivations } from "./prompt-activations";
export type {
  PromptActivationRecord,
  NewPromptActivationRecord,
} from "./prompt-activations";

export { promptActivationHistory } from "./prompt-activation-history";
export type {
  PromptActivationHistoryRecord,
  NewPromptActivationHistoryRecord,
} from "./prompt-activation-history";

export * from "./relations";
