import { useEffect, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import type { Reminder } from "@gph/core";
import { InlineAlert } from "../components";

type ReminderPanelProps = {
  onCreateReminder: (input: {
    message: string | null;
    remindAt: string;
    timeZone: string;
  }) => void;
  onDeleteReminder: (reminderId: string) => void;
  onUpdateReminder: (
    reminderId: string,
    patch: { message: string | null; remindAt: string; timeZone: string }
  ) => void;
  reminders: Reminder[];
};

export function ReminderPanel({
  onCreateReminder,
  onDeleteReminder,
  onUpdateReminder,
  reminders
}: ReminderPanelProps) {
  const [draftTime, setDraftTime] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const timeZone = currentTimeZone();

  const createReminder = () => {
    if (!draftTime) {
      setError("Choose a reminder time.");
      return;
    }
    const remindAt = datetimeLocalToIso(draftTime);
    if (!remindAt) {
      setError("Choose a valid reminder time.");
      return;
    }
    onCreateReminder({
      remindAt,
      timeZone,
      message: draftMessage.trim() || null
    });
    setDraftTime("");
    setDraftMessage("");
    setError(null);
  };

  return (
    <div className="reminder-panel">
      <div className="reminder-create">
        <label className="label">
          Reminder time
          <input
            aria-label="Reminder time"
            className="input"
            onChange={(event) => setDraftTime(event.target.value)}
            type="datetime-local"
            value={draftTime}
          />
        </label>
        <label className="label">
          Reminder message
          <input
            aria-label="Reminder message"
            className="input"
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder="Optional reminder note"
            value={draftMessage}
          />
        </label>
        <button className="btn btn-sm" onClick={createReminder} type="button">
          <Bell aria-hidden="true" size={14} />
          Add reminder
        </button>
      </div>
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      {reminders.length === 0 ? (
        <div className="text-muted text-sm">No reminders</div>
      ) : (
        <div className="reminder-list">
          {reminders.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              onDelete={() => onDeleteReminder(reminder.id)}
              onUpdate={(patch) => onUpdateReminder(reminder.id, patch)}
              reminder={reminder}
              timeZone={timeZone}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderRow({
  onDelete,
  onUpdate,
  reminder,
  timeZone
}: {
  onDelete: () => void;
  onUpdate: (patch: { message: string | null; remindAt: string; timeZone: string }) => void;
  reminder: Reminder;
  timeZone: string;
}) {
  const label = reminderLabel(reminder);
  const [time, setTime] = useState(isoToDatetimeLocal(reminder.remindAt));
  const [message, setMessage] = useState(reminder.message ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTime(isoToDatetimeLocal(reminder.remindAt));
    setMessage(reminder.message ?? "");
    setError(null);
  }, [reminder.id, reminder.message, reminder.remindAt]);

  const save = () => {
    const remindAt = datetimeLocalToIso(time);
    if (!remindAt) {
      setError("Choose a valid reminder time.");
      return;
    }
    onUpdate({ remindAt, timeZone, message: message.trim() || null });
    setError(null);
  };

  return (
    <div className="reminder-card">
      <div className="reminder-card-header">
        <div>
          <div className="text-sm">{reminder.message || "Reminder"}</div>
          <div className="text-xs text-muted">{formatReminderDateTime(reminder.remindAt)}</div>
        </div>
        <button
          aria-label={`Delete reminder ${label}`}
          className="btn btn-ghost btn-sm"
          onClick={onDelete}
          type="button"
        >
          <Trash2 aria-hidden="true" size={14} />
          Delete
        </button>
      </div>
      <div className="reminder-edit-grid">
        <label className="label">
          Time
          <input
            aria-label={`Reminder time for ${label}`}
            className="input"
            onChange={(event) => setTime(event.target.value)}
            type="datetime-local"
            value={time}
          />
        </label>
        <label className="label">
          Message
          <input
            aria-label={`Reminder message for ${label}`}
            className="input"
            onChange={(event) => setMessage(event.target.value)}
            value={message}
          />
        </label>
        <button
          aria-label={`Save reminder ${label}`}
          className="btn btn-sm"
          onClick={save}
          type="button"
        >
          Save
        </button>
      </div>
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
    </div>
  );
}

export function formatReminderDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid reminder time";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function datetimeLocalToIso(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isoToDatetimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function reminderLabel(reminder: Reminder): string {
  return reminder.message?.trim() || formatReminderDateTime(reminder.remindAt);
}
