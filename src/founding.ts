/** Calendar and anniversary calculations always use the restaurant's timezone. */
export function getJapanDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => Number(parts.find(p => p.type === type)!.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}

export function isFoundingDate(value: unknown, year: number) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return y === year && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function getFoundingInfo(foundedYear = 1979, foundedDate: string | null = null, now = new Date()) {
  const today = getJapanDate(now);
  let years = today.year - foundedYear;
  const exact = isFoundingDate(foundedDate, foundedYear);
  if (exact) {
    const [, month, day] = foundedDate!.split('-').map(Number);
    if (today.month < month || (today.month === month && today.day < day)) years--;
  }
  years = Math.max(0, years);
  return { year: foundedYear, years, exact, label: exact ? `創業${years}周年。` : `今年で${years}年。` };
}
