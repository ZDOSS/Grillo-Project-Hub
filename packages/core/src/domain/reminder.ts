import type { ReminderId, ItemId, MilestoneId } from "./ids";
import { generateId } from "./ids";
import { isValidIanaTimeZone, type Timestamp } from "./dates";

/**
 * Reminders are separate records with stable IDs, exact UTC instants, and IANA timezones.
 * Notification permissions, delivery attempts, and machine-specific dismissal state stay outside the bundle.
 */

export type ReminderTargetType = "workItem" | "milestone" | "document";

export type Reminder = {
  id: ReminderId;
  targetType: ReminderTargetType;
  targetId: ItemId | MilestoneId | string;
  remindAt: Timestamp; // exact UTC instant
  timeZone: string; // IANA
  message?: string | null;
  archived?: boolean;
};

export function createReminder(input: {
  targetType: ReminderTargetType;
  targetId: string;
  remindAt: Timestamp;
  timeZone: string;
  message?: string | null;
  id?: string;
}): Reminder {
  if (!isValidIanaTimeZone(input.timeZone)) {
    throw new Error(`Invalid IANA timezone: ${input.timeZone}`);
  }
  if (Number.isNaN(Date.parse(input.remindAt))) {
    throw new Error(`Invalid remindAt instant: ${input.remindAt}`);
  }
  return {
    id: input.id ?? generateId("rem"),
    targetType: input.targetType,
    targetId: input.targetId,
    remindAt: input.remindAt,
    timeZone: input.timeZone,
    message: input.message ?? null,
    archived: false
  };
}
