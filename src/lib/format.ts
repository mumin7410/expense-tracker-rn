/**
 * Thai date and amount formatting.
 *
 * Hand-rolled rather than `Intl`: Hermes ships only a partial ICU on Android,
 * and the Buddhist calendar is exactly the part that is unreliable there. Slips
 * are always Thai, so there is no locale to negotiate.
 */

const MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/** Gregorian year to Buddhist Era, the only year Thai slips print. */
const toBE = (year: number) => year + 543;

const pad = (n: number) => String(n).padStart(2, '0');

/** `฿4,621.88` — always two decimals, so column edges line up. */
export function baht(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) return '฿—';
  const [whole, fraction] = value.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `฿${grouped}.${fraction}`;
}

/** `สิงหาคม 2569` — the month heading on the home screen and the widget. */
export function monthYear(date: Date): string {
  return `${MONTHS_FULL[date.getMonth()]} ${toBE(date.getFullYear())}`;
}

/** `22 ส.ค. 10:07` — for transaction rows, where the year is implied. */
export function shortDateTime(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `17 ส.ค. 2569, 05:55` — for the review screen, where the year matters. */
export function fullDateTime(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${toBE(date.getFullYear())}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
