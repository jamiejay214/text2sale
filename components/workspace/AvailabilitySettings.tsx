"use client";
import { useState } from "react";
import {
  DEFAULT_AVAILABLE_HOURS,
  type AvailableHours,
} from "@/lib/availability";
import { updateProfile } from "@/lib/supabase-data";
import type { WorkspaceViewProps } from "./WorkspaceApp";
const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
export default function AvailabilitySettings({
  profile,
  onProfile,
}: Pick<WorkspaceViewProps, "profile" | "onProfile">) {
  const [hours, setHours] = useState<AvailableHours>(
    () =>
      ({
        ...DEFAULT_AVAILABLE_HOURS,
        ...profile.available_hours,
      }) as AvailableHours,
  );
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: hours.timezone }).format();
    } catch {
      setNotice("Choose a valid timezone, for example America/New_York.");
      return;
    }
    if (
      !Number.isFinite(hours.slotDuration) ||
      hours.slotDuration < 5 ||
      hours.slotDuration > 240 ||
      !Number.isFinite(hours.bufferMinutes) ||
      hours.bufferMinutes < 0 ||
      hours.bufferMinutes > 120 ||
      !Number.isFinite(hours.maxDaysOut) ||
      hours.maxDaysOut < 1 ||
      hours.maxDaysOut > 90
    ) {
      setNotice(
        "Choose 5–240 minute appointments, 0–120 minute buffers and a 1–90 day booking window.",
      );
      return;
    }
    if (
      Object.values(hours.slots).some(
        (s) => s.enabled && (!s.start || !s.end || s.start >= s.end),
      )
    ) {
      setNotice("Each enabled day needs an end time after its start time.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile(profile.id, {
        available_hours: hours as unknown as Record<string, unknown>,
      });
      if (!result) throw Error();
      onProfile(result);
      setNotice("Availability saved for AI texting, calling and appointments.");
    } catch {
      setNotice("Could not save availability. Please retry.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="v2-panel">
      <div className="v2-panel-head">
        <div>
          <h2>Appointment availability</h2>
          <p>
            Times below use your business timezone. Enable at least one day for
            AI booking.
          </p>
        </div>
      </div>
      <div className="v2-modal-form">
        <label>
          <input
            type="checkbox"
            checked={hours.enabled}
            onChange={(e) => setHours({ ...hours, enabled: e.target.checked })}
          />{" "}
          Accept appointments
        </label>
        <label>
          Business timezone
          <select
            value={hours.timezone}
            onChange={(e) => setHours({ ...hours, timezone: e.target.value })}
          >
            {Array.from(
              new Set([
                hours.timezone,
                "America/New_York",
                "America/Chicago",
                "America/Denver",
                "America/Phoenix",
                "America/Los_Angeles",
                "America/Anchorage",
                "Pacific/Honolulu",
              ]),
            ).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="v2-form-grid">
          {(
            [
              ["slotDuration", "Appointment minutes"],
              ["bufferMinutes", "Buffer minutes"],
              ["maxDaysOut", "Booking window (days)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                value={hours[key]}
                min={key === "bufferMinutes" ? 0 : 1}
                onChange={(e) =>
                  setHours({ ...hours, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        {days.map((day) => {
          const slot = hours.slots[day] || {
            enabled: false,
            start: "09:00",
            end: "17:00",
          };
          const patch = (change: Partial<typeof slot>) =>
            setHours({
              ...hours,
              slots: { ...hours.slots, [day]: { ...slot, ...change } },
            });
          return (
            <div className="v2-form-grid" key={day}>
              <label>
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={(e) => patch({ enabled: e.target.checked })}
                />
                {day}
              </label>
              <input
                aria-label={`${day} start`}
                type="time"
                value={slot.start}
                onChange={(e) => patch({ start: e.target.value })}
              />
              <input
                aria-label={`${day} end`}
                type="time"
                value={slot.end}
                onChange={(e) => patch({ end: e.target.value })}
              />
            </div>
          );
        })}
        <p role="status">{notice}</p>
        <button
          className="v2-btn v2-btn-primary"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save availability"}
        </button>
      </div>
    </section>
  );
}
