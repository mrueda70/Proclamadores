/**
 * Converts 24-hour time format (HH:MM) to 12-hour format with a.m./p.m.
 * @param time24 - Time in 24-hour format (e.g., "14:30")
 * @returns Time in 12-hour format (e.g., "2:30 p.m.")
 */
export function formatTimeTo12Hour(time24: string): string {
  const [hoursStr, minutes] = time24.split(':');
  const hours = parseInt(hoursStr, 10);
  
  if (isNaN(hours)) return time24;
  
  const period = hours >= 12 ? 'p.m.' : 'a.m.';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${hours12}:${minutes} ${period}`;
}
