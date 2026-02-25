import { differenceInDays, format } from "date-fns";

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showNotification(title, body, icon = "/favicon.ico") {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon });
  } catch (e) {
    // Notification may fail silently in some browsers
  }
}

/**
 * Checks if the period is approaching and shows a browser notification.
 * Respects user settings and de-duplicates (one notification per day).
 */
export function checkPeriodNotification(settings) {
  if (!settings?.notifications_enabled) return;
  if (!settings?.last_period_start) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const cycleLength = settings.average_cycle_length || 28;
  const daysSince = differenceInDays(new Date(), new Date(settings.last_period_start));
  const daysUntilNext = cycleLength - (daysSince % cycleLength);
  const reminderDays = settings.reminder_period_before ?? 2;

  if (daysUntilNext > 0 && daysUntilNext <= reminderDays) {
    const today = format(new Date(), "yyyy-MM-dd");
    const lastKey = "aura_last_period_notif";
    if (localStorage.getItem(lastKey) !== today) {
      showNotification(
        "Period Reminder 🩸",
        daysUntilNext === 1
          ? "Your period may start tomorrow!"
          : `Your period may start in ${daysUntilNext} days.`
      );
      localStorage.setItem(lastKey, today);
    }
  }
}
