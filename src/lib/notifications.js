import { differenceInDays, format } from "date-fns";
import { getFertileWindow } from "./cycleStats";

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
  } catch {
    // Notification may fail silently in some browsers
  }
}

/**
 * Checks whether we've already shown a particular notification type today.
 * Uses localStorage with a per-type key.
 */
function alreadySentToday(key) {
  const today = format(new Date(), "yyyy-MM-dd");
  return localStorage.getItem(key) === today;
}

function markSentToday(key) {
  const today = format(new Date(), "yyyy-MM-dd");
  localStorage.setItem(key, today);
}

/**
 * Period approaching reminder.
 * Fires when the period is within `reminder_period_before` days.
 */
function checkPeriodReminder(settings) {
  if (!settings?.notifications_enabled) return;
  if (!settings?.last_period_start) return;

  const cycleLength  = settings.average_cycle_length || 28;
  const daysSince    = differenceInDays(new Date(), new Date(settings.last_period_start));
  const daysUntilNext = cycleLength - (daysSince % cycleLength);
  const reminderDays = settings.reminder_period_before ?? 2;

  if (daysUntilNext > 0 && daysUntilNext <= reminderDays) {
    const key = "aura_notif_period";
    if (!alreadySentToday(key)) {
      showNotification(
        "Period Reminder 🩸",
        daysUntilNext === 1
          ? "Your period may start tomorrow!"
          : `Your period may start in ${daysUntilNext} days.`
      );
      markSentToday(key);
    }
  }
}

/**
 * Late period reminder — calm, non-alarmist wording.
 * Fires only once per day when period is 2+ days late.
 */
function checkLatePeriodReminder(settings, prediction) {
  if (!settings?.notifications_enabled) return;
  if (!prediction?.predicted_date) return;

  const daysLate = differenceInDays(new Date(), new Date(prediction.predicted_date));
  if (daysLate < 2) return;

  const key = "aura_notif_late_period";
  if (!alreadySentToday(key)) {
    let body;
    if (daysLate <= 5)  body = "Your period is a couple of days later than expected — small delays are normal.";
    else if (daysLate <= 10) body = "Your period is running late. Stress, sleep, or travel can cause this.";
    else body = "Your period is notably late. If this is unusual for you, consider checking in with your doctor.";

    showNotification("Period Update 💜", body);
    markSentToday(key);
  }
}

/**
 * Fertile window reminder.
 * Fires when the fertile window starts or during it (if enabled in settings).
 */
function checkFertileWindowReminder(settings) {
  if (!settings?.notifications_enabled) return;
  if (!settings?.last_period_start) return;

  const avgCycleLength = settings.average_cycle_length || 28;
  const fertile = getFertileWindow(settings.last_period_start, avgCycleLength);
  if (!fertile) return;

  // Notify 1 day before fertile window starts
  if (fertile.daysUntilStart === 1) {
    const key = "aura_notif_fertile_approaching";
    if (!alreadySentToday(key)) {
      showNotification(
        "Fertile Window Approaching 🌸",
        `Your fertile window starts tomorrow (${fertile.startFormatted} – ${fertile.endFormatted}).`
      );
      markSentToday(key);
    }
  }

  // Notify on ovulation day
  const daysUntilOvulation = differenceInDays(fertile.ovulation, new Date());
  if (daysUntilOvulation === 0) {
    const key = "aura_notif_ovulation";
    if (!alreadySentToday(key)) {
      showNotification("Estimated Ovulation Day 🌼", "Today is your estimated ovulation day.");
      markSentToday(key);
    }
  }
}

/**
 * Symptom logging reminder.
 * Fires at the configured time if the user hasn't logged symptoms today.
 */
function checkSymptomReminder(settings, recentLogs) {
  if (!settings?.reminder_symptoms_enabled) return;

  const today = format(new Date(), "yyyy-MM-dd");
  const loggedToday = recentLogs?.some((l) => l.date === today && l.symptoms?.length > 0);
  if (loggedToday) return;

  const key = "aura_notif_symptoms";
  if (!alreadySentToday(key)) {
    showNotification("Symptom Check-In 📋", "Have you logged your symptoms today? Tracking helps build a clearer picture.");
    markSentToday(key);
  }
}

/**
 * Mood logging reminder.
 * Fires at the configured time if the user hasn't logged mood today.
 */
function checkMoodReminder(settings, recentLogs) {
  if (!settings?.reminder_mood_enabled) return;

  const today = format(new Date(), "yyyy-MM-dd");
  const loggedToday = recentLogs?.some((l) => l.date === today && l.moods?.length > 0);
  if (loggedToday) return;

  const key = "aura_notif_mood";
  if (!alreadySentToday(key)) {
    showNotification("Mood Check-In 💜", "How are you feeling today? A quick mood log takes just a moment.");
    markSentToday(key);
  }
}

/**
 * Main entry point — run all notification checks.
 * Called on app load (with a 2-second delay) from App.jsx.
 * Each check is fully independent and deduplicated.
 */
export function checkAllNotifications(settings, recentLogs = [], prediction = null) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!settings?.notifications_enabled) return;

  checkPeriodReminder(settings);
  checkLatePeriodReminder(settings, prediction);
  checkFertileWindowReminder(settings);
  checkSymptomReminder(settings, recentLogs);
  checkMoodReminder(settings, recentLogs);
}

/**
 * Legacy export — kept for backward compatibility.
 * New code should use checkAllNotifications().
 */
export function checkPeriodNotification(settings) {
  checkPeriodReminder(settings);
}
