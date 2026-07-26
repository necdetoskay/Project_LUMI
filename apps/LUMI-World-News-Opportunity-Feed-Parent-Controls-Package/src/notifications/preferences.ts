export type NotificationChannel =
  | "in_app"
  | "email"
  | "push";

export type NotificationPreference = {
  householdId: string;
  channel: NotificationChannel;
  enabled: boolean;
  notifyUrgentOnly: boolean;
  mutedTypes: string[];
  quietHours?: {
    start: string;
    end: string;
  };
};

export function shouldNotify(input: {
  preference: NotificationPreference;
  interactionType: string;
  priority: "low" | "normal" | "high" | "urgent";
}): boolean {
  if (!input.preference.enabled) return false;

  if (
    input.preference.mutedTypes.includes(
      input.interactionType,
    )
  ) {
    return false;
  }

  if (
    input.preference.notifyUrgentOnly &&
    input.priority !== "urgent"
  ) {
    return false;
  }

  return true;
}
