// ============================================================
// UTIL — Medication Reminder Time Parser
// Parses natural-language frequency strings into reminder times
// ============================================================
'use strict';

/**
 * Parses a medication frequency string into an array of 24h reminder times.
 *
 * Examples:
 *   "Once daily"                → ['09:00']
 *   "Twice daily after meals"   → ['09:00', '20:00']
 *   "Three times daily"         → ['08:00', '14:00', '20:00']
 *   "Every 8 hours"             → ['08:00', '16:00', '00:00']
 *   "Once at bedtime"           → ['21:00']
 *   "Before breakfast"          → ['07:30']
 *
 * @param {string} frequency  Natural language frequency
 * @returns {string[]}        Array of HH:MM strings
 */
const parseReminderTimes = (frequency) => {
  if (!frequency || typeof frequency !== 'string') return ['09:00'];

  const f = frequency.toLowerCase().trim();

  // Bedtime
  if (f.includes('bedtime') || f.includes('night') || f.includes('at night')) {
    return ['21:00'];
  }

  // Before breakfast
  if (f.includes('before breakfast') || f.includes('empty stomach')) {
    return ['07:30'];
  }

  // Every N hours
  const everyHoursMatch = f.match(/every\s+(\d+)\s+hour/);
  if (everyHoursMatch) {
    const hours = parseInt(everyHoursMatch[1], 10);
    const times = [];
    let current = 8 * 60; // start at 08:00
    const totalMinutes = 24 * 60;
    const stepMinutes = hours * 60;
    for (let i = 0; i < Math.floor(totalMinutes / stepMinutes); i++) {
      const h = Math.floor((current % totalMinutes) / 60);
      const m = (current % totalMinutes) % 60;
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      current += stepMinutes;
    }
    return times;
  }

  // Four times daily
  if (f.includes('four times') || f.includes('4 times') || f.includes('qid')) {
    return ['08:00', '12:00', '16:00', '20:00'];
  }

  // Three times daily
  if (f.includes('three times') || f.includes('3 times') || f.includes('tid') || f.includes('thrice')) {
    return ['08:00', '14:00', '20:00'];
  }

  // Twice daily
  if (
    f.includes('twice') ||
    f.includes('two times') ||
    f.includes('2 times') ||
    f.includes('bid') ||
    f.includes('twice a day')
  ) {
    return ['09:00', '20:00'];
  }

  // Once daily (various phrasings)
  if (
    f.includes('once') ||
    f.includes('daily') ||
    f.includes('od') ||
    f.includes('one time')
  ) {
    if (f.includes('morning') || f.includes('breakfast')) return ['09:00'];
    if (f.includes('afternoon') || f.includes('lunch')) return ['13:00'];
    if (f.includes('evening') || f.includes('dinner')) return ['19:00'];
    return ['09:00'];
  }

  // Weekly
  if (f.includes('weekly') || f.includes('once a week')) {
    return ['09:00']; // Just one time, cron handles the weekly schedule
  }

  // Default fallback
  return ['09:00'];
};

/**
 * Format a time string for display
 * @param {string} time  HH:MM format
 * @returns {string}     12-hour display format e.g. '9:00 AM'
 */
const formatTime12h = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

module.exports = { parseReminderTimes, formatTime12h };
