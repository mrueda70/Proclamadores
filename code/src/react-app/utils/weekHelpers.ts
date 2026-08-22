export const getWeekStart = (date: Date): Date => {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  // Monday (1) should be the start of the week
  // If Sunday (0), go back 6 days to get to Monday
  // If Monday (1), stay at Monday (diff = 0)
  // If Tuesday (2), go back 1 day to Monday (diff = -1), etc.
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
};

export const getWeekEnd = (weekStart: Date): Date => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

const dateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isDateInWeek = (date: string, weekStart: Date): boolean => {
  const weekEnd = getWeekEnd(weekStart);
  
  // Convert to YYYY-MM-DD strings for comparison
  const weekStartStr = dateToString(weekStart);
  const weekEndStr = dateToString(weekEnd);
  
  // Simple string comparison works for YYYY-MM-DD format
  return date >= weekStartStr && date <= weekEndStr;
};

export const filterMassesByWeek = <T extends { mass_date: string }>(
  masses: T[],
  weekStart: Date
): T[] => {
  return masses.filter(mass => isDateInWeek(mass.mass_date, weekStart));
};
