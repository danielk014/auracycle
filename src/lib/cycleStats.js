/**
 * Pure-JS cycle prediction & statistics engine.
 * No external API calls — all computation is local.
 * All inputs come from the authenticated user's own data (RLS-enforced at DB level).
 */
import { differenceInDays, parseISO, addDays, format } from "date-fns";

// ─── CYCLE GROUPING ────────────────────────────────────────────

/**
 * Groups period logs into discrete cycles.
 * Consecutive period days with ≤2-day gaps are treated as the same period.
 */
export function buildCycles(logs) {
  const periodLogs = logs
    .filter((l) => l.log_type === "period" && l.date)
    .map((l) => ({ ...l, dateObj: parseISO(l.date) }))
    .sort((a, b) => a.dateObj - b.dateObj);

  if (periodLogs.length === 0) return [];

  const groups = [];
  let current = [periodLogs[0]];

  for (let i = 1; i < periodLogs.length; i++) {
    const gap = differenceInDays(periodLogs[i].dateObj, periodLogs[i - 1].dateObj);
    if (gap <= 2) {
      current.push(periodLogs[i]);
    } else {
      groups.push(current);
      current = [periodLogs[i]];
    }
  }
  groups.push(current);

  return groups.map((group, i) => {
    const start = group[0];
    const end = group[group.length - 1];
    const periodLength = differenceInDays(end.dateObj, start.dateObj) + 1;
    const nextStart = groups[i + 1]?.[0];
    const cycleLength = nextStart
      ? differenceInDays(nextStart.dateObj, start.dateObj)
      : null;

    return {
      index: i + 1,
      start: start.date,
      end: end.date,
      startObj: start.dateObj,
      endObj: end.dateObj,
      periodLength,
      cycleLength,
      avgFlow: group.map((d) => d.flow_intensity).filter(Boolean),
      logs: group,
    };
  });
}

// ─── CYCLE STATISTICS ──────────────────────────────────────────

/**
 * Computes statistics from completed cycles (those with a known cycleLength).
 */
export function computeCycleStats(cycles) {
  const completed = cycles.filter((c) => c.cycleLength !== null);
  if (completed.length === 0) {
    return { avg: null, variance: null, stdDev: null, last3: [], min: null, max: null, count: 0 };
  }

  const lengths = completed.map((c) => c.cycleLength);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + (l - avg) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  return {
    avg: Math.round(avg * 10) / 10,
    variance: Math.round(variance * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    last3: completed.slice(-3).map((c) => c.cycleLength),
    min: Math.min(...lengths),
    max: Math.max(...lengths),
    count: completed.length,
  };
}

// ─── PREDICTION ENGINE ────────────────────────────────────────

/**
 * Predicts next period date + confidence range using pure statistics.
 * Does NOT call any external API.
 */
export function predictNextPeriod(cycles, settings) {
  const completed = cycles.filter((c) => c.cycleLength !== null);
  if (cycles.length === 0) return null;

  const stats = computeCycleStats(cycles);

  // Weighted average: recent cycles count more
  let avgLen;
  if (completed.length >= 3) {
    const recent = completed.slice(-6);
    const weights = recent.map((_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    avgLen = recent.reduce((sum, c, i) => sum + c.cycleLength * weights[i], 0) / weightSum;
  } else {
    avgLen = stats.avg || settings?.average_cycle_length || 28;
  }

  const lastPeriodStart = settings?.last_period_start || cycles[cycles.length - 1]?.start;
  if (!lastPeriodStart) return null;

  const lastStart = parseISO(lastPeriodStart);
  const predictedDate = addDays(lastStart, Math.round(avgLen));

  // Confidence range = ±stdDev (clamped to 1–7 days)
  const stdDev = stats.stdDev || 0;
  const rangeDays = Math.max(1, Math.min(7, Math.round(stdDev)));
  const rangeStart = addDays(predictedDate, -rangeDays);
  const rangeEnd = addDays(predictedDate, rangeDays);

  // Confidence level — needs at least 1 complete cycle; more data = higher confidence
  let confidence = "high";
  if (completed.length === 0 || stdDev > 5) confidence = "low";
  else if (completed.length < 3 || stdDev > 2.5) confidence = "medium";

  return {
    predicted_date: format(predictedDate, "yyyy-MM-dd"),
    range_start: format(rangeStart, "yyyy-MM-dd"),
    range_end: format(rangeEnd, "yyyy-MM-dd"),
    predicted_date_obj: predictedDate,
    range_start_obj: rangeStart,
    range_end_obj: rangeEnd,
    confidence,
    avg_cycle_length: Math.round(avgLen * 10) / 10,
    std_dev: Math.round(stdDev * 10) / 10,
    cycles_analyzed: completed.length,
  };
}

// ─── LATE PERIOD HANDLING ─────────────────────────────────────

/**
 * Returns late-period status with calm, non-panic messaging.
 * Returns null if the period is not yet late.
 */
export function getLateStatus(prediction, settings) {
  if (!prediction || !settings?.last_period_start) return null;

  const today = new Date();
  const expectedDate = parseISO(prediction.predicted_date);
  const daysLate = differenceInDays(today, expectedDate);

  if (daysLate <= 0) return null;

  let message, severity, emoji;
  if (daysLate <= 3) {
    message = "Small variations of a few days are completely normal.";
    severity = "normal";
    emoji = "🌿";
  } else if (daysLate <= 7) {
    message = "Cycles often shift due to stress, sleep changes, or travel. This is a common variation.";
    severity = "mild";
    emoji = "💛";
  } else if (daysLate <= 14) {
    message = "If you're sexually active, a home pregnancy test is a good idea. Illness and major stress can also delay cycles.";
    severity = "moderate";
    emoji = "💜";
  } else {
    message = "Cycles can occasionally be significantly delayed. Consider speaking with a healthcare provider if this is unusual for you.";
    severity = "high";
    emoji = "🩺";
  }

  return { daysLate, message, severity, emoji };
}

// ─── IRREGULARITY DETECTION ───────────────────────────────────

/**
 * Checks if recent cycles are irregular (last 3 cycles).
 * Returns null if not enough data.
 */
export function detectIrregularity(cycles) {
  const completed = cycles.filter((c) => c.cycleLength !== null);
  if (completed.length < 3) return null;

  const last3 = completed.slice(-3).map((c) => c.cycleLength);
  const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
  const variance = last3.reduce((sum, l) => sum + (l - avg) ** 2, 0) / last3.length;
  const stdDev = Math.sqrt(variance);
  const range = Math.max(...last3) - Math.min(...last3);

  const isIrregular = stdDev > 4 || range > 8;

  return {
    isIrregular,
    stdDev: Math.round(stdDev * 10) / 10,
    range,
    last3,
    message: isIrregular
      ? `Your last 3 cycles varied by ${range} days — more than the typical range.`
      : `Your last 3 cycles have a ${range}-day spread, which is within a normal range.`,
  };
}

// ─── SYMPTOM TIMING PATTERNS ──────────────────────────────────

/**
 * Computes which cycle days each symptom typically occurs.
 * Returns patterns sorted by frequency, with "cramps peak day 1-2" style insights.
 */
export function computeSymptomPatterns(logs, cycles) {
  if (cycles.length === 0) return [];

  const symptomDays = {};

  logs.forEach((log) => {
    if (!log.symptoms?.length || !log.date) return;
    const logDate = parseISO(log.date);

    // Find which cycle this log belongs to
    let matchedCycle = null;
    for (let i = 0; i < cycles.length; i++) {
      const cStart = cycles[i].startObj;
      const cNextStart = cycles[i + 1]?.startObj || null;
      if (cNextStart) {
        if (logDate >= cStart && logDate < cNextStart) {
          matchedCycle = cycles[i];
          break;
        }
      } else if (logDate >= cStart) {
        matchedCycle = cycles[i];
        break;
      }
    }

    if (!matchedCycle) return;
    const cycleDay = differenceInDays(logDate, matchedCycle.startObj) + 1;
    if (cycleDay < 1 || cycleDay > 40) return;

    log.symptoms.forEach((symptom) => {
      if (!symptomDays[symptom]) symptomDays[symptom] = [];
      symptomDays[symptom].push(cycleDay);
    });
  });

  return Object.entries(symptomDays)
    .filter(([, days]) => days.length >= 2)
    .map(([symptom, days]) => {
      const avg = days.reduce((a, b) => a + b, 0) / days.length;
      const sorted = [...days].sort((a, b) => a - b);
      // Typical range: days within 2 of the average
      const typical = days.filter((d) => Math.abs(d - avg) <= 2);
      const typMin = typical.length > 0 ? Math.min(...typical) : Math.round(avg);
      const typMax = typical.length > 0 ? Math.max(...typical) : Math.round(avg);
      const typicalRange = typMin === typMax ? `day ${typMin}` : `days ${typMin}–${typMax}`;

      return {
        symptom: symptom.replace(/_/g, " "),
        rawSymptom: symptom,
        avgDay: Math.round(avg),
        typicalRange,
        count: days.length,
        allDays: days,
        // Spread of days (how clustered the symptom is)
        spread: Math.max(...days) - Math.min(...days),
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── FERTILE WINDOW ───────────────────────────────────────────

/**
 * Computes the fertile window based on last period start and average cycle length.
 */
export function getFertileWindow(lastPeriodStart, avgCycleLength) {
  if (!lastPeriodStart) return null;
  const start = parseISO(lastPeriodStart);
  const ovulationDayOffset = Math.round(avgCycleLength / 2) - 2;
  const ovulation = addDays(start, ovulationDayOffset);
  const fertileStart = addDays(ovulation, -2);
  const fertileEnd = addDays(ovulation, 2);
  const today = new Date();

  return {
    start: fertileStart,
    end: fertileEnd,
    ovulation,
    startFormatted: format(fertileStart, "MMM d"),
    endFormatted: format(fertileEnd, "MMM d"),
    ovulationFormatted: format(ovulation, "MMM d"),
    isActive: today >= fertileStart && today <= fertileEnd,
    daysUntilStart: differenceInDays(fertileStart, today),
    daysUntilEnd: differenceInDays(fertileEnd, today),
  };
}
