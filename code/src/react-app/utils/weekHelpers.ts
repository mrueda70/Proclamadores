/**
 * Week boundaries for the whole app.
 *
 * The liturgical week runs from SUNDAY to SATURDAY, so Sunday is the first day.
 * Every component must use these helpers rather than computing week starts on its own:
 * the app previously had several private copies that disagreed (some Monday-based, some
 * Sunday-based), which made the week label and the masses it listed differ by one day.
 */

export const getWeekStart = (date: Date): Date => {
  const weekStart = new Date(date);
  // getDay(): 0 = Sunday ... 6 = Saturday. Rewinding by that many days lands on Sunday.
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

export const getWeekEnd = (weekStart: Date): Date => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

/**
 * Formats a Date as YYYY-MM-DD using its LOCAL calendar day.
 *
 * `toISOString()` must not be used for this: it converts to UTC first, so in Colombia
 * (UTC-5) any time from 19:00 onwards reports the following day.
 */
export const toDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isDateInWeek = (date: string, weekStart: Date): boolean => {
  const weekEnd = getWeekEnd(weekStart);

  // Plain string comparison is valid for the YYYY-MM-DD format the API returns.
  return date >= toDateString(weekStart) && date <= toDateString(weekEnd);
};

export const filterMassesByWeek = <T extends { mass_date: string }>(
  masses: T[],
  weekStart: Date
): T[] => {
  return masses.filter(mass => isDateInWeek(mass.mass_date, weekStart));
};
